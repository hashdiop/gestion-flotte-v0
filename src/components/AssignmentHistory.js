import Link from 'next/link';
import Badge from './Badge';
import { formatDate } from '@/lib/format';
import { addDays } from '@/lib/dates';

// endDate est exclue : on affiche le dernier jour couvert (la veille)
function lastDay(a) {
  if (a.current) return <Badge tone="ok">En cours</Badge>;
  if (a.endDate <= a.startDate) return <span className="muted">Aucun jour</span>;
  return formatDate(addDays(a.endDate, -1));
}

// Historique des affectations ; side = 'vehicle' affiche le véhicule, 'driver' le chauffeur
export default function AssignmentHistory({ items, side }) {
  if (items.length === 0) return <p className="empty-state">Aucune affectation pour l’instant.</p>;
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>{side === 'vehicle' ? 'Véhicule' : 'Chauffeur'}</th>
            <th>Du</th>
            <th>Au</th>
            <th>Motif</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={String(a._id)}>
              <td>
                {side === 'vehicle' ? (
                  <Link href={`/vehicules/${a.vehicle._id}`} className="ref mono">{a.vehicle.plate}</Link>
                ) : (
                  <Link href={`/chauffeurs/${a.driver._id}`} className="ref">{a.driver.firstName} {a.driver.lastName}</Link>
                )}
              </td>
              <td className="mono">{formatDate(a.startDate)}</td>
              <td className="mono">{lastDay(a)}</td>
              <td className="muted small">{a.reason || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
