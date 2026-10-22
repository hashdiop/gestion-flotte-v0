import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { can } from '@/lib/roles';
import { getSession } from '@/lib/session';
import Alert from '@/components/Alert';
import { CalendarClock, FileText } from 'lucide-react';
import Badge from '@/components/Badge';
import CloseDayForm from '@/components/CloseDayForm';
import { connectDB } from '@/lib/db';
import { cashExpectedFor, getClosureState } from '@/lib/closure';
import { addDays, dayKey, formatLongDay, isSunday } from '@/lib/dates';
import { getDayRows } from '@/lib/day-rows';
import { formatDate, formatFCFA, formatNumber } from '@/lib/format';
import DayClosure from '@/models/DayClosure';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Clôture journalière · Gestion de flotte' };

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export default async function ClosurePage() {
  const canClose = can(await getSession(), 'closeDay');
  await connectDB();
  const state = await getClosureState();
  const history = await DayClosure.find().sort({ date: -1 }).limit(30).lean();

  let preview = null;
  if (state.nextToClose) {
    const day = state.nextToClose;
    const [{ rows, paid }, cashExpected] = await Promise.all([getDayRows(day), cashExpectedFor(day)]);
    const toConvert = rows.filter((r) => !r.payment && !r.autoNotDue);
    const autoNotDue = rows.filter((r) => r.autoNotDue);
    // Attendu après clôture : les lignes non saisies deviennent dues au tarif du véhicule
    const expectedAfter = rows.reduce((s, r) => s + (r.payment ? r.expected : r.autoNotDue ? 0 : r.rate), 0);
    preview = { day, rows, paid, cashExpected, toConvert, autoNotDue, expectedAfter };
  }

  // Prochaine journée une fois la dernière clôturée (pour l'affichage quand il n'y a rien à clôturer)
  let upcoming = state.lastClosed ? addDays(state.lastClosed, 1) : state.startDate;
  while (isSunday(upcoming)) upcoming = addDays(upcoming, 1);

  return (
    <>
      <Link href="/versements" className="back"><ArrowLeft size={15} aria-hidden="true" />Versements</Link>
      <PageHeader title="Clôture journalière" domain="clo" sub={`Clôture en place depuis le ${formatDate(state.startDate)}. Les journées se clôturent dans l’ordre, dimanches exclus.`} />

      {preview ? (
        <section className="card">
          <div className="card-h">
            <h2>À clôturer : {formatLongDay(preview.day)}</h2>
            <Link href={`/versements?date=${dayKey(preview.day)}`} className="small">Ouvrir la journée</Link>
          </div>
          <div className="kpis pad top-line">
            <div className="stack">
              <span className="sub">Attendu après clôture</span>
              <span className="v-sm">{formatFCFA(preview.expectedAfter)}</span>
            </div>
            <div className="stack">
              <span className="sub">Encaissé</span>
              <span className="v-sm">{formatFCFA(preview.paid)}</span>
            </div>
            <div className="stack">
              <span className="sub">Manque</span>
              <span className={`v-sm${preview.expectedAfter - preview.paid > 0 ? ' neg' : ''}`}>{formatFCFA(Math.max(0, preview.expectedAfter - preview.paid))}</span>
            </div>
          </div>

          {preview.toConvert.length > 0 && (
            <div className="pad top-line">
              <p className="form-warn">
                {preview.toConvert.length} ligne{preview.toConvert.length > 1 ? 's' : ''} sans saisie passer{preview.toConvert.length > 1 ? 'ont' : 'a'} « Non versé » :{' '}
                {preview.toConvert.map((r) => `${r.driverName} (${r.plate}, ${formatNumber(r.rate)})`).join(', ')}.
              </p>
            </div>
          )}
          {preview.autoNotDue.length > 0 && (
            <div className="pad top-line">
              <p className="muted small">
                Non dû d’office (véhicule hors service) : {preview.autoNotDue.map((r) => `${r.driverName} (${r.plate})`).join(', ')}.
              </p>
            </div>
          )}

          <div className="pad top-line">
            {canClose ? (
              <CloseDayForm
                day={dayKey(preview.day)}
                dayLabel={formatDate(preview.day)}
                cashExpected={preview.cashExpected}
                convertCount={preview.toConvert.length}
              />
            ) : (
              <p className="muted small">Seul un admin peut clôturer la journée.</p>
            )}
          </div>
        </section>
      ) : (
        <Alert tone="info" icon={CalendarClock}>
          Rien à clôturer pour l’instant. Prochaine : {formatLongDay(upcoming)}
        </Alert>
      )}

      <section className="card">
        <div className="card-h"><h2>Journées clôturées</h2></div>
        {history.length === 0 ? (
          <p className="empty-state">Aucune journée clôturée</p>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Journée</th>
                  <th>Clôturée</th>
                  <th className="num">Attendu</th>
                  <th className="num">Encaissé</th>
                  <th className="num">Non versés</th>
                  <th>Caisse</th>
                  <th><span className="sr">Rapport</span></th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => {
                  const gap = c.cashCounted - c.cashExpected;
                  return (
                    <tr key={String(c._id)}>
                      <td className="mono">{formatDate(c.date)}</td>
                      <td className="small">{formatDate(c.closedAt)} {timeFmt.format(c.closedAt)} · {c.closedBy}</td>
                      <td className="num">{formatNumber(c.expected)}</td>
                      <td className="num">{formatNumber(c.paid)}</td>
                      <td className="num">{c.missingCount}</td>
                      <td>{gap === 0 ? <Badge tone="ok">Juste</Badge> : <Badge tone="bad">{gap > 0 ? '+' : '−'}{formatNumber(Math.abs(gap))}</Badge>}</td>
                      <td className="actions-cell"><Link href={`/versements/cloture/${dayKey(c.date)}`} className="btn icon ghost" aria-label="Rapport" title="Rapport"><FileText size={17} aria-hidden="true" /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
