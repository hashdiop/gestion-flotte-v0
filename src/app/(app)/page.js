import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Alert from '@/components/Alert';
import Kpi from '@/components/Kpi';
import VehicleStatusBadge from '@/components/VehicleStatusBadge';
import { DomainIcon } from '@/components/domains';
import { ArrowRight, Banknote, CalendarDays, CalendarX, CircleParking, Coffee, FileWarning, LockKeyhole, Receipt, TrendingUp, UserX, Users } from 'lucide-react';
import { connectDB } from '@/lib/db';
import { addDays, dayKey, formatLongDay, isSunday, todayUTC } from '@/lib/dates';
import { getDayRows } from '@/lib/day-rows';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { currentDocuments, daysLabel, documentStatus, needsAction } from '@/lib/documents';
import { categoryLabel } from '@/lib/expense-categories';
import { formatDate, formatFCFA, formatNumber, formatShort } from '@/lib/format';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';
import { loadStatusResolver, NOT_DUE_STATUSES } from '@/lib/vehicle-status-history';
import Assignment from '@/models/Assignment';
import Driver from '@/models/Driver';
import Expense from '@/models/Expense';
import Payment from '@/models/Payment';
import PaymentAdjustment from '@/models/PaymentAdjustment';
import { driverBalances } from '@/lib/balances';
import { getClosureState } from '@/lib/closure';
import Vehicle from '@/models/Vehicle';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tableau de bord · Gestion de flotte' };

const initialsOf = (name = '') => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);

