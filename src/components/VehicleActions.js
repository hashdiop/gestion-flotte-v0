import Link from 'next/link';
import { Archive, Ban, CircleCheck, Eye, FileCheck, Pencil, Receipt, UserPlus, Wrench } from 'lucide-react';
import RowMenu from './RowMenu';
import ConfirmButton from './ConfirmButton';
import { setVehicleStatus } from '@/actions/vehicles';
import { VEHICLE_STATUS, VEHICLE_TRANSITIONS } from '@/lib/vehicle-status';

const STATUS_ICONS = { en_service: CircleCheck, en_atelier: Wrench, immobilise: Ban, sorti_du_parc: Archive };

// Actions rapides d'un véhicule, depuis la liste : crayon visible, le reste sous ⋮
export default function VehicleActions({ vehicle, back = '/vehicules' }) {
  const id = String(vehicle._id);
  const out = vehicle.status === 'sorti_du_parc';
  const changeStatus = setVehicleStatus.bind(null, id);
  const transitions = VEHICLE_TRANSITIONS[vehicle.status];
  const editHref = `/vehicules/${id}/modifier?next=${encodeURIComponent(back)}`;

  return (
    <span className="row-actions">
      {!out && (
        <Link href={editHref} className="btn icon ghost" aria-label={`Modifier ${vehicle.plate}`} title="Modifier">
          <Pencil size={17} aria-hidden="true" />
        </Link>
      )}
      <RowMenu label={`Actions pour ${vehicle.plate}`}>
        <Link href={`/vehicules/${id}`} role="menuitem"><Eye size={16} aria-hidden="true" />Voir la fiche</Link>
        {!out && (
          <>
            <Link href={editHref} role="menuitem"><Pencil size={16} aria-hidden="true" />Modifier les infos</Link>
            <Link href={`/vehicules/${id}#chauffeur`} role="menuitem"><UserPlus size={16} aria-hidden="true" />Affecter un chauffeur</Link>
            <Link href={`/depenses/nouvelle?vehicule=${id}`} role="menuitem"><Receipt size={16} aria-hidden="true" />Ajouter une dépense</Link>
            <Link href={`/vehicules/${id}#documents`} role="menuitem"><FileCheck size={16} aria-hidden="true" />Documents</Link>
          </>
        )}
        {transitions.length > 0 && (
          <>
            <div className="sep" />
            <div className="grp-label">Statut</div>
            <form action={changeStatus}>
              {transitions.map((s) => {
                const Icon = STATUS_ICONS[s];
                return s === 'sorti_du_parc' ? (
                  <ConfirmButton
                    key={s}
                    name="status"
                    value={s}
                    role="menuitem"
                    className="danger-item"
                    message={`Sortir ${vehicle.plate} du parc ? C'est définitif : il perd son chauffeur et ne pourra plus être affecté.`}
                  >
                    <Icon size={16} aria-hidden="true" />{VEHICLE_STATUS[s].label}
                  </ConfirmButton>
                ) : (
                  <button key={s} type="submit" name="status" value={s} role="menuitem">
                    <Icon size={16} aria-hidden="true" />{VEHICLE_STATUS[s].label}
                  </button>
                );
              })}
            </form>
          </>
        )}
      </RowMenu>
    </span>
  );
}
