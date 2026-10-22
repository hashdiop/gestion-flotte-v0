'use client';

import { startTransition, useActionState, useState } from 'react';
import { Copy, KeyRound, UserCheck, UserPlus, UserX } from 'lucide-react';
import { changeUserRole, createUser, resetUserPassword, setUserActive } from '@/actions/users';
import { ROLES } from '@/lib/roles';
import Field from './Field';

// Mot de passe provisoire affiché une seule fois, à transmettre au titulaire du compte
function TempPassword({ who, password }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="temp-pass" role="status">
      <KeyRound size={18} aria-hidden="true" />
      <span className="temp-pass-txt">
        Mot de passe provisoire de <b>{who}</b> : <code data-testid="temp-password">{password}</code>
        <small>Affiché une seule fois. Il devra être changé à la première connexion.</small>
      </span>
      <button
        type="button"
        className="btn icon ghost"
        aria-label="Copier"
        title={copied ? 'Copié' : 'Copier'}
        onClick={() => navigator.clipboard?.writeText(password).then(() => setCopied(true))}
      >
        <Copy size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, {});
  const e = state.errors ?? {};

  function onSubmit(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <>
      {state.created && <TempPassword who={`${state.created.name} (${state.created.email})`} password={state.created.password} />}
      {/* key : formulaire vidé après chaque création réussie */}
      <form onSubmit={onSubmit} className="form" noValidate key={state.ts ?? 0}>
        <div className="form-grid">
          <Field label="Nom" error={e.name}>
            <input name="name" autoComplete="off" aria-invalid={e.name ? true : undefined} />
          </Field>
          <Field label="E-mail" error={e.email}>
            <input name="email" type="email" autoComplete="off" aria-invalid={e.email ? true : undefined} />
          </Field>
          <Field label="Rôle" error={e.role}>
            <select name="role" defaultValue="agent" aria-invalid={e.role ? true : undefined}>
              {Object.entries(ROLES).map(([k, r]) => (
                <option key={k} value={k}>{r.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={pending}>
            <UserPlus size={16} aria-hidden="true" />
            {pending ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </>
  );
}

// Actions d'une ligne de compte : rôle, mot de passe provisoire, activation
export function UserRowActions({ user, isSelf }) {
  const [roleState, roleAction, rolePending] = useActionState(changeUserRole.bind(null, user.id), {});
  const [reset, setReset] = useState(null);
  const [resetError, setResetError] = useState('');
  const [busy, setBusy] = useState(false);

  function onRole(ev) {
    const fd = new FormData();
    fd.set('role', ev.target.value);
    startTransition(() => roleAction(fd));
  }

  async function onReset() {
    if (!window.confirm(`Générer un nouveau mot de passe provisoire pour ${user.name} ? Ses sessions ouvertes seront fermées.`)) return;
    setBusy(true);
    const res = await resetUserPassword(user.id);
    setBusy(false);
    if (res?.reset) setReset(res.reset);
    else setResetError(res?.error ?? 'Échec');
  }

  async function onToggle() {
    const verb = user.active ? 'Désactiver' : 'Réactiver';
    if (!window.confirm(`${verb} le compte de ${user.name} ?`)) return;
    const fd = new FormData();
    fd.set('active', user.active ? 'false' : 'true');
    setBusy(true);
    const res = await setUserActive(user.id, fd);
    setBusy(false);
    setResetError(res?.error ?? '');
  }

  // La clé du sélecteur de rôle le remonte sur le rôle réel si le changement est refusé
  return (
    <div className="user-actions">
      <select
        key={`${user.role}-${roleState.error ?? ''}`}
        aria-label={`Rôle de ${user.name}`}
        defaultValue={user.role}
        onChange={onRole}
        disabled={isSelf || rolePending || !user.active}
        title={isSelf ? 'Tu ne peux pas changer ton propre rôle' : undefined}
      >
        {Object.entries(ROLES).map(([k, r]) => (
          <option key={k} value={k}>{r.label}</option>
        ))}
      </select>
      <button type="button" className="btn icon ghost" onClick={onReset} disabled={busy || !user.active} aria-label={`Réinitialiser le mot de passe de ${user.name}`} title="Nouveau mot de passe provisoire">
        <KeyRound size={17} aria-hidden="true" />
      </button>
      {!isSelf && (
        <button
          type="button"
          className={`btn icon ghost${user.active ? ' danger-icon' : ''}`}
          onClick={onToggle}
          disabled={busy}
          aria-label={`${user.active ? 'Désactiver' : 'Réactiver'} ${user.name}`}
          title={user.active ? 'Désactiver' : 'Réactiver'}
        >
          {user.active ? <UserX size={17} aria-hidden="true" /> : <UserCheck size={17} aria-hidden="true" />}
        </button>
      )}
      {roleState.error && <p className="form-error fullrow" role="alert">{roleState.error}</p>}
      {resetError && <p className="form-error fullrow" role="alert">{resetError}</p>}
      {reset && <div className="fullrow"><TempPassword who={reset.name} password={reset.password} /></div>}
    </div>
  );
}
