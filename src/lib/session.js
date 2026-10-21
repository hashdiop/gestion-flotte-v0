import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from './session-token';

export async function createSession(user) {
  const token = await signSession({ uid: String(user._id), name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

// À appeler en tête de chaque action serveur : une action reste appelable par POST direct
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error('Non connecté');
  return session;
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
