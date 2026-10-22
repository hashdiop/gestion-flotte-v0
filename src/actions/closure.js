'use server';

import mongoose from 'mongoose';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { str, int } from '@/lib/form';
import { dayKey, parseDay, todayUTC } from '@/lib/dates';
import { formatDate, formatNumber } from '@/lib/format';
import { cashExpectedFor, getClosureState, isLocked } from '@/lib/closure';
import { getDayRows } from '@/lib/day-rows';
import { paymentStatus } from '@/lib/payments';
import { PAYMENT_METHODS } from '@/lib/payment-methods';
import DayClosure from '@/models/DayClosure';
import Payment from '@/models/Payment';
import PaymentAdjustment from '@/models/PaymentAdjustment';
import PaymentLog from '@/models/PaymentLog';

const isNum = (n) => n !== null && !Number.isNaN(n);

// Clôture la prochaine journée à clôturer :
//  1. les lignes non saisies deviennent « Non versé » (constaté à la clôture) ;
//  2. les journées non dues d'office (véhicule en atelier, immobilisé) sont figées « Non dû » ;
//  3. la journée est figée : plus de modification, seulement des écritures correctrices ;
//  4. le rapport de clôture (totaux, lignes, caisse) est enregistré tel quel.
export async function closeDay(prevState, formData) {
  const session = await requireSession('closeDay');
  const day = parseDay(str(formData, 'date'));
  const counted = int(formData, 'cashCounted');
  const note = str(formData, 'note');

  await connectDB();
  const state = await getClosureState();
  if (!day || !state.nextToClose || dayKey(day) !== dayKey(state.nextToClose)) {
    return {
      error: state.nextToClose
        ? `La prochaine journée à clôturer est le ${formatDate(state.nextToClose)}.`
        : 'Aucune journée à clôturer : on ne clôture pas une journée qui n’a pas commencé.',
    };
  }
  if (!isNum(counted) || counted < 0) return { error: 'Indique les espèces comptées en caisse (0 si aucune).' };

  // 1 et 2 : on fige chaque ligne sans saisie
  const { rows } = await getDayRows(day);
  for (const r of rows) {
    if (r.payment) continue;
    const after = r.autoNotDue
      ? { expected: 0, paid: 0, method: null, note: `${r.hint.split(' :')[0]} : non dû (clôture)` }
      : { expected: r.rate, paid: 0, method: null, note: 'Constaté à la clôture' };
    if (!Number.isFinite(after.expected)) return { error: `Tarif introuvable pour ${r.plate} : clôture annulée.` };
    // $setOnInsert : si une saisie arrive au même moment, elle n'est pas écrasée
    const res = await Payment.updateOne(
      { driver: r.driverId, date: day },
      { $setOnInsert: { vehicle: r.vehicleId, ...after } },
      { upsert: true, runValidators: true }
    );
    if (res.upsertedCount) {
      await PaymentLog.create({ date: day, driver: r.driverId, vehicle: r.vehicleId, action: 'cloture', after, by: session.name });
    }
  }

  // 3 et 4 : rapport figé à partir des versements de la journée
  const payments = await Payment.find({ date: day }).populate('driver', 'firstName lastName').populate('vehicle', 'plate').lean();
  const lines = payments
    .map((p) => ({
      driver: p.driver._id,
      driverName: `${p.driver.firstName} ${p.driver.lastName}`,
      vehicle: p.vehicle._id,
      plate: p.vehicle.plate,
      expected: p.expected,
      paid: p.paid,
      method: p.method,
      status: paymentStatus(p).label,
      note: p.note,
      convertedAtClosure: p.note === 'Constaté à la clôture' && p.paid === 0 && p.expected > 0,
    }))
    .sort((a, b) => a.plate.localeCompare(b.plate));
  const sumBy = (m) => payments.filter((p) => p.method === m).reduce((s, p) => s + p.paid, 0);
  const cashExpected = await cashExpectedFor(day);

  try {
    await DayClosure.create({
      date: day,
      closedAt: new Date(),
      closedBy: session.name,
      expected: payments.reduce((s, p) => s + p.expected, 0),
      paid: payments.reduce((s, p) => s + p.paid, 0),
      missingCount: payments.filter((p) => p.expected > 0 && p.paid === 0).length,
      convertedCount: lines.filter((l) => l.convertedAtClosure).length,
      byMethod: { especes: sumBy('especes'), mobile_money: sumBy('mobile_money') },
      cashExpected,
      cashCounted: counted,
      note,
      lines,
    });
  } catch (err) {
    if (err?.code === 11000) return { error: 'Cette journée vient d’être clôturée.' };
    throw err;
  }

  revalidatePath('/', 'layout');
  redirect(`/versements/cloture/${dayKey(day)}`);
}

