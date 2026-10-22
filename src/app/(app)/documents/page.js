import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { can } from '@/lib/roles';
import { getSession } from '@/lib/session';
import Kpi from '@/components/Kpi';
import { DOC_ICONS } from '@/components/DocDots';
import { domainVars } from '@/components/domains';
import { CalendarClock, CircleX, FileQuestion, Plus, RefreshCw, TriangleAlert } from 'lucide-react';
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

  const canEdit = can(await getSession(), 'editDocuments');
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
      <PageHeader title="Documents" domain="doc" sub="Papiers administratifs des véhicules : échéances et vérifications. Aucune copie n’est conservée.">
        {canEdit && <Link href="/documents/nouveau?next=/documents" className="btn primary"><Plus size={18} aria-hidden="true" />Ajouter un document</Link>}
      </PageHeader>

      <div className="kpis">
        <Kpi icon={CircleX} color="bad" label="Expirés" value={count('expired')} />
        <Kpi icon={TriangleAlert} color="bad" label={`Critiques ≤ ${ALERT_DAYS.critical} j`} value={count('critical')} />
        <Kpi icon={CalendarClock} color="warn" label={`À renouveler ≤ ${ALERT_DAYS.soon} j`} value={count('soon')} />
        <Kpi icon={FileQuestion} color="neu" label="Manquants" value={count('missing')} />
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
          <p className="empty-state">Tout est à jour</p>
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
                  <td>
                    <span className="ent">
                      <span className="dom sm" style={domainVars('doc')} aria-hidden="true">{(() => { const I = DOC_ICONS[r.type]; return <I size={15} />; })()}</span>
                      <span>{r.typeLabel}</span>
                    </span>
                  </td>
                  <td>
                    <span className="ent-txt">
                      <Link href={`/vehicules/${r.vehicle._id}`} className="plate">{r.vehicle.plate}</Link>
                      <span className="muted">{r.vehicle.brand} {r.vehicle.model}</span>
                    </span>
                  </td>
                  <td className="mono">{r.doc ? (r.doc.expiresAt ? formatDate(r.doc.expiresAt) : 'Sans échéance') : '—'}</td>
                  <td className={`num${r.status.days !== null && r.status.days < 0 ? ' neg' : ''}`}>{daysLabel(r.status.days)}</td>
                  <td><Badge tone={r.status.tone}>{r.status.label}</Badge></td>
                  <td className="small">
                    {r.doc ? (
                      <>
                        <span title={`Vérifié par ${r.doc.verifiedBy}`}>{formatDate(r.doc.verifiedAt)}</span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    {canEdit && <Link
                      href={`/documents/nouveau?vehicule=${r.vehicle._id}&type=${r.type}&next=/documents`}
                      className={`btn icon${r.doc ? ' ghost' : ' primary'}`}
                      aria-label={r.doc ? 'Renouveler' : 'Ajouter'}
                      title={r.doc ? 'Renouveler' : 'Ajouter'}
                    >
                      {r.doc ? <RefreshCw size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
                    </Link>}
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
