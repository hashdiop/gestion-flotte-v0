'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { str, int } from '@/lib/form';
import { coveringDay, isSunday, parseDay, todayUTC } from '@/lib/dates';
import { PAYMENT_METHODS } from '@/lib/payment-methods';
import Assignment from '@/models/Assignment';
import Payment from '@/models/Payment';
import Vehicle from '@/models/Vehicle';

// Enregistre (ou corrige) le versement d'un chauffeur pour une journée.
// mode : 'paid' (montant versé), 'unpaid' (rien versé), 'notdue' (journée non due)
export async function recordPayment(prevState, formData) {
  await requireSession();
  const day = parseDay(str(formData, 'date'));
  const driverId = str(formData, 'driverId');
  const vehicleId = str(formData, 'vehicleId');
  const mode = str(formData, 'mode');
  const amount = int(formData, 'amount');
  const method = str(formData, 'method');
  const note = str(formData, 'note');

  if (!day) return { error: 'Date invalide.' };
  if (day > todayUTC()) return { error: 'Impossible d’encaisser une journée future.' };
  if (isSunday(day)) return { error: 'Le dimanche est un jour de repos : rien n’est dû.' };
  if (!mongoose.isValidObjectId(driverId) || !mongoose.isValidObjectId(vehicleId)) return { error: 'Ligne invalide.' };
  if (!['paid', 'unpaid', 'notdue'].includes(mode)) return { error: 'Action inconnue.' };
  if (mode === 'paid') {
    if (amount === null || Number.isNaN(amount) || amount <= 0) return { error: 'Montant versé invalide.' };
    if (!PAYMENT_METHODS[method]) return { error: 'Choisis le mode de paiement.' };
  }
  if (mode === 'notdue' && !note) return { error: 'Indique pourquoi la journée n’est pas due.' };

  await connectDB();
  const [assignment, vehicle, existing] = await Promise.all([
    Assignment.findOne({ driver: driverId, vehicle: vehicleId, ...coveringDay(day) }).lean(),
    Vehicle.findById(vehicleId).lean(),
    Payment.findOne({ driver: driverId, date: day }).lean(),
  ]);
  if (!assignment || !vehicle) return { error: 'Ce chauffeur n’avait pas ce véhicule ce jour-là.' };

  // Le montant attendu est figé à la première saisie : un changement de tarif ne réécrit pas le passé
  const expected = mode === 'notdue' ? 0 : existing?.expected || vehicle.dailyRate;

  await Payment.updateOne(
    { driver: driverId, date: day },
    {
      $set: {
        vehicle: vehicleId,
        expected,
        paid: mode === 'paid' ? amount : 0,
        method: mode === 'paid' ? method : null,
        note,
      },
    },
    { upsert: true, runValidators: true }
  );

  revalidatePath('/versements');
  revalidatePath(`/chauffeurs/${driverId}`);
  return { ok: true, ts: Date.now() };
}