// Écriture correctrice sur une journée clôturée, avec motif obligatoire.
//   kind = 'remboursement' : le chauffeur rembourse (montant, mode) un manque de cette journée
//   kind = 'correction'    : on rectifie l'attendu et/ou le versé de cette journée
export async function addAdjustment(prevState, formData) {
  const session = await requireSession('adjustClosed');
  const kind = str(formData, 'kind');
  const day = parseDay(str(formData, 'date'));
  const driverId = str(formData, 'driverId');
  const reason = str(formData, 'reason');

  if (!['remboursement', 'correction'].includes(kind)) return { error: 'Type d’écriture inconnu.' };
  if (!day || !mongoose.isValidObjectId(driverId)) return { error: 'Ligne invalide.' };
  if (!reason) return { error: 'Le motif est obligatoire.' };

  await connectDB();
  const state = await getClosureState();
  if (!isLocked(state, day)) return { error: 'Cette journée n’est pas clôturée : modifie directement la saisie.' };
  const payment = await Payment.findOne({ driver: driverId, date: day }).lean();
  if (!payment) return { error: 'Aucun versement figé pour ce chauffeur ce jour-là.' };
  const previous = await PaymentAdjustment.find({ driver: driverId, targetDate: day }).lean();
  const current = {
    expected: payment.expected + previous.reduce((s, a) => s + a.deltaExpected, 0),
    paid: payment.paid + previous.reduce((s, a) => s + a.deltaPaid, 0),
  };

  const today = todayUTC();
  const entry = { kind, targetDate: day, entryDate: today, driver: driverId, vehicle: payment.vehicle, reason, by: session.name };
  if (kind === 'remboursement') {
    const amount = int(formData, 'amount');
    const method = str(formData, 'method');
    const remaining = current.expected - current.paid;
    // L'argent entre dans la caisse d'aujourd'hui : elle doit être ouverte
    if (isLocked(state, today)) return { error: 'La journée d’aujourd’hui est clôturée : le remboursement se saisira demain.' };
    if (remaining <= 0) return { error: 'Il ne reste rien à rembourser sur cette journée.' };
    if (!isNum(amount) || amount <= 0) return { error: 'Montant remboursé invalide.' };
    if (amount > remaining) return { error: `Le remboursement dépasse le reste dû (${formatNumber(remaining)}).` };
    if (!PAYMENT_METHODS[method]) return { error: 'Choisis le mode de paiement.' };
    Object.assign(entry, { deltaPaid: amount, method });
  } else {
    const newExpected = int(formData, 'expected');
    const newPaid = int(formData, 'paid');
    if (!isNum(newExpected) || newExpected < 0 || !isNum(newPaid) || newPaid < 0) return { error: 'Montants corrigés invalides.' };
    if (newExpected === current.expected && newPaid === current.paid) return { error: 'Aucun changement par rapport aux montants actuels.' };
    Object.assign(entry, { deltaExpected: newExpected - current.expected, deltaPaid: newPaid - current.paid });
  }

  await PaymentAdjustment.create(entry);
  await PaymentLog.create({
    date: day,
    driver: driverId,
    vehicle: payment.vehicle,
    action: kind,
    before: current,
    after: { expected: current.expected + (entry.deltaExpected ?? 0), paid: current.paid + (entry.deltaPaid ?? 0), method: entry.method ?? null },
    reason,
    by: session.name,
  });

  revalidatePath('/', 'layout');
  return { ok: true, ts: Date.now() };
}
