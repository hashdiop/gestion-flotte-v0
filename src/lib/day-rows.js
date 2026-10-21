import { coveringDay, dayKey, todayUTC } from './dates';
import { missingStatus, paymentStatus } from './payments';
import { VEHICLE_STATUS } from './vehicle-status';
import Assignment from '@/models/Assignment';
import Payment from '@/models/Payment';

// Lignes de versement d'une journée : une par chauffeur qui avait un véhicule ce jour-là,
// avec sa saisie éventuelle. Utilisé par la vue du jour et par le tableau de bord.
export async function getDayRows(day) {
  const isToday = dayKey(day) === dayKey(todayUTC());
  const [assignments, payments] = await Promise.all([
    Assignment.find(coveringDay(day))
      .populate('driver', 'firstName lastName')
      .populate('vehicle', 'plate brand model dailyRate status')
      .lean(),
    Payment.find({ date: day }).lean(),
  ]);
  const byDriver = new Map(payments.map((p) => [String(p.driver), p]));

  const rows = assignments
    .map((a) => {
      const p = byDriver.get(String(a.driver._id));
      const payment = p && { expected: p.expected, paid: p.paid, method: p.method, note: p.note };
      return {
        key: String(a._id),
        driverId: String(a.driver._id),
        driverName: `${a.driver.firstName} ${a.driver.lastName}`,
        vehicleId: String(a.vehicle._id),
        plate: a.vehicle.plate,
        expected: payment ? payment.expected : a.vehicle.dailyRate,
        payment,
        status: payment ? paymentStatus(payment) : missingStatus(isToday),
        // Indice pour le gestionnaire : un véhicule qui n'est pas en service ne rapporte en général rien
        hint: !payment && a.vehicle.status !== 'en_service' ? `Véhicule ${VEHICLE_STATUS[a.vehicle.status].label.toLowerCase()}` : null,
      };
    })
    .sort((a, b) => a.plate.localeCompare(b.plate));

  return {
    rows,
    expected: rows.reduce((s, r) => s + r.expected, 0),
    paid: rows.reduce((s, r) => s + (r.payment?.paid ?? 0), 0),
    missing: rows.filter((r) => !r.payment).length,
  };
}
