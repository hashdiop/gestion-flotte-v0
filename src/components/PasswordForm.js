'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { changeOwnPassword } from '@/actions/auth';
import { MIN_PASSWORD } from '@/lib/roles';
import Field from './Field';

export default function PasswordForm({ forced }) {
  const [state, formAction, pending] = useActionState(changeOwnPassword, {});
  // Mémorisé au premier affichage : après le changement, la page se réaffiche avec forced = false
  const [wasForced] = useState(forced);
  const e = state.errors ?? {};

  function onSubmit(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => formAction(fd));
  }

  // Après un changement obligatoire réussi, on part vers l'accueil (le mode « mot de passe provisoire » est levé)
  useEffect(() => {
    if (state.ok && wasForced) window.location.assign('/');
  }, [state.ok, state.ts, wasForced]);

  return (
    <form onSubmit={onSubmit} className="form" noValidate key={state.ts ?? 0}>
      {state.ok && !wasForced && <p className="form-ok" role="status">Mot de passe changé. Tes autres sessions ont été déconnectées.</p>}
      <div className="form-grid">
        <Field label="Mot de passe actuel" error={e.current}>
          <input type="password" name="current" autoComplete="current-password" aria-invalid={e.current ? true : undefined} />
        </Field>
        <Field label="Nouveau mot de passe" hint={`${MIN_PASSWORD} caractères minimum`} error={e.next}>
          <input type="password" name="next" autoComplete="new-password" aria-invalid={e.next ? true : undefined} />
        </Field>
        <Field label="Confirmer" error={e.confirm}>
          <input type="password" name="confirm" autoComplete="new-password" aria-invalid={e.confirm ? true : undefined} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={pending}>
          <KeyRound size={16} aria-hidden="true" />
          {pending ? 'Enregistrement…' : 'Changer le mot de passe'}
        </button>
      </div>
    </form>
  );
}
