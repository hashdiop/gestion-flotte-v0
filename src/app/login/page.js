import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';
import { safeNext } from '@/lib/safe-next';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Connexion · Gestion de flotte' };

export default async function LoginPage({ searchParams }) {
  // Déjà connecté avec un compte valide (vérifié en base) : direction l'accueil
  if (await getSession()) redirect('/');
  const { next } = await searchParams;
  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="login-brand">
          <b>FLOTTE</b>
          <span>Banlieu Transport</span>
        </div>
        <div className="pad">
          <h1>Connexion</h1>
          <LoginForm next={safeNext(next)} />
        </div>
      </div>
    </div>
  );
}
