import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import Badge from '@/components/Badge';
import { domainVars } from '@/components/domains';
import { ArrowLeft, ArrowRight, Banknote, Car, History, Pencil, StickyNote, UserCheck, UserMinus, UserX } from 'lucide-react';
import AssignForm from '@/components/AssignForm';
import AssignmentHistory from '@/components/AssignmentHistory';
import { setDriverActive } from '@/actions/drivers';
import { endAssignment } from '@/actions/assignments';
import { connectDB } from '@/lib/db';
import { currentAssignmentsBy } from '@/lib/assignments';
import { dayKey, todayUTC } from '@/lib/dates';
import { paymentStatus } from '@/lib/payments';
import Payment from '@/models/Payment';
import { driverBalances } from '@/lib/balances';
import { formatDate, formatFCFA, formatNumber, toDateInput } from '@/lib/format';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';
import Assignment from '@/models/Assignment';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import { can } from '@/lib/roles';
import { getSession } from '@/lib/session';

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return {};
  await connectDB();
  const d = await Driver.findById(id, 'firstName lastName').lean();
  return d ? { title: `${d.firstName} ${d.lastName} · Gestion de flotte` } : {};
}

export default async function DriverPage({ params }) {
  // Droits du rôle connecté : les boutons non autorisés ne sont pas affichés
  const canFleet = can(await getSession(), 'editFleet');
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const d = await Driver.findById(id).lean();
  if (!d) notFound();

  // Solde : journées saisies + écritures correctrices (remboursements, corrections après clôture)
  const [balances, recentPayments] = await Promise.all([
    driverBalances(id),
    Payment.find({ driver: id }).sort({ date: -1 }).limit(10).populate('vehicle', 'plate').lean(),
  ]);
  const totals = balances.get(id) ?? { expected: 0, paid: 0, unpaid: 0 };

  const [history, freeVehicles, byVehicle] = await Promise.all([
    Assignment.find({ driver: id }).sort({ startDate: -1, createdAt: -1 }).populate('vehicle', 'plate brand model status dailyRate').lean(),
    Vehicle.find({ status: 'en_service' }).sort({ plate: 1 }).lean(),
    currentAssignmentsBy('vehicle'),
  ]);
  const current = history.find((a) => a.current);
  const vehicleOptions = freeVehicles
    .filter((v) => String(v._id) !== String(current?.vehicle._id))
    .map((v) => {
      const holder = byVehicle.get(String(v._id))?.driver;
      const holderName = holder && `${holder.firstName} ${holder.lastName}`;
      return {
        value: String(v._id),
        label: `${v.plate} · ${v.brand} ${v.model} · ${formatNumber(v.dailyRate)} FCFA/j${holder ? ` — affecté à ${holderName}` : ''}`,
        warning: holder && `${v.plate} est actuellement affecté à ${holderName}.`,
      };
    });

  const toggle = setDriverActive.bind(null, id);
  const initials = `${d.firstName[0] ?? ''}${d.lastName[0] ?? ''}`.toUpperCase();

  return (
    <>
      <Link href="/chauffeurs" className="back"><ArrowLeft size={15} aria-hidden="true" />Chauffeurs</Link>

      <section className="card fiche-h">
        <div className="id">
          <span className="dom lg avatar-drv" style={domainVars('drv')} aria-hidden="true">{initials}</span>
          <div className="stack">
            <h1>{d.firstName} {d.lastName}</h1>
            <div className="facts">
              <span>Tél. <b className="mono">{d.phone}</b></span>
              <span>Arrivé le <b>{formatDate(d.hiredAt)}</b></span>
              {d.address && <span>{d.address}</span>}
            </div>
          </div>
        </div>
        <div className="row">
          {d.active ? <Badge tone="ok" icon={UserCheck}>Actif</Badge> : <Badge tone="neu" icon={UserX}>Désactivé</Badge>}
          {canFleet && <Link href={`/chauffeurs/${id}/modifier`} className="btn"><Pencil size={16} aria-hidden="true" />Modifier</Link>}
        </div>
      </section>

      <section className="card" id="vehicule">
        <div className="card-h">
          <span className="h-ico"><span className="dom sm" style={domainVars('veh')} aria-hidden="true"><Car size={15} /></span><h2>Véhicule</h2></span>
        </div>
        <div className="pad top-line">
          {current ? (
            <div className="current">
              <div className="stack">
                <span>
                  <Link href={`/vehicules/${current.vehicle._id}`} className="ref mono">{current.vehicle.plate}</Link>
                  {' '}· {current.vehicle.brand} {current.vehicle.model}{' '}
                  <Badge tone={VEHICLE_STATUS[current.vehicle.status].tone}>{VEHICLE_STATUS[current.vehicle.status].label}</Badge>
                </span>
                <span className="muted small">
                  Depuis le {formatDate(current.startDate)} · {formatFCFA(current.vehicle.dailyRate)} par jour{current.reason && ` · ${current.reason}`}
                </span>
              </div>
              {canFleet && (
                <form action={endAssignment.bind(null, String(current._id))}>
                  <button type="submit" className="btn"><UserMinus size={16} aria-hidden="true" />Retirer le véhicule</button>
                </form>
              )}
            </div>
          ) : (
            <p className="muted">{d.active ? 'Aucun véhicule affecté.' : 'Chauffeur désactivé : aucun véhicule.'}</p>
          )}
          {canFleet && d.active && (
            <>
              <h3 className="h3">{current ? 'Changer de véhicule' : 'Affecter un véhicule'}</h3>
              <AssignForm
                fixedName="driverId"
                fixedValue={id}
                selectName="vehicleId"
                selectLabel="Véhicule (en service)"
                options={vehicleOptions}
                today={toDateInput(todayUTC())}
                submitLabel="Affecter"
              />
            </>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-h">
          <span className="h-ico"><span className="dom sm" style={domainVars('pay')} aria-hidden="true"><Banknote size={15} /></span><h2>Versements</h2></span>
          <Link href="/versements?vue=semaine" className="btn icon ghost" aria-label="Voir la semaine" title="Voir la semaine"><ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="kpis pad top-line">
          <div className="stack">
            <span className="sub">Attendu (journées saisies)</span>
            <span className="v-sm">{formatFCFA(totals.expected)}</span>
          </div>
          <div className="stack">
            <span className="sub">Versé</span>
            <span className="v-sm">{formatFCFA(totals.paid)}</span>
          </div>
          <div className="stack">
            <span className="sub">Écart cumulé</span>
            <span className={`v-sm${totals.paid - totals.expected < 0 ? ' neg' : ''}`}>{formatFCFA(totals.paid - totals.expected)}</span>
          </div>
          <div className="stack">
            <span className="sub">Journées non versées</span>
            <span className="v-sm">{totals.unpaid}</span>
          </div>
        </div>
        {recentPayments.length > 0 && (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Véhicule</th>
                  <th className="num">Attendu</th>
                  <th className="num">Versé</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => {
                  const s = paymentStatus(p);
                  return (
                    <tr key={String(p._id)}>
                      <td className="mono"><Link href={`/versements?date=${dayKey(p.date)}`} className="ref">{formatDate(p.date)}</Link></td>
                      <td className="mono">{p.vehicle?.plate}</td>
                      <td className="num">{formatNumber(p.expected)}</td>
                      <td className="num">{formatNumber(p.paid)}</td>
                      <td><Badge tone={s.tone}>{s.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-h"><span className="h-ico"><span className="dom sm" style={domainVars('drv')} aria-hidden="true"><History size={15} /></span><h2>Historique des affectations</h2></span></div>
        <AssignmentHistory items={history} side="vehicle" />
      </section>

      {d.notes && (
        <section className="card pad">
          <span className="h-ico"><StickyNote size={18} aria-hidden="true" style={{ color: 'var(--muted)' }} /><h2>Notes</h2></span>
          <p className="pre">{d.notes}</p>
        </section>
      )}

      {canFleet && <section className="card pad">
        <h2>{d.active ? 'Départ du chauffeur' : 'Retour du chauffeur'}</h2>
        <p className="muted small">
          {d.active
            ? 'Un chauffeur qui part est désactivé, jamais supprimé : son historique est conservé et son véhicule lui est retiré.'
            : 'Le chauffeur réapparaîtra dans la liste des actifs.'}
        </p>
        <form action={toggle}>
          <input type="hidden" name="active" value={d.active ? 'false' : 'true'} />
          <button type="submit" className={`btn${d.active ? ' danger-btn' : ''}`}>{d.active ? <UserX size={16} aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}{d.active ? 'Désactiver le chauffeur' : 'Réactiver le chauffeur'}</button>
        </form>
      </section>}
    </>
  );
}
