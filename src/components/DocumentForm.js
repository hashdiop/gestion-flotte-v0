'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState } from 'react';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import Field from './Field';

// vehicles : [{ value, label }] ; next : page où revenir après l'enregistrement
export default function DocumentForm({ action, initial = {}, vehicles, today, next, submitLabel, cancelHref, deleteAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState(initial.type || '');
  const e = state.errors ?? {};
  const inv = (k) => (e[k] ? true : undefined);
  const expires = DOCUMENT_TYPES[type]?.expires ?? true;

  // Envoi manuel : <form action> viderait le formulaire même en cas d'erreur
  function onSubmit(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="card pad form" noValidate>
      <input type="hidden" name="next" value={next} />
      {e.form && <p className="form-error" role="alert">{e.form}</p>}
      <div className="form-grid">
        <Field label="Véhicule" error={e.vehicle}>
          <select name="vehicle" defaultValue={initial.vehicle || ''} aria-invalid={inv('vehicle')}>
            <option value="">Choisir…</option>
            {vehicles.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Document" error={e.type}>
          <select name="type" value={type} onChange={(ev) => setType(ev.target.value)} aria-invalid={inv('type')}>
            <option value="">Choisir…</option>
            {Object.entries(DOCUMENT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Numéro" hint="Facultatif : n° de police, de carte grise…">
          <input name="number" defaultValue={initial.number} autoComplete="off" />
        </Field>
        {expires ? (
          <Field label="Date d'expiration" error={e.expiresAt}>
            <input name="expiresAt" type="date" defaultValue={initial.expiresAt} aria-invalid={inv('expiresAt')} />
          </Field>
        ) : (
          <Field label="Date d'expiration" hint="La carte grise n’a pas d’échéance.">
            <input type="text" value="Sans échéance" disabled />
          </Field>
        )}
        <Field label="Vérifié le" error={e.verifiedAt}>
          <input name="verifiedAt" type="date" defaultValue={initial.verifiedAt || today} max={today} aria-invalid={inv('verifiedAt')} />
        </Field>
        <Field label="Vérifié par" error={e.verifiedBy}>
          <input name="verifiedBy" defaultValue={initial.verifiedBy} autoComplete="off" aria-invalid={inv('verifiedBy')} />
        </Field>
        <Field label="Notes" hint="Aucune copie du document n’est conservée : seule la vérification est tracée." wide>
          <input name="notes" defaultValue={initial.notes} autoComplete="off" />
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
              if (confirm('Supprimer cette saisie ? À réserver aux erreurs : un document renouvelé s’ajoute plutôt comme un nouveau document.')) {
                startTransition(() => deleteAction());
              }
            }}
          >
            Supprimer
          </button>
        )}
      </div>
    </form>
  );
}
