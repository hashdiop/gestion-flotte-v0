import Link from 'next/link';
import { CalendarCheck, ChevronLeft, ChevronRight, CircleDashed, CircleMinus, Coffee } from 'lucide-react';
import { addDays, dayKey, formatShortDay, isSunday, todayUTC } from '@/lib/dates';
import { formatDate, formatNumber } from '@/lib/format';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';
import { loadStatusResolver, NOT_DUE_STATUSES } from '@/lib/vehicle-status-history';
import Assignment from '@/models/Assignment';
import Payment from '@/models/Payment';
import PaymentAdjustment from '@/models/PaymentAdjustment';

// Contenu et couleur d'une case de la grille
// vehicleStatus : statut du véhicule ce jour-là (en atelier ou immobilisé = non dû d'office)
const CELL_ICONS = { neu: CircleMinus, missing: CircleDashed, sun: Coffee };

function cell(covered, future, p, vehicleStatus) {
  if (!covered || future) return { text: '', tone: 'blank', title: covered ? 'À venir' : 'Pas affecté' };
  if (!p && NOT_DUE_STATUSES.has(vehicleStatus)) {
    return { text: 'ND', tone: 'neu', title: `Non dû : véhicule ${VEHICLE_STATUS[vehicleStatus].label.toLowerCase()}` };
  }
  if (!p) return { text: '·', tone: 'missing', title: 'Non saisi' };
  if (p.expected === 0) return { text: 'ND', tone: 'neu', title: `Non dû${p.note ? ` : ${p.note}` : ''}` };
  if (p.paid === 0) return { text: '0', tone: 'bad', title: 'Non versé' };
  if (p.paid < p.expected) return { text: formatNumber(p.paid), tone: 'warn', title: `Partiel : ${formatNumber(p.paid)} sur ${formatNumber(p.expected)}` };
  return { text: formatNumber(p.paid), tone: 'ok', title: 'Payé' };
}

