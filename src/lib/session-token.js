// Jeton de session signé (HMAC-SHA256) : <données en base64url>.<signature>
// Uniquement Web Crypto, pour fonctionner aussi bien dans proxy.js que dans les pages.

export const SESSION_COOKIE = 'bt_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours, en secondes

const encoder = new TextEncoder();

function toB64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET manquant dans .env.local');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(payload) {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const body = toB64url(encoder.encode(JSON.stringify({ ...payload, exp })));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(body)));
  return `${body}.${toB64url(sig)}`;
}

// Renvoie les données de session, ou null si le jeton est absent, falsifié ou expiré
export async function verifySession(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const valid = await crypto.subtle.verify('HMAC', await getKey(), fromB64url(sig), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
