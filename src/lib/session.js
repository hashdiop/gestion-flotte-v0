import { cache } from 'react';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from './session-token';
import { connectDB } from './db';
import { can } from './roles';
import User from '@/models/User';

export async function createSession(user) {
  const token = await signSession({ uid: String(user._id), v: user.sessionVersion ?? 0 });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

// Utilisateur connecté, revérifié en base : un compte désactivé, ou dont le mot de passe / le rôle a changé
// (sessionVersion incrémentée), perd sa session immédiatement. Mis en cache le temps d'une requête.
export const getSession = cache(async () => {
  const token = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!token?.uid) return null;
  await connectDB();
  const user = await User.findById(token.uid).lean().catch(() => null);
  if (!user || !user.active || (user.sessionVersion ?? 0) !== (token.v ?? 0)) return null;
  return {
    uid: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
});

// À appeler en tête de chaque action serveur : une action reste appelable par POST direct.
// permission (facultatif) : voir lib/roles.js
export async function requireSession(permission) {
  const session = await getSession();
  if (!session) throw new Error('Non connecté');
  // Mot de passe provisoire : rien d'autre n'est permis tant qu'il n'est pas changé
  if (session.mustChangePassword && permission !== 'self') throw new Error('Changez d’abord votre mot de passe');
  if (permission && permission !== 'self' && !can(session, permission)) throw new Error('Action non autorisée pour votre rôle');
  return session;
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
