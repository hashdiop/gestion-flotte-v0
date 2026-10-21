import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import FilterTabs from '@/components/FilterTabs';
import { connectDB } from '@/lib/db';
import { currentAssignmentsBy } from '@/lib/assignments';
import { formatDate } from '@/lib/format';
import Driver from '@/models/Driver';

export const metadata = { title: 'Chauffeurs · Gestion de flotte' };

const FILTERS = { actifs: { active: true }, inactifs: { active: false } };

export default async function DriversPage({ searchParams }) {
  const { etat } = await searchParams;
  const current = FILTERS[etat] ? etat : 'actifs';

  await connectDB();
  const [drivers, activeCount, inactiveCount, byDriver] = await Promise.all([
    Driver.find(FILTERS[current]).sort({ lastName: 1, firstName: 1 }).lean(),
    Driver.countDocuments({ active: true }),
    Driver.countDocuments({ active: false }),
    currentAssignmentsBy('driver'),
  ]);

  return (
    <>
      <PageHeader title="Chauffeurs" sub={`${activeCount} chauffeur${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}`}>
        <Link href="/chauffeurs/nouveau" className="btn primary">Ajouter un chauffeur</Link>
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
          <p className="empty-state">{current === 'actifs' ? 'Aucun chauffeur actif.' : 'Aucun chauffeur désactivé.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Chauffeur</th>
                <th>Véhicule</th>
                <th>Téléphone</th>
                <th>Arrivée</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={String(d._id)}>
                  <td><Link href={`/chauffeurs/${d._id}`} className="ref">{d.firstName} {d.lastName}</Link></td>
                  <td>
                    {(() => {
                      const v = byDriver.get(String(d._id))?.vehicle;
                      return v ? (
                        <Link href={`/vehicules/${v._id}`} className="ref mono">{v.plate}</Link>
                      ) : (
                        <span className="muted">—</span>
                      );
                    })()}
                  </td>
                  <td className="mono">{d.phone}</td>
                  <td className="mono">{formatDate(d.hiredAt)}</td>
                  <td>{d.active ? <Badge tone="ok">Actif</Badge> : <Badge tone="neu">Désactivé</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
