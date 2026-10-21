'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/actions/auth';

// Une entrée sans href est un titre de groupe
const NAV = [
  { href: '/', label: 'Tableau de bord' },
  { group: 'Suivi' },
  { href: '/vehicules', label: 'Véhicules' },
  { href: '/chauffeurs', label: 'Chauffeurs' },
  { group: 'Argent' },
  { href: '/versements', label: 'Versements' },
  { href: '/depenses', label: 'Dépenses' },
  { group: 'Terrain' },
  { href: '/documents', label: 'Documents' },
];

function isActive(pathname, href) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}

export default function Sidebar({ userName }) {
  const pathname = usePathname();
  return (
    <aside className="side">
      <div className="brand">
        <b>FLOTTE</b>
        <span>Banlieu Transport</span>
      </div>
      <nav aria-label="Navigation principale">
        {NAV.map((item) =>
          item.group ? (
            <div key={item.group} className="grp">{item.group}</div>
          ) : (
            <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
              {item.label}
            </Link>
          )
        )}
      </nav>
      <form action={logout} className="me">
        <span>{userName}</span>
        <button type="submit" className="side-btn">Se déconnecter</button>
      </form>
    </aside>
  );
}
