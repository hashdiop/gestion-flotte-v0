import Link from 'next/link';
import { Car, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import FilterTabs from '@/components/FilterTabs';
import DocDots from '@/components/DocDots';
import VehicleActions from '@/components/VehicleActions';
import VehicleStatusBadge from '@/components/VehicleStatusBadge';
import { domainVars } from '@/components/domains';
import { connectDB } from '@/lib/db';
import { currentAssignmentsBy } from '@/lib/assignments';
import { todayUTC } from '@/lib/dates';
import { currentDocuments } from '@/lib/documents';
import { formatNumber } from '@/lib/format';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';
import Vehicle from '@/models/Vehicle';

export const metadata = { title: 'Véhicules · Gestion de flotte' };

const initialsOf = (d) => `${d.firstName[0] ?? ''}${d.lastName[0] ?? ''}`.toUpperCase();

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
      <PageHeader title="Véhicules" domain="veh" sub={`${activeCount} véhicule${activeCount > 1 ? 's' : ''} dans le parc actif`}>
        <Link href="/vehicules/nouveau" className="btn primary"><Plus size={18} aria-hidden="true" />Ajouter un véhicule</Link>
      </PageHeader>

      <FilterTabs basePath="/vehicules" param="statut" current={current} options={tabs} label="Filtrer par statut" />

      <div className="card scroll">
        {vehicles.length === 0 ? (
          <p className="empty-state">Aucun véhicule ici</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Véhicule</th>
                <th>Chauffeur</th>
                <th className="num">Tarif / jour</th>
                <th>Statut</th>
                <th>Documents</th>
                <th><span className="sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const d = byVehicle.get(String(v._id))?.driver;
                const out = v.status === 'sorti_du_parc';
                return (
                  <tr key={String(v._id)}>
                    <td>
                      <span className="ent">
                        <span className="dom sm" style={domainVars('veh')} aria-hidden="true"><Car size={16} /></span>
                        <span className="ent-txt">
                          <Link href={`/vehicules/${v._id}`} className="plate">{v.plate}</Link>
                          <span className="muted">{v.brand} {v.model}{v.year ? ` · ${v.year}` : ''} · {formatNumber(v.mileage)} km</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      {d ? (
                        <span className="ent">
                          <span className="av" aria-hidden="true">{initialsOf(d)}</span>
                          <Link href={`/chauffeurs/${d._id}`} className="ref">{d.firstName} {d.lastName}</Link>
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">{formatNumber(v.dailyRate)}</td>
                    <td><VehicleStatusBadge status={v.status} /></td>
                    <td>{out ? <span className="muted">—</span> : <DocDots docsByType={docs.get(String(v._id))} today={today} />}</td>
                    <td className="actions-cell">
                      <VehicleActions vehicle={v} back={current ? `/vehicules?statut=${current}` : '/vehicules'} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
