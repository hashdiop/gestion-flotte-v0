import Link from 'next/link';
import { Banknote, CalendarCheck, ChevronLeft, ChevronRight, CircleAlert, Coffee, Hourglass, ListChecks, Search } from 'lucide-react';
import Alert from '@/components/Alert';
import Kpi from '@/components/Kpi';
import PaymentRow from '@/components/PaymentRow';
import { getClosureState } from '@/lib/closure';
import { addDays, dayKey, formatLongDay, isSunday, todayUTC } from '@/lib/dates';
import { getDayRows } from '@/lib/day-rows';
import { formatDate, formatFCFA, formatShort } from '@/lib/format';
import { can } from '@/lib/roles';
import { getSession } from '@/lib/session';

const COLS = 6;
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export default async function DayView({ day }) {
  const today = todayUTC();
  const isToday = dayKey(day) === dayKey(today);
  const key = dayKey(day);

  const nav = (
    <div className="daynav">
      <Link href={`/versements?date=${dayKey(addDays(day, -1))}`} className="btn icon" aria-label="Veille" title="Veille">
        <ChevronLeft size={18} aria-hidden="true" />
      </Link>
      <h2 className="day-title">{formatLongDay(day)}</h2>
      {day < today && (
        <Link href={`/versements?date=${dayKey(addDays(day, 1))}`} className="btn icon" aria-label="Lendemain" title="Lendemain">
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      )}
      <form action="/versements" className="daynav-form">
        <input type="date" name="date" defaultValue={key} max={dayKey(today)} aria-label="Choisir une date" />
        <button type="submit" className="btn icon" aria-label="Afficher" title="Afficher"><Search size={17} aria-hidden="true" /></button>
      </form>
      {!isToday && (
        <Link href="/versements" className="btn icon" aria-label="Aujourd’hui" title="Aujourd’hui">
          <CalendarCheck size={18} aria-hidden="true" />
        </Link>
      )}
    </div>
  );

  if (isSunday(day)) {
    return (
      <>
        {nav}
        <Alert tone="info" icon={Coffee}>Dimanche : repos, rien n’est dû</Alert>
      </>
    );
  }

  const [{ rows, expected, paid, missing, closure }, state, me] = await Promise.all([getDayRows(day), getClosureState(), getSession()]);
  const canClose = can(me, 'closeDay');
  // Journée ouverte : saisie (l'agent seulement aujourd'hui) ; journée clôturée : corrections réservées à l'admin
  const canEdit = closure ? can(me, 'adjustClosed') : can(me, 'recordPayment') && (isToday || can(me, 'recordPastPayment'));
  const isNext = state.nextToClose && dayKey(state.nextToClose) === key;
  const beforeStart = day < state.closureStartDate;

  // État de la journée vis-à-vis de la clôture
  let closureAlert = null;
  if (closure) {
    closureAlert = (
      <Alert tone="closed" href={`/versements/cloture/${key}`} action="Rapport">
        Journée clôturée le {formatDate(closure.closedAt)} à {timeFmt.format(closure.closedAt)} par {closure.closedBy}
      </Alert>
    );
  } else if (isNext) {
    closureAlert = (
      <Alert tone="info" icon={Hourglass} href={canClose ? '/versements/cloture' : undefined} action="Clôturer">
        Journée ouverte{missing ? ` · ${missing} sans saisie → « Non versé » à la clôture` : ''}
      </Alert>
    );
  } else if (!beforeStart && state.nextToClose && day > state.nextToClose) {
    closureAlert = (
      <Alert tone="warn" href={canClose ? '/versements/cloture' : undefined} action={`Clôturer le ${formatDate(state.nextToClose)}`}>
        Clôturer d’abord le {formatDate(state.nextToClose)}
      </Alert>
    );
  }

  return (
    <>
      {nav}
      {/* Classe gardée pour les tests et repères : bandeau de journée clôturée */}
      {closure ? <div className="closed-banner">{closureAlert}</div> : closureAlert}

      <div className="kpis">
        <Kpi icon={ListChecks} color="info" label="Attendu" value={formatShort(expected)} tip={formatFCFA(expected)} />
        <Kpi icon={Banknote} color="pay" label="Encaissé" value={formatShort(paid)} tip={formatFCFA(paid)}>
          <div className="bar"><i style={{ width: `${expected ? Math.min(100, (paid / expected) * 100) : 0}%` }} /></div>
        </Kpi>
        <Kpi
          icon={CircleAlert}
          color={expected - paid > 0 ? 'bad' : 'ok'}
          label={closure ? 'Manque' : 'Reste'}
          value={formatShort(Math.max(0, expected - paid))}
          tip={formatFCFA(Math.max(0, expected - paid))}
          valueClass={expected - paid > 0 ? 'neg' : ''}
        />
        {!closure && <Kpi icon={Hourglass} color="warn" label={isToday ? 'À saisir' : 'Non saisies'} value={`${missing} / ${rows.length}`} />}
      </div>

      <div className="card scroll">
        {rows.length === 0 ? (
          <p className="empty-state">Aucun chauffeur affecté ce jour-là</p>
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
                <PaymentRow key={r.key} row={r} day={key} colCount={COLS} closed={Boolean(closure)} canEdit={canEdit} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
