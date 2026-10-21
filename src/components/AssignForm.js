'use client';

import { startTransition, useActionState, useState } from 'react';
import { assignVehicle } from '@/actions/assignments';
import Field from './Field';

// Formulaire d'affectation, depuis la fiche d'un chauffeur (on choisit un véhicule)
// ou depuis celle d'un véhicule (on choisit un chauffeur).
// options : [{ value, label, warning }] — warning = affectation existante qui sera close si on choisit cette option
export default function AssignForm({ fixedName, fixedValue, selectName, selectLabel, options, today, submitLabel }) {
  const [state, formAction, pending] = useActionState(assignVehicle, {});
  return <AssignFormInner key={state.ts ?? 0} {...{ state, formAction, pending, fixedName, fixedValue, selectName, selectLabel, options, today, submitLabel }} />;
}

// Remonté après chaque succès (key) pour repartir d'un formulaire vide
function AssignFormInner({ state, formAction, pending, fixedName, fixedValue, selectName, selectLabel, options, today, submitLabel }) {
  const [selected, setSelected] = useState('');
  const e = state.errors ?? {};
  const warning = options.find((o) => o.value === selected)?.warning;

  if (options.length === 0) {
    return <p className="muted small">Aucun choix disponible pour l’instant.</p>;
  }

  // Envoi manuel plutôt que <form action> : React viderait le formulaire même en cas d'erreur,
  // y compris le choix fait dans la liste. Après un succès, la key remonte un formulaire vide.
  function onSubmit(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <input type="hidden" name={fixedName} value={fixedValue} />
      {state.success && <p className="form-ok" role="status">{state.success}</p>}
      {e.form && <p className="form-error" role="alert">{e.form}</p>}
      <div className="form-grid">
        <Field label={selectLabel} error={e[selectName]}>
          <select name={selectName} value={selected} onChange={(ev) => setSelected(ev.target.value)} aria-invalid={e[selectName] ? true : undefined}>
            <option value="">Choisir…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="À partir du" error={e.startDate}>
          <input type="date" name="startDate" defaultValue={today} max={today} aria-invalid={e.startDate ? true : undefined} />
        </Field>
        <Field label="Motif" hint="Facultatif : attitré, temporaire pendant une réparation…" wide>
          <input name="reason" autoComplete="off" />
        </Field>
      </div>
      {warning && <p className="form-warn">{warning} Cette affectation sera close à la date choisie.</p>}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={pending || !selected}>
          {pending ? 'Enregistrement…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
