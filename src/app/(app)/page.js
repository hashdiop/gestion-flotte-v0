import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import { connectDB } from '@/lib/db';
import { addDays, dayKey, formatLongDay, isSunday, todayUTC } from '@/lib/dates';
import { getDayRows } from '@/lib/day-rows';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { currentDocuments, daysLabel, documentStatus, needsAction } from '@/lib/documents';
import { categoryLabel } from '@/lib/expense-categories';
import { formatDate, formatFCFA, formatNumber } from '@/lib/format';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';
import Assignment from '@/models/Assignment';
import Driver from '@/models/Driver';
import Expense from '@/models/Expense';
import Payment from '@/models/Payment';
import Vehicle from '@/models/Vehicle';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tableau de bord · Gestion de flotte' };

const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);

// Journées passées du mois (hors dimanches) où un chauffeur avait un véhicule mais rien n'a été saisi
function countMissingDays(assignments, payments, from, to) {
  const saisis = new Set(payments.map((p) => `${p.driver}|${dayKey(p.date)}`));
  let n = 0;
  for (let d = from; d < to; d = addDays(d, 1)) {
    if (isSunday(d)) continue;
    for (const a of assignments) {
      const covers = a.startDate <= d && (!a.endDate || a.endDate > d);
      if (covers && !saisis.has(`${a.driver}|${dayKey(d)}`)) n += 1;
    }
  }
  return n;
}

