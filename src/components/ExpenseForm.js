'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState } from 'react';
import { EXPENSE_CATEGORIES, EXPENSE_TYPES } from '@/lib/expense-categories';
import Field from './Field';

// vehicles : [{ value, label }]
export default function ExpenseForm({ action, initial = {}, vehicles, today, submitLabel, cancelHref, deleteAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState(initial.type || 'vehicule');
  const [category, setCategory] = useState(initial.category || '');
  const e = state.errors ?? {};
  const inv = (k) => (e[k] ? true : undefined);
  const categories = EXPENSE_CATEGORIES[type];

  // Envoi manuel : <form action> viderait le formulaire même en cas d'erreur
  function onSubmit(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => formAction(fd));
  }

  function changeType(t) {
    setType(t);
    // La catégorie dépend du type
    if (!EXPENSE_CATEGORIES[t][category]) setCategory('');
  }

  return (
    <form onSubmit={onSubmit} className="card pad form" noValidate>
      {e.form && <p className="form-error" role="alert">{e.form}</p>}

      <fieldset className="field radios">
        <legend>Type de dépense</legend>
        <div className="row">
          {Object.entries(EXPENSE_TYPES).map(([k, label]) => (
            <label key={k} className="radio">
              <input type="radio" name="type" value={k} checked={type === k} onChange={() => changeType(k)} />
              {k === 'vehicule' ? 'Liée à un véhicule' : 'Dépense diverse (entreprise)'}
            </label>
          ))}
        </div>
        {e.type && <small className="field-error">{e.type}</small>}
      </fieldset>

      <div className="form-grid">
        {type === 'vehicule' && (
          <Field label="Véhicule" error={e.vehicle}>
            <select name="vehicle" defaultValue={initial.vehicle || ''} aria-invalid={inv('vehicle')}>
              <option value="">Choisir…</option>
              {vehicles.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Catégorie" error={e.category}>
          <select name="category" value={category} onChange={(ev) => setCategory(ev.target.value)} aria-invalid={inv('category')}>
            <option value="">Choisir…</option>
            {Object.entries(categories).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Montant (FCFA)" error={e.amount}>
          <input name="amount" inputMode="numeric" defaultValue={initial.amount} aria-invalid={inv('amount')} />
        </Field>
        <Field label="Date" error={e.date}>
          <input name="date" type="date" defaultValue={initial.date || today} max={today} aria-invalid={inv('date')} />
        </Field>
        <Field label="Description" hint="Ex. : remplacement embrayage, loyer d’octobre…" wide>
          <input name="description" defaultValue={initial.description} autoComplete="off" />
        </Field>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Enregistrement…' : submitLabel}
        </button>
        <Link href={cancelHref} className="btn">Annuler</Link>
        {deleteAction && (
          <button
            type="button"
            className="btn danger"
            disabled={pending}
            onClick={() => {
              if (confirm('Supprimer cette dépense ? Elle disparaîtra des listes et des totaux.')) startTransition(() => deleteAction());
            }}
          >
            Supprimer
          </button>
        )}
      </div>
    </form>
  );
}
