import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getSession } from '@/lib/session';
import { getTheme } from '@/lib/theme';

export default async function AppLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const theme = await getTheme();

  return (
    <div className="app">
      <Sidebar userName={session.name} theme={theme} />
      <main>{children}</main>
    </div>
  );
}
