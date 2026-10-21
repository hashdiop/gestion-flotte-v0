import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import FilterTabs from '@/components/FilterTabs';
import { connectDB } from '@/lib/db';
import { currentAssignmentsBy } from '@/lib/assignments';
import { todayUTC } from '@/lib/dates';
import { currentDocuments, vehicleDocumentSummary } from '@/lib/documents';
import { formatNumber } from '@/lib/format';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';
import Vehicle from '@/models/Vehicle';

export const metadata = { title: 'Véhicules · Gestion de flotte' };

export default async function VehiclesPage({ searchParams }) {
  const { statut } = await searchParams;
  const current = VEHICLE_STATUS[statut] ? statut : '';

  await connectDB();
  // Par défaut, le parc actif : tout sauf les véhicules sortis du parc
  const filter = current ? { status: current } : { status: { $ne: 'sorti_du_parc' } };
  const [vehicles, counts, byVehicle, docs] = await Promise.all([
    Vehicle.find(filter).sort({ plate: 1 }).lean(),
    Vehicle.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    currentAssignmentsBy('vehicle'),
    currentDocuments(),
  ]);
  const today = todayUTC();
  const count = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const activeCount = counts.filter((c) => c._id !== 'sorti_du_parc').reduce((s, c) => s + c.n, 0);

  const tabs = [
    { value: '', label: 'Parc actif', count: activeCount },
    ...Object.entries(VEHICLE_STATUS).map(([value, s]) => ({ value, label: s.label, count: count[value] ?? 0 })),
  ];

  return (
    <>
      <PageHeader title="Véhicules" sub={`${activeCount} véhicule${activeCount > 1 ? 's' : ''} dans le parc actif`}>
        <Link href="/vehicules/nouveau" className="btn primary">Ajouter un véhicule</Link>
      </PageHeader>

      <FilterTabs basePath="/vehicules" param="statut" current={current} options={tabs} label="Filtrer par statut" />

      <div className="card scroll">
        {vehicles.length === 0 ? (
          <p className="empty-state">Aucun véhicule dans cette catégorie.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Immatriculation</th>
                <th>Véhicule</th>
                <th>Chauffeur</th>
                <th className="num">Tarif / jour</th>
                <th className="num">Kilométrage</th>
                <th>Statut</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={String(v._id)}>
                  <td className="mono"><Link href={`/vehicules/${v._id}`} className="ref">{v.plate}</Link></td>
                  <td>
                    {v.brand} {v.model}
                    {v.year && <span className="muted small"> · {v.year}</span>}
                  </td>
                  <td>
                    {(() => {
                      const d = byVehicle.get(String(v._id))?.driver;
                      return d ? (
                        <Link href={`/chauffeurs/${d._id}`} className="ref">{d.firstName} {d.lastName}</Link>
                      ) : (
                        <span className="muted">—</span>
                      );
                    })()}
                  </td>
                  <td className="num">{formatNumber(v.dailyRate)}</td>
                  <td className="num">{formatNumber(v.mileage)} km</td>
                  <td><Badge tone={VEHICLE_STATUS[v.status].tone}>{VEHICLE_STATUS[v.status].label}</Badge></td>
                  <td>
                    {v.status === 'sorti_du_parc' ? (
                      <span className="muted">—</span>
                    ) : (
                      (() => {
                        const s = vehicleDocumentSummary(docs.get(String(v._id)), today);
                        return <Badge tone={s.tone}>{s.label}</Badge>;
                      })()
                    )}
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
