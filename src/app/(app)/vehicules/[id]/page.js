import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import Badge from '@/components/Badge';
import AssignForm from '@/components/AssignForm';
import AssignmentHistory from '@/components/AssignmentHistory';
import { setVehicleStatus } from '@/actions/vehicles';
import { endAssignment } from '@/actions/assignments';
import { connectDB } from '@/lib/db';
import { currentAssignmentsBy } from '@/lib/assignments';
import { todayUTC } from '@/lib/dates';
import { formatDate, formatFCFA, formatNumber, toDateInput } from '@/lib/format';
import { VEHICLE_STATUS, VEHICLE_TRANSITIONS } from '@/lib/vehicle-status';
import { categoryLabel } from '@/lib/expense-categories';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { currentDocuments, daysLabel, documentStatus } from '@/lib/documents';
import Assignment from '@/models/Assignment';
import Expense from '@/models/Expense';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return {};
  await connectDB();
  const v = await Vehicle.findById(id, 'plate').lean();
  return v ? { title: `${v.plate} · Gestion de flotte` } : {};
}

export default async function VehiclePage({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const v = await Vehicle.findById(id).lean();
  if (!v) notFound();

  const status = VEHICLE_STATUS[v.status];
  const transitions = VEHICLE_TRANSITIONS[v.status];
  const changeStatus = setVehicleStatus.bind(null, id);

  const [history, activeDrivers, byDriver] = await Promise.all([
    Assignment.find({ vehicle: id }).sort({ startDate: -1, createdAt: -1 }).populate('driver', 'firstName lastName').lean(),
    Driver.find({ active: true }).sort({ lastName: 1, firstName: 1 }).lean(),
    currentAssignmentsBy('driver'),
  ]);
  const firstOfMonth = new Date(Date.UTC(todayUTC().getUTCFullYear(), todayUTC().getUTCMonth(), 1));
  const [[sums], recentExpenses] = await Promise.all([
    Expense.aggregate([
      { $match: { vehicle: v._id, deletedAt: null } },
      {
        $group: {
          _id: null,
          all: { $sum: '$amount' },
          month: { $sum: { $cond: [{ $gte: ['$date', firstOfMonth] }, '$amount', 0] } },
        },
      },
    ]),
    Expense.find({ vehicle: id, deletedAt: null }).sort({ date: -1, createdAt: -1 }).limit(5).lean(),
  ]);
  const expenseTotals = sums ?? { all: 0, month: 0 };

  const docsByType = (await currentDocuments([v._id])).get(id) ?? {};
  const docRows = Object.entries(DOCUMENT_TYPES).map(([type, t]) => ({
    type,
    label: t.label,
    doc: docsByType[type],
    status: documentStatus(docsByType[type], todayUTC()),
  }));

  const current = history.find((a) => a.current);
  const driverOptions = activeDrivers
    .filter((d) => String(d._id) !== String(current?.driver._id))
    .map((d) => {
      const plate = byDriver.get(String(d._id))?.vehicle?.plate;
      const name = `${d.firstName} ${d.lastName}`;
      return {
        value: String(d._id),
        label: `${name}${plate ? ` — conduit ${plate}` : ' — sans véhicule'}`,
        warning: plate && `${name} conduit actuellement ${plate}.`,
      };
    });

  return (
    <>
      <Link href="/vehicules" className="back">← Véhicules</Link>

      <section className="card fiche-h">
        <div className="id">
          <div className="avatar" aria-hidden="true">{v.brand.slice(0, 1)}</div>
          <div className="stack">
            <h1 className="mono-title">{v.plate}</h1>
            <div className="facts">
              <span><b>{v.brand} {v.model}</b>{v.year && ` · ${v.year}`}</span>
              {v.color && <span>{v.color}</span>}
              <span>Ajouté le <b>{formatDate(v.createdAt)}</b></span>
            </div>
          </div>
        </div>
        <div className="row">
          <Badge tone={status.tone}>{status.label}</Badge>
          {v.status !== 'sorti_du_parc' && <Link href={`/vehicules/${id}/modifier`} className="btn">Modifier</Link>}
        </div>
      </section>

      <div className="kpis">
        <div className="card kpi">
          <span className="sub">Tarif journalier</span>
          <span className="v">{formatFCFA(v.dailyRate)}</span>
        </div>
        <div className="card kpi">
          <span className="sub">Kilométrage</span>
          <span className="v">{formatNumber(v.mileage)} km</span>
        </div>
      </div>

      <section className="card">
        <div className="card-h">
          <h2>Chauffeur</h2>
        </div>
        <div className="pad top-line">
          {current ? (
            <div className="current">
              <div className="stack">
                <Link href={`/chauffeurs/${current.driver._id}`} className="ref">{current.driver.firstName} {current.driver.lastName}</Link>
                <span className="muted small">Depuis le {formatDate(current.startDate)}{current.reason && ` · ${current.reason}`}</span>
              </div>
              <form action={endAssignment.bind(null, String(current._id))}>
                <button type="submit" className="btn">Retirer le chauffeur</button>
              </form>
            </div>
          ) : (
            <p className="muted">Aucun chauffeur affecté.</p>
          )}
          {v.status === 'en_service' ? (
            <>
              <h3 className="h3">{current ? 'Changer de chauffeur' : 'Affecter un chauffeur'}</h3>
              <AssignForm
                fixedName="vehicleId"
                fixedValue={id}
                selectName="driverId"
                selectLabel="Chauffeur (actif)"
                options={driverOptions}
                today={toDateInput(todayUTC())}
                submitLabel="Affecter"
              />
            </>
          ) : (
            v.status !== 'sorti_du_parc' && (
              <p className="muted small">Le véhicule doit être « en service » pour recevoir un nouveau chauffeur.</p>
            )
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-h">
          <h2>Documents</h2>
          <Link href="/documents" className="small">Échéancier</Link>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Expiration</th>
                <th className="num">Reste</th>
                <th>Statut</th>
                <th>Vérifié</th>
                <th><span className="sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {docRows.map((r) => (
                <tr key={r.type}>
                  <td>{r.label}</td>
                  <td className="mono">{r.doc ? (r.doc.expiresAt ? formatDate(r.doc.expiresAt) : 'Sans échéance') : '—'}</td>
                  <td className={`num${r.status.days !== null && r.status.days < 0 ? ' neg' : ''}`}>{daysLabel(r.status.days)}</td>
                  <td><Badge tone={r.status.tone}>{r.status.label}</Badge></td>
                  <td className="small">{r.doc ? <>{formatDate(r.doc.verifiedAt)} <span className="muted">· {r.doc.verifiedBy}</span></> : <span className="muted">—</span>}</td>
                  <td className="actions-cell">
                    {v.status !== 'sorti_du_parc' && (
                      <Link href={`/documents/nouveau?vehicule=${id}&type=${r.type}`} className="btn small-btn">{r.doc ? 'Renouveler' : 'Ajouter'}</Link>
                    )}
                    {r.doc && <Link href={`/documents/${r.doc._id}/modifier`} className="btn small-btn">Corriger</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-h">
          <h2>Dépenses</h2>
          <div className="row">
            <Link href={`/depenses?vehicule=${id}`} className="small">Tout voir</Link>
            {v.status !== 'sorti_du_parc' && <Link href={`/depenses/nouvelle?vehicule=${id}`} className="btn small-btn">Ajouter</Link>}
          </div>
        </div>
        <div className="kpis pad top-line">
          <div className="stack">
            <span className="sub">Ce mois-ci</span>
            <span className="v-sm">{formatFCFA(expenseTotals.month)}</span>
          </div>
          <div className="stack">
            <span className="sub">Depuis l’ajout du véhicule</span>
            <span className="v-sm">{formatFCFA(expenseTotals.all)}</span>
          </div>
        </div>
        {recentExpenses.length > 0 && (
          <div className="scroll">
            <table>
              <tbody>
                {recentExpenses.map((x) => (
                  <tr key={String(x._id)}>
                    <td className="mono">{formatDate(x.date)}</td>
                    <td>{categoryLabel(x.category)}</td>
                    <td className="muted small">{x.description || '—'}</td>
                    <td className="num">{formatNumber(x.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-h"><h2>Historique des affectations</h2></div>
        <AssignmentHistory items={history} side="driver" />
      </section>

      {v.notes && (
        <section className="card pad">
          <h2>Notes</h2>
          <p className="pre">{v.notes}</p>
        </section>
      )}

      <section className="card pad">
        <h2>Statut</h2>
        {transitions.length === 0 ? (
          <p className="muted">Véhicule sorti du parc : son statut ne peut plus changer.</p>
        ) : (
          <form action={changeStatus} className="row">
            {transitions.map((s) => (
              <button key={s} type="submit" name="status" value={s} className="btn">
                Passer « {VEHICLE_STATUS[s].label} »
              </button>
            ))}
          </form>
        )}
        {transitions.includes('sorti_du_parc') && (
          <p className="muted small">« Sorti du parc » est définitif : le véhicule reste dans l'historique, perd son chauffeur et ne peut plus être affecté. En atelier ou immobilisé, il garde son chauffeur.</p>
        )}
      </section>
    </>
  );
}
