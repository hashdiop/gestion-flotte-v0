'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import Field from './Field';

export default function DriverForm({ action, initial = {}, submitLabel, cancelHref }) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const inv = (k) => (e[k] ? true : undefined);

  return (
    <form action={formAction} className="card pad form" noValidate>
      {e.form && <p className="form-error" role="alert">{e.form}</p>}
      <div className="form-grid">
        <Field label="Prénom" error={e.firstName}>
          <input name="firstName" defaultValue={v.firstName} autoComplete="off" aria-invalid={inv('firstName')} />
        </Field>
        <Field label="Nom" error={e.lastName}>
          <input name="lastName" defaultValue={v.lastName} autoComplete="off" aria-invalid={inv('lastName')} />
        </Field>
        <Field label="Téléphone" error={e.phone}>
          <input name="phone" type="tel" defaultValue={v.phone} placeholder="77 123 45 67" autoComplete="off" aria-invalid={inv('phone')} />
        </Field>
        <Field label="Date d'arrivée" error={e.hiredAt}>
          <input name="hiredAt" type="date" defaultValue={v.hiredAt} aria-invalid={inv('hiredAt')} />
        </Field>
        <Field label="Adresse" wide>
          <input name="address" defaultValue={v.address} autoComplete="off" />
        </Field>
        <Field label="Notes" wide>
          <textarea name="notes" rows={3} defaultValue={v.notes} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Enregistrement…' : submitLabel}
        </button>
        <Link href={cancelHref} className="btn">Annuler</Link>
      </div>
    </form>
  );
}
