'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import Field from './Field';

export default function VehicleForm({ action, initial = {}, submitLabel, cancelHref }) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const inv = (k) => (e[k] ? true : undefined);

  return (
    <form action={formAction} className="card pad form" noValidate>
      {e.form && <p className="form-error" role="alert">{e.form}</p>}
      <div className="form-grid">
        <Field label="Immatriculation" error={e.plate}>
          <input name="plate" defaultValue={v.plate} placeholder="DK-1234-AB" autoCapitalize="characters" aria-invalid={inv('plate')} />
        </Field>
        <Field label="Tarif journalier (FCFA)" hint="Montant dû par le chauffeur chaque jour ouvré" error={e.dailyRate}>
          <input name="dailyRate" inputMode="numeric" defaultValue={v.dailyRate} placeholder="15000" aria-invalid={inv('dailyRate')} />
        </Field>
        <Field label="Marque" error={e.brand}>
          <input name="brand" defaultValue={v.brand} placeholder="Toyota" aria-invalid={inv('brand')} />
        </Field>
        <Field label="Modèle" error={e.model}>
          <input name="model" defaultValue={v.model} placeholder="Corolla" aria-invalid={inv('model')} />
        </Field>
        <Field label="Année" error={e.year}>
          <input name="year" inputMode="numeric" defaultValue={v.year} aria-invalid={inv('year')} />
        </Field>
        <Field label="Couleur">
          <input name="color" defaultValue={v.color} />
        </Field>
        <Field label="Kilométrage" error={e.mileage}>
          <input name="mileage" inputMode="numeric" defaultValue={v.mileage} aria-invalid={inv('mileage')} />
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
