import LoginForm from './LoginForm';
import { safeNext } from '@/lib/safe-next';

export const metadata = { title: 'Connexion · Gestion de flotte' };

export default async function LoginPage({ searchParams }) {
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
