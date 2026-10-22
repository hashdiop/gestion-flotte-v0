import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getSession } from '@/lib/session';
import { getTheme } from '@/lib/theme';

export default async function AppLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');
  // Mot de passe provisoire : seule la page « Mon compte » est accessible
  const pathname = (await headers()).get('x-pathname') ?? '';
  if (session.mustChangePassword && pathname !== '/mon-compte') redirect('/mon-compte');
  const theme = await getTheme();

  return (
    <div className="app">
      <Sidebar userName={session.name} role={session.role} theme={theme} locked={session.mustChangePassword} />
      <main>{children}</main>
    </div>
  );
}
