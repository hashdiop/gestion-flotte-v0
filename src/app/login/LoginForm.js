'use client';

import { useActionState } from 'react';
import { login } from '@/actions/auth';

export default function LoginForm({ next }) {
  const [state, formAction, pending] = useActionState(login, {});
  return (
    <form action={formAction} className="form">
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>E-mail</span>
        <input type="email" name="email" autoComplete="username" required defaultValue={state.email} />
      </label>
      <label className="field">
        <span>Mot de passe</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button type="submit" className="btn primary" disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
