import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import FilterTabs from '@/components/FilterTabs';
import { connectDB } from '@/lib/db';
import { todayUTC } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { ALERT_DAYS, DOCUMENT_TYPES } from '@/lib/document-types';
import { currentDocuments, daysLabel, documentStatus, needsAction } from '@/lib/documents';
import Vehicle from '@/models/Vehicle';

export const metadata = { title: 'Documents · Gestion de flotte' };

export default async function DocumentsPage({ searchParams }) {
  const { vue } = await searchParams;
  const all = vue === 'tous';
  const today = todayUTC();

  await connectDB();
  // Les véhicules sortis du parc ne sont plus suivis
  const vehicles = await Vehicle.find({ status: { $ne: 'sorti_du_parc' } }).sort({ plate: 1 }).lean();
  const docs = await currentDocuments(vehicles.map((v) => v._id));

  // Une ligne par véhicule et par type de document exigé, présent ou non
  const rows = vehicles.flatMap((v) =>
    Object.entries(DOCUMENT_TYPES).map(([type, t]) => {
      const doc = docs.get(String(v._id))?.[type];
      return { vehicle: v, type, typeLabel: t.label, doc, status: documentStatus(doc, today) };
    })
  );
  const count = (key) => rows.filter((r) => r.status.key === key).length;
  const toHandle = rows.filter((r) => needsAction(r.status));
  const shown = (all ? rows : toHandle).sort(
    (a, b) => a.status.rank - b.status.rank || (a.status.days ?? 1e9) - (b.status.days ?? 1e9) || a.vehicle.plate.localeCompare(b.vehicle.plate)
  );

  return (
    <>
      <PageHeader title="Documents" sub="Papiers administratifs des véhicules : échéances et vérifications">
        <Link href="/documents/nouveau?next=/documents" className="btn primary">Ajouter un document</Link>
      </PageHeader>

      <div className="kpis">
        <div className="card kpi">
          <span className="sub">Expirés</span>
          <span className={`v${count('expired') ? ' neg' : ''}`}>{count('expired')}</span>
        </div>
        <div className="card kpi">
          <span className="sub">Critiques (≤ {ALERT_DAYS.critical} j)</span>
          <span className={`v${count('critical') ? ' neg' : ''}`}>{count('critical')}</span>
        </div>
        <div className="card kpi">
          <span className="sub">À renouveler (≤ {ALERT_DAYS.soon} j)</span>
          <span className="v">{count('soon')}</span>
        </div>
        <div className="card kpi">
          <span className="sub">Manquants</span>
          <span className={`v${count('missing') ? ' neg' : ''}`}>{count('missing')}</span>
        </div>
      </div>

      <FilterTabs
        basePath="/documents"
        param="vue"
        current={all ? 'tous' : ''}
        label="Filtrer"
        options={[
          { value: '', label: 'À traiter', count: toHandle.length },
          { value: 'tous', label: 'Tous', count: rows.length },
        ]}
      />

      <div className="card scroll">
        {shown.length === 0 ? (
          <p className="empty-state">Tous les documents sont à jour.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Véhicule</th>
                <th>Expiration</th>
                <th className="num">Reste</th>
                <th>Statut</th>
                <th>Vérifié</th>
                <th><span className="sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={`${r.vehicle._id}-${r.type}`}>
                  <td>{r.typeLabel}</td>
                  <td>
                    <Link href={`/vehicules/${r.vehicle._id}`} className="ref mono">{r.vehicle.plate}</Link>
                    <div className="muted small">{r.vehicle.brand} {r.vehicle.model}</div>
                  </td>
                  <td className="mono">{r.doc ? (r.doc.expiresAt ? formatDate(r.doc.expiresAt) : 'Sans échéance') : '—'}</td>
                  <td className={`num${r.status.days !== null && r.status.days < 0 ? ' neg' : ''}`}>{daysLabel(r.status.days)}</td>
                  <td><Badge tone={r.status.tone}>{r.status.label}</Badge></td>
                  <td className="small">
                    {r.doc ? (
                      <>
                        {formatDate(r.doc.verifiedAt)}
                        <div className="muted">{r.doc.verifiedBy}</div>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <Link href={`/documents/nouveau?vehicule=${r.vehicle._id}&type=${r.type}&next=/documents`} className="btn small-btn">
                      {r.doc ? 'Renouveler' : 'Ajouter'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
