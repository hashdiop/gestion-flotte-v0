import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session-token';

// Filtre rapide avant chaque page : sans session valide, on renvoie vers /login.
// Le layout des pages protégées revérifie la session côté serveur.
export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = pathname === '/login';

  if (!session && !onLogin) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  if (session && onLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Tout sauf les fichiers statiques de Next et la route de santé
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
