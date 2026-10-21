import Link from 'next/link';
import PaymentRow from '@/components/PaymentRow';
import { addDays, dayKey, formatLongDay, isSunday, todayUTC } from '@/lib/dates';
import { getDayRows } from '@/lib/day-rows';
import { formatFCFA } from '@/lib/format';

const COLS = 6;

export default async function DayView({ day }) {
  const today = todayUTC();
  const isToday = dayKey(day) === dayKey(today);
  const key = dayKey(day);

  const nav = (
    <div className="daynav">
      <Link href={`/versements?date=${dayKey(addDays(day, -1))}`} className="btn">← Veille</Link>
      <form action="/versements" className="daynav-form">
        <input type="date" name="date" defaultValue={key} max={dayKey(today)} aria-label="Choisir une date" />
        <button type="submit" className="btn">Afficher</button>
      </form>
      {day < today && <Link href={`/versements?date=${dayKey(addDays(day, 1))}`} className="btn">Lendemain →</Link>}
      {!isToday && <Link href="/versements" className="btn">Aujourd’hui</Link>}
    </div>
  );

  if (isSunday(day)) {
    return (
      <>
        <h2 className="day-title">{formatLongDay(day)}</h2>
        {nav}
        <div className="banner">Dimanche : jour de repos, aucun versement n’est dû.</div>
      </>
    );
  }

  const { rows, expected, paid, missing } = await getDayRows(day);

  return (
    <>
      <h2 className="day-title">{formatLongDay(day)}</h2>
      {nav}

      <div className="kpis">
        <div className="card kpi">
          <span className="sub">Attendu</span>
          <span className="v">{formatFCFA(expected)}</span>
        </div>
        <div className="card kpi">
          <span className="sub">Encaissé</span>
          <span className="v">{formatFCFA(paid)}</span>
          <div className="bar"><i style={{ width: `${expected ? Math.min(100, (paid / expected) * 100) : 0}%` }} /></div>
        </div>
        <div className="card kpi">
          <span className="sub">Reste à encaisser</span>
          <span className={`v${expected - paid > 0 ? ' neg' : ''}`}>{formatFCFA(Math.max(0, expected - paid))}</span>
        </div>
        <div className="card kpi">
          <span className="sub">{isToday ? 'Lignes à saisir' : 'Lignes non saisies'}</span>
          <span className="v">{missing} / {rows.length}</span>
        </div>
      </div>

      <div className="card scroll">
        {rows.length === 0 ? (
          <p className="empty-state">Aucun chauffeur n’avait de véhicule ce jour-là.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Véhicule</th>
                <th>Chauffeur</th>
                <th className="num">Attendu</th>
                <th className="num">Versé</th>
                <th>Statut</th>
                <th><span className="sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <PaymentRow key={r.key} row={r} day={key} colCount={COLS} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
