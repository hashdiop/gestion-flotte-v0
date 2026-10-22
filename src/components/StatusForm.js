'use client';

import { startTransition, useActionState } from 'react';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';
import Field from './Field';

// Changement de statut daté, depuis la fiche véhicule.
// transitions : statuts autorisés depuis le statut actuel
export default function StatusForm({ action, transitions, today, plate }) {
  const [state, formAction, pending] = useActionState(action, {});

  function onSubmit(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget, ev.nativeEvent.submitter);
    if (fd.get('status') === 'sorti_du_parc' && !window.confirm(`Sortir ${plate} du parc ? C'est définitif.`)) return;
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="form" noValidate>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div className="form-grid">
        <Field label="À partir du" hint="Date réelle du changement : les journées en atelier ou immobilisé ne sont pas dues.">
          {/* Pas d'attribut min : le navigateur bloquerait l'envoi sans message ; le serveur explique le refus */}
          <input type="date" name="date" defaultValue={today} max={today} />
        </Field>
        <Field label="Motif">
          <input name="reason" placeholder="Ex. : embrayage, accident, visite technique expirée…" autoComplete="off" />
        </Field>
      </div>
      <div className="row">
        {transitions.map((s) => (
          <button key={s} type="submit" name="status" value={s} className={`btn${s === 'sorti_du_parc' ? ' danger-btn' : ''}`} disabled={pending}>
            Passer « {VEHICLE_STATUS[s].label} »
          </button>
        ))}
      </div>
    </form>
  );
}
