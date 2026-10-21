import Link from 'next/link';
import { addDays, dayKey, formatShortDay, isSunday, todayUTC } from '@/lib/dates';
import { formatDate, formatNumber } from '@/lib/format';
import Assignment from '@/models/Assignment';
import Payment from '@/models/Payment';

// Contenu et couleur d'une case de la grille
function cell(covered, future, p) {
  if (!covered || future) return { text: '', tone: 'blank', title: covered ? 'À venir' : 'Pas affecté' };
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

  const [assignments, payments] = await Promise.all([
    Assignment.find({ startDate: { $lt: end }, $or: [{ endDate: null }, { endDate: { $gt: monday } }] })
      .populate('driver', 'firstName lastName')
      .populate('vehicle', 'plate')
      .lean(),
    Payment.find({ date: { $gte: monday, $lt: end } }).lean(),
  ]);
  const paymentOf = new Map(payments.map((p) => [`${p.driver}|${dayKey(p.date)}`, p]));

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
        const c = cell(covered, d > today, mine);
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
        <Link href={`/versements?vue=semaine&date=${prev}`} className="btn">← Semaine précédente</Link>
        {next <= today && <Link href={`/versements?vue=semaine&date=${dayKey(next)}`} className="btn">Semaine suivante →</Link>}
        {next <= today && <Link href="/versements?vue=semaine" className="btn">Cette semaine</Link>}
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
                      <span className={`cell ${c.tone}`} title={c.title}>{c.text}</span>
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
        <span><i className="cell neu" /> ND : non dû</span>
        <span><i className="cell missing" /> · : non saisi</span>
      </div>
    </>
  );
}
