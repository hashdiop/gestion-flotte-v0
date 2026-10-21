import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import Badge from '@/components/Badge';
import AssignForm from '@/components/AssignForm';
import AssignmentHistory from '@/components/AssignmentHistory';
import { setDriverActive } from '@/actions/drivers';
import { endAssignment } from '@/actions/assignments';
import { connectDB } from '@/lib/db';
import { currentAssignmentsBy } from '@/lib/assignments';
import { dayKey, todayUTC } from '@/lib/dates';
import { paymentStatus } from '@/lib/payments';
import Payment from '@/models/Payment';
import { formatDate, formatFCFA, formatNumber, toDateInput } from '@/lib/format';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';
import Assignment from '@/models/Assignment';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return {};
  await connectDB();
  const d = await Driver.findById(id, 'firstName lastName').lean();
  return d ? { title: `${d.firstName} ${d.lastName} · Gestion de flotte` } : {};
}

export default async function DriverPage({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const d = await Driver.findById(id).lean();
  if (!d) notFound();

  const [[totalsRow], recentPayments] = await Promise.all([
    Payment.aggregate([
      { $match: { driver: d._id } },
      {
        $group: {
          _id: null,
          expected: { $sum: '$expected' },
          paid: { $sum: '$paid' },
          unpaid: { $sum: { $cond: [{ $and: [{ $gt: ['$expected', 0] }, { $eq: ['$paid', 0] }] }, 1, 0] } },
        },
      },
    ]),
    Payment.find({ driver: id }).sort({ date: -1 }).limit(10).populate('vehicle', 'plate').lean(),
  ]);
  const totals = totalsRow ?? { expected: 0, paid: 0, unpaid: 0 };

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
      <Link href="/chauffeurs" className="back">← Chauffeurs</Link>

      <section className="card fiche-h">
        <div className="id">
          <div className="avatar" aria-hidden="true">{initials}</div>
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
          {d.active ? <Badge tone="ok">Actif</Badge> : <Badge tone="neu">Désactivé</Badge>}
          <Link href={`/chauffeurs/${id}/modifier`} className="btn">Modifier</Link>
        </div>
      </section>

      <section className="card">
        <div className="card-h">
          <h2>Véhicule</h2>
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
              <form action={endAssignment.bind(null, String(current._id))}>
                <button type="submit" className="btn">Retirer le véhicule</button>
              </form>
            </div>
          ) : (
            <p className="muted">{d.active ? 'Aucun véhicule affecté.' : 'Chauffeur désactivé : aucun véhicule.'}</p>
          )}
          {d.active && (
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
          <h2>Versements</h2>
          <Link href="/versements?vue=semaine" className="small">Voir la semaine</Link>
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
        <div className="card-h"><h2>Historique des affectations</h2></div>
        <AssignmentHistory items={history} side="vehicle" />
      </section>

      {d.notes && (
        <section className="card pad">
          <h2>Notes</h2>
          <p className="pre">{d.notes}</p>
        </section>
      )}

      <section className="card pad">
        <h2>{d.active ? 'Départ du chauffeur' : 'Retour du chauffeur'}</h2>
        <p className="muted small">
          {d.active
            ? 'Un chauffeur qui part est désactivé, jamais supprimé : son historique est conservé et son véhicule lui est retiré.'
            : 'Le chauffeur réapparaîtra dans la liste des actifs.'}
        </p>
        <form action={toggle}>
          <input type="hidden" name="active" value={d.active ? 'false' : 'true'} />
          <button type="submit" className="btn">{d.active ? 'Désactiver le chauffeur' : 'Réactiver le chauffeur'}</button>
        </form>
      </section>
    </>
  );
}