export default async function DashboardPage() {
  const today = todayUTC();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  const sunday = isSunday(today);

  await connectDB();
  const [todayData, monthPayments, monthAssignments, expenseByType, recentExpenses, vehicles, activeDrivers, currentAssignments, arrearsAgg] =
    await Promise.all([
      sunday ? null : getDayRows(today),
      Payment.find({ date: { $gte: monthStart, $lte: today } }).lean(),
      Assignment.find({ startDate: { $lte: today }, $or: [{ endDate: null }, { endDate: { $gt: monthStart } }] }).lean(),
      Expense.aggregate([
        { $match: { deletedAt: null, date: { $gte: monthStart, $lt: nextMonth } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Expense.find({ deletedAt: null }).sort({ date: -1, createdAt: -1 }).limit(5).populate('vehicle', 'plate').lean(),
      Vehicle.find({ status: { $ne: 'sorti_du_parc' } }).sort({ plate: 1 }).lean(),
      Driver.find({ active: true }).lean(),
      Assignment.find({ current: true }).lean(),
      // Écart cumulé par chauffeur sur toutes les journées saisies
      Payment.aggregate([
        { $group: { _id: '$driver', due: { $sum: { $subtract: ['$expected', '$paid'] } }, last: { $max: '$date' } } },
        { $match: { due: { $gt: 0 } } },
        { $sort: { due: -1 } },
      ]),
    ]);

  // Mois en cours
  const monthExpected = monthPayments.reduce((s, p) => s + p.expected, 0);
  const monthPaid = monthPayments.reduce((s, p) => s + p.paid, 0);
  const missingDays = countMissingDays(monthAssignments, monthPayments, monthStart, today);
  const expenses = Object.fromEntries(expenseByType.map((e) => [e._id, e.total]));
  const monthExpenses = (expenses.vehicule ?? 0) + (expenses.divers ?? 0);

  // Parc
  const byStatus = Object.fromEntries(Object.keys(VEHICLE_STATUS).map((s) => [s, vehicles.filter((v) => v.status === s).length]));
  const assignedDrivers = new Set(currentAssignments.map((a) => String(a.driver)));
  const assignedVehicles = new Set(currentAssignments.map((a) => String(a.vehicle)));
  const driversWithoutVehicle = activeDrivers.filter((d) => !assignedDrivers.has(String(d._id)));
  const idleVehicles = vehicles.filter((v) => v.status === 'en_service' && !assignedVehicles.has(String(v._id)));

  // Documents
  const docs = await currentDocuments(vehicles.map((v) => v._id));
  const docRows = vehicles
    .flatMap((v) =>
      Object.entries(DOCUMENT_TYPES).map(([type, t]) => {
        const doc = docs.get(String(v._id))?.[type];
        return { vehicle: v, type, label: t.label, status: documentStatus(doc, today) };
      })
    )
    .filter((r) => needsAction(r.status))
    .sort((a, b) => a.status.rank - b.status.rank || (a.status.days ?? 0) - (b.status.days ?? 0));

  // Arriérés : noms des chauffeurs
  const arrearsDrivers = await Driver.find({ _id: { $in: arrearsAgg.map((a) => a._id) } }, 'firstName lastName').lean();
  const nameOf = new Map(arrearsDrivers.map((d) => [String(d._id), `${d.firstName} ${d.lastName}`]));
  const arrearsTotal = arrearsAgg.reduce((s, a) => s + a.due, 0);

  return (
    <>
      <PageHeader title="Tableau de bord" sub={formatLongDay(today).replace(/^./, (c) => c.toUpperCase())} />

      <div className="alerts">
        {!sunday && todayData.missing > 0 && (
          <div className="banner">
            <span><b>{todayData.missing}</b> versement{todayData.missing > 1 ? 's' : ''} à saisir aujourd’hui.</span>
            <Link href="/versements">Saisir les versements</Link>
          </div>
        )}
        {missingDays > 0 && (
          <div className="banner warn-banner">
            <span><b>{missingDays}</b> journée{missingDays > 1 ? 's' : ''} non saisie{missingDays > 1 ? 's' : ''} depuis le 1er du mois.</span>
            <Link href="/versements?vue=semaine">Voir les semaines</Link>
          </div>
        )}
        {docRows.length > 0 && (
          <div className="banner bad-banner">
            <span><b>{docRows.length}</b> document{docRows.length > 1 ? 's' : ''} à traiter (expirés, proches de l’échéance ou manquants).</span>
            <Link href="/documents">Voir l’échéancier</Link>
          </div>
        )}
        {sunday && <div className="banner">Dimanche : jour de repos, aucun versement n’est dû aujourd’hui.</div>}
      </div>

      <div className="kpis">
        <div className="card kpi">
          <span className="sub">Encaissé aujourd’hui</span>
          <span className="v">{sunday ? '—' : formatFCFA(todayData.paid)}</span>
          {!sunday && (
            <>
              <div className="bar"><i style={{ width: `${pct(todayData.paid, todayData.expected)}%` }} /></div>
              <span className="small muted">sur {formatFCFA(todayData.expected)} attendus</span>
            </>
          )}
        </div>
        <div className="card kpi">
          <span className="sub">Encaissé ce mois</span>
          <span className="v">{formatFCFA(monthPaid)}</span>
          <div className="bar"><i style={{ width: `${pct(monthPaid, monthExpected)}%` }} /></div>
          <span className="small muted">sur {formatFCFA(monthExpected)} attendus (journées saisies)</span>
        </div>
        <div className="card kpi">
          <span className="sub">Dépenses du mois</span>
          <span className="v">{formatFCFA(monthExpenses)}</span>
          <span className="small muted">Véhicules {formatNumber(expenses.vehicule ?? 0)} · divers {formatNumber(expenses.divers ?? 0)}</span>
        </div>
        <div className="card kpi">
          <span className="sub">Résultat du mois</span>
          <span className={`v${monthPaid - monthExpenses < 0 ? ' neg' : ''}`}>{formatFCFA(monthPaid - monthExpenses)}</span>
          <span className="small muted">Encaissé moins dépenses</span>
        </div>
      </div>

      <div className="split">
        <section className="card">
          <div className="card-h">
            <h2>Versements du jour</h2>
            <Link href="/versements" className="small">Ouvrir</Link>
          </div>
          {sunday ? (
            <p className="empty-state">Repos.</p>
          ) : todayData.rows.length === 0 ? (
            <p className="empty-state">Aucun chauffeur affecté.</p>
          ) : (
            todayData.rows.map((r) => (
              <div key={r.key} className="list-item">
                <span className="stack">
                  <span><span className="mono">{r.plate}</span> · {r.driverName}</span>
                  <span className="muted small">{formatNumber(r.payment?.paid ?? 0)} / {formatNumber(r.expected)}</span>
                </span>
                <Badge tone={r.status.tone}>{r.status.label}</Badge>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Documents à traiter</h2>
            <Link href="/documents" className="small">Échéancier</Link>
          </div>
          {docRows.length === 0 ? (
            <p className="empty-state">Tous les documents sont à jour.</p>
          ) : (
            docRows.slice(0, 6).map((r) => (
              <div key={`${r.vehicle._id}-${r.type}`} className="list-item">
                <span className="stack">
                  <span>{r.label}</span>
                  <Link href={`/vehicules/${r.vehicle._id}`} className="ref mono small">{r.vehicle.plate}</Link>
                </span>
                <span className="row">
                  <span className="mono small">{daysLabel(r.status.days)}</span>
                  <Badge tone={r.status.tone}>{r.status.label}</Badge>
                </span>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Écarts cumulés par chauffeur</h2>
            <span className="mono small neg">{arrearsTotal ? `−${formatNumber(arrearsTotal)}` : ''}</span>
          </div>
          {arrearsAgg.length === 0 ? (
            <p className="empty-state">Aucun chauffeur en retard de versement.</p>
          ) : (
            arrearsAgg.map((a) => (
              <div key={String(a._id)} className="list-item">
                <span className="stack">
                  <Link href={`/chauffeurs/${a._id}`} className="ref">{nameOf.get(String(a._id)) ?? 'Chauffeur'}</Link>
                  <span className="muted small">Dernière saisie le {formatDate(a.last)}</span>
                </span>
                <span className="mono neg">−{formatNumber(a.due)}</span>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Parc</h2>
            <Link href="/vehicules" className="small">Véhicules</Link>
          </div>
          {Object.entries(VEHICLE_STATUS)
            .filter(([s]) => s !== 'sorti_du_parc')
            .map(([s, info]) => (
              <div key={s} className="list-item">
                <Badge tone={info.tone}>{info.label}</Badge>
                <span className="mono">{byStatus[s]}</span>
              </div>
            ))}
          <div className="list-item">
            <span>Chauffeurs actifs</span>
            <span className="mono">{activeDrivers.length}</span>
          </div>
          {driversWithoutVehicle.length > 0 && (
            <div className="list-item">
              <span className="small">Sans véhicule : {driversWithoutVehicle.map((d) => `${d.firstName} ${d.lastName}`).join(', ')}</span>
            </div>
          )}
          {idleVehicles.length > 0 && (
            <div className="list-item">
              <span className="small">En service sans chauffeur : {idleVehicles.map((v) => v.plate).join(', ')}</span>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Dernières dépenses</h2>
            <Link href="/depenses" className="small">Toutes</Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="empty-state">Aucune dépense.</p>
          ) : (
            recentExpenses.map((x) => (
              <div key={String(x._id)} className="list-item">
                <span className="stack">
                  <span>{categoryLabel(x.category)} <span className="muted small">· {x.vehicle?.plate ?? 'Divers'}</span></span>
                  <span className="muted small">{formatDate(x.date)}{x.description ? ` · ${x.description}` : ''}</span>
                </span>
                <span className="mono">{formatNumber(x.amount)}</span>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
