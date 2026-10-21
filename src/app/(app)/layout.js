import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getSession } from '@/lib/session';

export default async function AppLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="app">
      <Sidebar userName={session.name} />
      <main>{children}</main>
    </div>
  );
}