export default async function WeekView({ monday }) {
  const today = todayUTC();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const end = addDays(monday, 7);

  const [assignments, rawPayments, adjustments] = await Promise.all([
    Assignment.find({ startDate: { $lt: end }, $or: [{ endDate: null }, { endDate: { $gt: monday } }] })
      .populate('driver', 'firstName lastName')
      .populate('vehicle', 'plate')
      .lean(),
    Payment.find({ date: { $gte: monday, $lt: end } }).lean(),
    PaymentAdjustment.find({ targetDate: { $gte: monday, $lt: end } }).lean(),
  ]);
  // Valeurs effectives : saisie + écritures correctrices passées après la clôture
  const payments = rawPayments.map((p) => {
    const adj = adjustments.filter((a) => String(a.driver) === String(p.driver) && dayKey(a.targetDate) === dayKey(p.date));
    return adj.length
      ? { ...p, expected: p.expected + adj.reduce((s, a) => s + a.deltaExpected, 0), paid: p.paid + adj.reduce((s, a) => s + a.deltaPaid, 0) }
      : p;
  });
  const paymentOf = new Map(payments.map((p) => [`${p.driver}|${dayKey(p.date)}`, p]));
  const statusOn = await loadStatusResolver(assignments.map((a) => a.vehicle._id));

  const rows = assignments
    .filter((a) => !a.endDate || a.endDate > a.startDate)
    .map((a) => {
      let expected = 0;
      let paid = 0;
      let missing = 0;
      const cells = days.map((d) => {
        if (isSunday(d)) return { text: 'Repos', tone: 'sun', title: 'Dimanche' };
        const covered = a.startDate <= d && (!a.endDate || a.endDate > d);
        const p = paymentOf.get(`${a.driver._id}|${dayKey(d)}`);
        // Un versement saisi sur un autre véhicule appartient à l'autre ligne
        const mine = p && String(p.vehicle) === String(a.vehicle._id) ? p : null;
        const c = cell(covered, d > today, mine, statusOn(a.vehicle._id, d));
        if (mine) {
          expected += mine.expected;
          paid += mine.paid;
        } else if (c.tone === 'missing') missing += 1;
        return c;
      });
      return {
        key: String(a._id),
        driverId: String(a.driver._id),
        driverName: `${a.driver.firstName} ${a.driver.lastName}`,
        vehicleId: String(a.vehicle._id),
        plate: a.vehicle.plate,
        cells,
        expected,
        paid,
        missing,
      };
    })
    .sort((a, b) => a.plate.localeCompare(b.plate) || a.driverName.localeCompare(b.driverName));

  const tot = rows.reduce((t, r) => ({ expected: t.expected + r.expected, paid: t.paid + r.paid, missing: t.missing + r.missing }), { expected: 0, paid: 0, missing: 0 });
  const prev = dayKey(addDays(monday, -7));
  const next = addDays(monday, 7);

  return (
    <>
      <h2 className="day-title">Semaine du {formatDate(monday)} au {formatDate(addDays(monday, 6))}</h2>
      <div className="daynav">
        <Link href={`/versements?vue=semaine&date=${prev}`} className="btn icon" aria-label="Semaine précédente" title="Semaine précédente"><ChevronLeft size={18} aria-hidden="true" /></Link>
        {next <= today && <Link href={`/versements?vue=semaine&date=${dayKey(next)}`} className="btn icon" aria-label="Semaine suivante" title="Semaine suivante"><ChevronRight size={18} aria-hidden="true" /></Link>}
        {next <= today && <Link href="/versements?vue=semaine" className="btn icon" aria-label="Cette semaine" title="Cette semaine"><CalendarCheck size={18} aria-hidden="true" /></Link>}
      </div>

      <div className="card scroll">
        {rows.length === 0 ? (
          <p className="empty-state">Aucune affectation cette semaine.</p>
        ) : (
          <table className="week">
            <thead>
              <tr>
                <th>Véhicule</th>
                <th>Chauffeur</th>
                {days.map((d) => (
                  <th key={dayKey(d)} className="c">
                    {isSunday(d) || d > today ? formatShortDay(d) : <Link href={`/versements?date=${dayKey(d)}`}>{formatShortDay(d)}</Link>}
                  </th>
                ))}
                <th className="num">Versé</th>
                <th className="num">Écart</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="mono"><Link href={`/vehicules/${r.vehicleId}`} className="ref">{r.plate}</Link></td>
                  <td><Link href={`/chauffeurs/${r.driverId}`} className="ref">{r.driverName}</Link></td>
                  {r.cells.map((c, i) => (
                    <td key={i} className="c">
                      <span className={`cell ${c.tone}`} title={c.title} aria-label={c.title}>
                        {CELL_ICONS[c.tone] ? (() => { const I = CELL_ICONS[c.tone]; return <I size={14} aria-hidden="true" />; })() : c.text}
                      </span>
                    </td>
                  ))}
                  <td className="num">{formatNumber(r.paid)}</td>
                  <td className={`num${r.paid - r.expected < 0 ? ' neg' : ''}`}>{formatNumber(r.paid - r.expected)}</td>
                </tr>
              ))}
              <tr className="total">
                <td colSpan={2}>Total{tot.missing > 0 && <span className="muted small"> · {tot.missing} journée{tot.missing > 1 ? 's' : ''} non saisie{tot.missing > 1 ? 's' : ''}</span>}</td>
                <td colSpan={7} />
                <td className="num">{formatNumber(tot.paid)}</td>
                <td className={`num${tot.paid - tot.expected < 0 ? ' neg' : ''}`}>{formatNumber(tot.paid - tot.expected)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="legend">
        <span><i className="cell ok" /> Payé</span>
        <span><i className="cell warn" /> Partiel</span>
        <span><i className="cell bad" /> Non versé</span>
        <span><i className="cell neu"><CircleMinus size={12} aria-hidden="true" /></i> Non dû</span>
        <span><i className="cell missing"><CircleDashed size={12} aria-hidden="true" /></i> Non saisi</span>
        <span><i className="cell sun"><Coffee size={12} aria-hidden="true" /></i> Repos</span>
      </div>
    </>
  );
}
