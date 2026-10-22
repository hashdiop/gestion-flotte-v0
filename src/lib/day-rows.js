import { coveringDay, dayKey, todayUTC } from './dates';
import { missingStatus, paymentStatus } from './payments';
import { VEHICLE_STATUS } from './vehicle-status';
import { loadStatusResolver, NOT_DUE_STATUSES } from './vehicle-status-history';
import Assignment from '@/models/Assignment';
import DayClosure from '@/models/DayClosure';
import Payment from '@/models/Payment';
import PaymentAdjustment from '@/models/PaymentAdjustment';
import PaymentLog from '@/models/PaymentLog';

const plainSnap = (s) => s && { expected: s.expected, paid: s.paid, method: s.method ?? null, note: s.note ?? '' };

// Lignes de versement d'une journée. Utilisé par la vue du jour, la clôture et le tableau de bord.
//  - journée ouverte : une ligne par chauffeur qui avait un véhicule ce jour-là, avec sa saisie éventuelle ;
//  - journée clôturée : les versements figés par la clôture, plus les écritures correctrices.
export async function getDayRows(day) {
  const isToday = dayKey(day) === dayKey(todayUTC());
  const [closure, payments, adjustments, logs] = await Promise.all([
    DayClosure.findOne({ date: day }).lean(),
    Payment.find({ date: day }).populate('driver', 'firstName lastName').populate('vehicle', 'plate dailyRate status').lean(),
    PaymentAdjustment.find({ targetDate: day }).sort({ createdAt: 1 }).lean(),
    PaymentLog.find({ date: day }).sort({ createdAt: 1 }).lean(),
  ]);
  const byDriver = new Map(payments.map((p) => [String(p.driver._id), p]));
  const adjOf = (driverId) =>
    adjustments
      .filter((a) => String(a.driver) === driverId)
      .map((a) => ({
        id: String(a._id),
        kind: a.kind,
        deltaExpected: a.deltaExpected,
        deltaPaid: a.deltaPaid,
        method: a.method,
        reason: a.reason,
        by: a.by,
        entryDate: dayKey(a.entryDate),
        at: a.createdAt.toISOString(),
      }));
  const logsOf = (driverId) =>
    logs
      .filter((l) => String(l.driver) === driverId)
      .map((l) => ({ id: String(l._id), action: l.action, before: plainSnap(l.before), after: plainSnap(l.after), reason: l.reason ?? '', by: l.by, at: l.createdAt.toISOString() }));

  let base; // [{ key, driver, vehicle, payment, autoNotDue, hint }]
  if (closure) {
    base = payments.map((p) => ({ key: String(p._id), driver: p.driver, vehicle: p.vehicle, payment: p, autoNotDue: false, hint: null }));
  } else {
    const assignments = await Assignment.find(coveringDay(day))
      .populate('driver', 'firstName lastName')
      .populate('vehicle', 'plate dailyRate status')
      .lean();
    const statusOn = await loadStatusResolver(assignments.map((a) => a.vehicle._id));
    base = assignments.map((a) => {
      const p = byDriver.get(String(a.driver._id));
      // Véhicule en atelier ou immobilisé ce jour-là : non dû d'office, sauf saisie contraire du gestionnaire
      const vehicleStatus = statusOn(a.vehicle._id, day);
      const autoNotDue = !p && NOT_DUE_STATUSES.has(vehicleStatus);
      const label = VEHICLE_STATUS[vehicleStatus].label.toLowerCase();
      return {
        key: String(a._id),
        driver: a.driver,
        vehicle: a.vehicle,
        payment: p,
        autoNotDue,
        autoLabel: label,
        hint: autoNotDue ? `Véhicule ${label} ce jour-là : journée non due automatiquement` : null,
      };
    });
  }

  const rows = base
    .map((b) => {
      const driverId = String(b.driver._id);
      const p = b.payment;
      const payment = p && plainSnap(p);
      const adjs = adjOf(driverId);
      // Valeurs effectives : saisie (ou figée par la clôture) + écritures correctrices
      const expected = (payment ? payment.expected : b.autoNotDue ? 0 : b.vehicle.dailyRate) + adjs.reduce((s, a) => s + a.deltaExpected, 0);
      const paid = (payment?.paid ?? 0) + adjs.reduce((s, a) => s + a.deltaPaid, 0);
      let status;
      if (payment || closure) status = paymentStatus({ expected, paid });
      else if (b.autoNotDue) status = { label: `Non dû · ${b.autoLabel}`, tone: 'neu' };
      else status = missingStatus(isToday);
      return {
        key: b.key,
        driverId,
        driverName: `${b.driver.firstName} ${b.driver.lastName}`,
        vehicleId: String(b.vehicle._id),
        plate: b.vehicle.plate,
        rate: b.vehicle.dailyRate,
        expected,
        paid,
        payment,
        autoNotDue: b.autoNotDue,
        status,
        hint: b.hint,
        adjustments: adjs,
        logs: logsOf(driverId),
      };
    })
    .sort((a, b) => a.plate.localeCompare(b.plate));

  return {
    rows,
    closure,
    expected: rows.reduce((s, r) => s + r.expected, 0),
    paid: rows.reduce((s, r) => s + r.paid, 0),
    missing: closure ? 0 : rows.filter((r) => !r.payment && !r.autoNotDue).length,
  };
}