// Journées passées du mois (hors dimanches) où un chauffeur avait un véhicule mais rien n'a été saisi.
// Les journées où le véhicule était en atelier ou immobilisé sont non dues : elles ne manquent pas.
function countMissingDays(assignments, payments, from, to, statusOn) {
  const saisis = new Set(payments.map((p) => `${p.driver}|${dayKey(p.date)}`));
  let n = 0;
  for (let d = from; d < to; d = addDays(d, 1)) {
    if (isSunday(d)) continue;
    for (const a of assignments) {
      const covers = a.startDate <= d && (!a.endDate || a.endDate > d);
      if (covers && !saisis.has(`${a.driver}|${dayKey(d)}`) && !NOT_DUE_STATUSES.has(statusOn(a.vehicle, d))) n += 1;
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
  const [todayData, monthPayments, monthAssignments, expenseByType, recentExpenses, vehicles, activeDrivers, currentAssignments, balances, monthAdjustments, closureState] =
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
      // Écart cumulé par chauffeur : journées saisies + écritures correctrices
      driverBalances(),
      // Écritures du mois : corrections rattachées à leur journée, remboursements au jour où l'argent est reçu
      PaymentAdjustment.find({
        $or: [
          { kind: 'correction', targetDate: { $gte: monthStart, $lte: today } },
          { kind: 'remboursement', entryDate: { $gte: monthStart, $lte: today } },
        ],
      }).lean(),
      getClosureState(),
    ]);

  // Mois en cours
  const monthExpected = monthPayments.reduce((s, p) => s + p.expected, 0) + monthAdjustments.reduce((s, a) => s + a.deltaExpected, 0);
  const monthPaid = monthPayments.reduce((s, p) => s + p.paid, 0) + monthAdjustments.reduce((s, a) => s + a.deltaPaid, 0);
  const arrearsAgg = [...balances.entries()]
    .filter(([, b]) => b.due > 0)
    .map(([id, b]) => ({ _id: id, due: b.due, last: b.last }))
    .sort((a, b) => b.due - a.due);

  // Clôture : rappel à partir de l'heure de clôture, ou dès qu'une journée passée reste ouverte
  let closureLate = 0;
  if (closureState.nextToClose) {
    for (let d = closureState.nextToClose; d < today; d = addDays(d, 1)) if (!isSunday(d)) closureLate += 1;
  }
  const closureDue =
    closureState.nextToClose && (closureState.nextToClose < today || new Date().getUTCHours() >= closureState.closingHour);
  const statusOn = await loadStatusResolver(monthAssignments.map((a) => a.vehicle));
  const missingDays = countMissingDays(monthAssignments, monthPayments, monthStart, today, statusOn);
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
      <PageHeader title="Tableau de bord" domain="dash" sub={formatLongDay(today).replace(/^./, (c) => c.toUpperCase())} />

      <div className="alerts">
        {closureDue && (
          <Alert tone="bad" icon={LockKeyhole} href="/versements/cloture" action="Clôturer">
            {closureLate > 0
              ? <><b>{closureLate}</b> jour{closureLate > 1 ? 's' : ''} non clôturé{closureLate > 1 ? 's' : ''} depuis le {formatDate(closureState.nextToClose)}</>
              : <>Journée à clôturer</>}
          </Alert>
        )}
        {!sunday && todayData.missing > 0 && (
          <Alert tone="info" icon={Banknote} href="/versements" action="Saisir">
            <b>{todayData.missing}</b> versement{todayData.missing > 1 ? 's' : ''} à saisir
          </Alert>
        )}
        {missingDays > 0 && (
          <Alert tone="warn" icon={CalendarX} href="/versements?vue=semaine" action="Voir">
            <b>{missingDays}</b> journée{missingDays > 1 ? 's' : ''} non saisie{missingDays > 1 ? 's' : ''} ce mois
          </Alert>
        )}
        {docRows.length > 0 && (
          <Alert tone="bad" icon={FileWarning} href="/documents" action="Voir">
            <b>{docRows.length}</b> document{docRows.length > 1 ? 's' : ''} à traiter
          </Alert>
        )}
        {sunday && <Alert tone="info" icon={Coffee}>Dimanche : repos</Alert>}
      </div>

      <div className="kpis">
        <Kpi
          icon={Banknote}
          color="pay"
          label="Encaissé aujourd’hui"
          value={sunday ? '—' : formatShort(todayData.paid)}
          tip={sunday ? undefined : `${formatFCFA(todayData.paid)} sur ${formatFCFA(todayData.expected)}`}
        >
          {!sunday && <div className="bar"><i style={{ width: `${pct(todayData.paid, todayData.expected)}%` }} /></div>}
        </Kpi>
        <Kpi
          icon={CalendarDays}
          color="info"
          label="Encaissé ce mois"
          value={formatShort(monthPaid)}
          tip={`${formatFCFA(monthPaid)} sur ${formatFCFA(monthExpected)}`}
        >
          <div className="bar"><i style={{ width: `${pct(monthPaid, monthExpected)}%` }} /></div>
        </Kpi>
        <Kpi
          icon={Receipt}
          color="exp"
          label="Dépenses du mois"
          value={formatShort(monthExpenses)}
          tip={`${formatFCFA(monthExpenses)} · véhicules ${formatNumber(expenses.vehicule ?? 0)} · divers ${formatNumber(expenses.divers ?? 0)}`}
        />
        <Kpi
          icon={TrendingUp}
          color={monthPaid - monthExpenses < 0 ? 'bad' : 'ok'}
          label="Résultat du mois"
          value={formatShort(monthPaid - monthExpenses)}
          tip={`${formatFCFA(monthPaid - monthExpenses)} (encaissé − dépenses)`}
          valueClass={monthPaid - monthExpenses < 0 ? 'neg' : ''}
        />
      </div>

      <div className="split">
        <section className="card">
          <div className="card-h">
            <span className="h-ico"><DomainIcon domain="pay" size={16} className="sm" /><h2>Versements du jour</h2></span>
            <Link href="/versements" className="btn icon ghost" aria-label="Ouvrir les versements"><ArrowRight size={18} /></Link>
          </div>
          {sunday ? (
            <p className="empty-state">Repos</p>
          ) : todayData.rows.length === 0 ? (
            <p className="empty-state">Aucun chauffeur affecté</p>
          ) : (
            todayData.rows.map((r) => (
              <div key={r.key} className="list-item">
                <span className="ent">
                  <span className="av" aria-hidden="true">{initialsOf(r.driverName)}</span>
                  <span className="ent-txt">
                    <span>{r.driverName}</span>
                    <span className="muted"><span className="mono">{r.plate}</span> · {formatNumber(r.paid)} / {formatNumber(r.expected)}</span>
                  </span>
                </span>
                <Badge tone={r.status.tone}>{r.status.label}</Badge>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <span className="h-ico"><DomainIcon domain="doc" size={16} className="sm" /><h2>Documents à traiter</h2></span>
            <Link href="/documents" className="btn icon ghost" aria-label="Ouvrir l’échéancier"><ArrowRight size={18} /></Link>
          </div>
          {docRows.length === 0 ? (
            <p className="empty-state">Tout est à jour</p>
          ) : (
            docRows.slice(0, 6).map((r) => (
              <div key={`${r.vehicle._id}-${r.type}`} className="list-item">
                <span className="ent-txt">
                  <span>{r.label}</span>
                  <Link href={`/vehicules/${r.vehicle._id}`} className="plate small">{r.vehicle.plate}</Link>
                </span>
                <span className="row-tight">
                  <span className="mono small muted">{daysLabel(r.status.days)}</span>
                  <Badge tone={r.status.tone}>{r.status.label}</Badge>
                </span>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <span className="h-ico"><DomainIcon domain="drv" size={16} className="sm" /><h2>Écarts par chauffeur</h2></span>
            <span className="mono small neg">{arrearsTotal ? `−${formatNumber(arrearsTotal)}` : ''}</span>
          </div>
          {arrearsAgg.length === 0 ? (
            <p className="empty-state">Personne en retard</p>
          ) : (
            arrearsAgg.map((a) => (
              <div key={String(a._id)} className="list-item">
                <span className="ent">
                  <span className="av" aria-hidden="true">{initialsOf(nameOf.get(String(a._id)))}</span>
                  <span className="ent-txt">
                    <Link href={`/chauffeurs/${a._id}`} className="ref">{nameOf.get(String(a._id)) ?? 'Chauffeur'}</Link>
                    <span className="muted">au {formatDate(a.last)}</span>
                  </span>
                </span>
                <span className="mono neg">−{formatNumber(a.due)}</span>
              </div>
            ))
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <span className="h-ico"><DomainIcon domain="veh" size={16} className="sm" /><h2>Parc</h2></span>
            <Link href="/vehicules" className="btn icon ghost" aria-label="Ouvrir les véhicules"><ArrowRight size={18} /></Link>
          </div>
          {Object.keys(VEHICLE_STATUS)
            .filter((s) => s !== 'sorti_du_parc')
            .map((s) => (
              <div key={s} className="list-item">
                <VehicleStatusBadge status={s} />
                <span className="mono">{byStatus[s]}</span>
              </div>
            ))}
          <div className="list-item">
            <Badge tone="info" icon={Users}>Chauffeurs actifs</Badge>
            <span className="mono">{activeDrivers.length}</span>
          </div>
          {driversWithoutVehicle.length > 0 && (
            <div className="list-item">
              <span className="small tip" data-tip={driversWithoutVehicle.map((d) => `${d.firstName} ${d.lastName}`).join(', ')}>
                <UserX size={14} aria-hidden="true" /> {driversWithoutVehicle.length} sans véhicule
              </span>
            </div>
          )}
          {idleVehicles.length > 0 && (
            <div className="list-item">
              <span className="small tip" data-tip={idleVehicles.map((v) => v.plate).join(', ')}>
                <CircleParking size={14} aria-hidden="true" /> {idleVehicles.length} sans chauffeur
              </span>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-h">
            <span className="h-ico"><DomainIcon domain="exp" size={16} className="sm" /><h2>Dernières dépenses</h2></span>
            <Link href="/depenses" className="btn icon ghost" aria-label="Ouvrir les dépenses"><ArrowRight size={18} /></Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="empty-state">Aucune dépense</p>
          ) : (
            recentExpenses.map((x) => (
              <div key={String(x._id)} className="list-item">
                <span className="ent-txt">
                  <span>{categoryLabel(x.category)}</span>
                  <span className="muted">{formatDate(x.date)} · {x.vehicle?.plate ?? 'Divers'}</span>
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
