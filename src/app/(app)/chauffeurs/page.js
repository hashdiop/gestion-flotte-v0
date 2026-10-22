import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import FilterTabs from '@/components/FilterTabs';
import DriverActions from '@/components/DriverActions';
import { domainVars } from '@/components/domains';
import { Car, Phone, Plus, UserCheck, UserX } from 'lucide-react';
import { connectDB } from '@/lib/db';
import { currentAssignmentsBy } from '@/lib/assignments';
import { formatDate } from '@/lib/format';
import Driver from '@/models/Driver';
import { can } from '@/lib/roles';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Chauffeurs · Gestion de flotte' };

const FILTERS = { actifs: { active: true }, inactifs: { active: false } };

export default async function DriversPage({ searchParams }) {
  const { etat } = await searchParams;
  const current = FILTERS[etat] ? etat : 'actifs';

  const canEdit = can(await getSession(), 'editFleet');
  await connectDB();
  const [drivers, activeCount, inactiveCount, byDriver] = await Promise.all([
    Driver.find(FILTERS[current]).sort({ lastName: 1, firstName: 1 }).lean(),
    Driver.countDocuments({ active: true }),
    Driver.countDocuments({ active: false }),
    currentAssignmentsBy('driver'),
  ]);

  return (
    <>
      <PageHeader title="Chauffeurs" domain="drv" sub={`${activeCount} chauffeur${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`}>
        {canEdit && <Link href="/chauffeurs/nouveau" className="btn primary"><Plus size={18} aria-hidden="true" />Ajouter un chauffeur</Link>}
      </PageHeader>

      <FilterTabs
        basePath="/chauffeurs"
        param="etat"
        current={current === 'actifs' ? '' : current}
        label="Filtrer par état"
        options={[
          { value: '', label: 'Actifs', count: activeCount },
          { value: 'inactifs', label: 'Désactivés', count: inactiveCount },
        ]}
      />

      <div className="card scroll">
        {drivers.length === 0 ? (
          <p className="empty-state">{current === 'actifs' ? 'Aucun chauffeur actif' : 'Aucun chauffeur désactivé'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Chauffeur</th>
                <th>Véhicule</th>
                <th>Arrivée</th>
                <th>État</th>
                <th><span className="sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const v = byDriver.get(String(d._id))?.vehicle;
                return (
                <tr key={String(d._id)}>
                  <td>
                    <span className="ent">
                      <span className="av" aria-hidden="true">{`${d.firstName[0] ?? ''}${d.lastName[0] ?? ''}`.toUpperCase()}</span>
                      <span className="ent-txt">
                        <Link href={`/chauffeurs/${d._id}`} className="ref">{d.firstName} {d.lastName}</Link>
                        <span className="muted"><Phone size={11} aria-hidden="true" /> <span className="mono">{d.phone}</span></span>
                      </span>
                    </span>
                  </td>
                  <td>
                    {v ? (
                      <span className="ent">
                        <span className="dom sm" style={domainVars('veh')} aria-hidden="true"><Car size={15} /></span>
                        <Link href={`/vehicules/${v._id}`} className="plate">{v.plate}</Link>
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono small">{formatDate(d.hiredAt)}</td>
                  <td>{d.active ? <Badge tone="ok" icon={UserCheck}>Actif</Badge> : <Badge tone="neu" icon={UserX}>Désactivé</Badge>}</td>
                  <td className="actions-cell">
                    <DriverActions
                      driver={d}
                      hasVehicle={byDriver.has(String(d._id))}
                      canEdit={canEdit}
                      back={current === 'actifs' ? '/chauffeurs' : '/chauffeurs?etat=inactifs'}
                    />
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
