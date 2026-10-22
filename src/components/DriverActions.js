import Link from 'next/link';
import { Banknote, Car, Eye, Pencil, UserCheck, UserX } from 'lucide-react';
import RowMenu from './RowMenu';
import ConfirmButton from './ConfirmButton';
import { setDriverActive } from '@/actions/drivers';

// Actions rapides d'un chauffeur, depuis la liste : crayon visible, le reste sous ⋮
export default function DriverActions({ driver, hasVehicle, back = '/chauffeurs' }) {
  const id = String(driver._id);
  const name = `${driver.firstName} ${driver.lastName}`;
  const toggle = setDriverActive.bind(null, id);
  const editHref = `/chauffeurs/${id}/modifier?next=${encodeURIComponent(back)}`;

  return (
    <span className="row-actions">
      <Link href={editHref} className="btn icon ghost" aria-label={`Modifier ${name}`} title="Modifier">
        <Pencil size={17} aria-hidden="true" />
      </Link>
      <RowMenu label={`Actions pour ${name}`}>
        <Link href={`/chauffeurs/${id}`} role="menuitem"><Eye size={16} aria-hidden="true" />Voir la fiche</Link>
        <Link href={editHref} role="menuitem"><Pencil size={16} aria-hidden="true" />Modifier les infos</Link>
        {driver.active && (
          <>
            <Link href={`/chauffeurs/${id}#vehicule`} role="menuitem">
              <Car size={16} aria-hidden="true" />{hasVehicle ? 'Changer de véhicule' : 'Affecter un véhicule'}
            </Link>
            {hasVehicle && (
              <Link href="/versements" role="menuitem"><Banknote size={16} aria-hidden="true" />Saisir le versement du jour</Link>
            )}
          </>
        )}
        <div className="sep" />
        <form action={toggle}>
          <input type="hidden" name="active" value={driver.active ? 'false' : 'true'} />
          {driver.active ? (
            <ConfirmButton
              role="menuitem"
              className="danger-item"
              message={`Désactiver ${name} ?${hasVehicle ? ' Son véhicule lui sera retiré ce soir.' : ''} Son historique est conservé.`}
            >
              <UserX size={16} aria-hidden="true" />Désactiver le chauffeur
            </ConfirmButton>
          ) : (
            <button type="submit" role="menuitem"><UserCheck size={16} aria-hidden="true" />Réactiver le chauffeur</button>
          )}
        </form>
      </RowMenu>
    </span>
  );
}
