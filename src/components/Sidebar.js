'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Truck } from 'lucide-react';
import { logout } from '@/actions/auth';
import ThemeToggle from './ThemeToggle';
import { DOMAINS, domainVars } from './domains';
import { ROLES } from '@/lib/roles';

// Ordre du menu ; « sep » = séparation. « Comptes » n'apparaît que pour l'admin.
const NAV = ['dash', 'sep', 'veh', 'drv', 'sep', 'pay', 'exp', 'clo', 'sep', 'doc'];
const NAV_ADMIN = [...NAV, 'acc'];

// La rubrique active est la plus précise qui correspond à l'adresse (Clôture avant Versements)
function activeKey(pathname) {
  const matches = Object.entries(DOMAINS).filter(([, d]) =>
    d.href === '/' ? pathname === '/' : pathname === d.href || pathname.startsWith(d.href + '/')
  );
  return matches.sort((a, b) => b[1].href.length - a[1].href.length)[0]?.[0];
}

const initials = (name = '') =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Accueil">
      <span className="brand-logo"><Truck size={20} aria-hidden="true" /></span>
      <span className="brand-txt">
        <b>FLOTTE</b>
        <span>Banlieu Transport</span>
      </span>
    </Link>
  );
}

function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="icon-btn" aria-label="Se déconnecter" data-tip="Se déconnecter">
        <LogOut size={18} aria-hidden="true" />
      </button>
    </form>
  );
}

export default function Sidebar({ userName, role, theme }) {
  const pathname = usePathname();
  const current = activeKey(pathname);
  const nav = role === 'admin' ? NAV_ADMIN : NAV;

  return (
    <>
      {/* Téléphone : en-tête compact (le menu passe en barre d'onglets en bas) */}
      <header className="mobile-top">
        <Brand />
        <div className="row-tight">
          <Link href="/mon-compte" className="icon-btn" aria-label="Mon compte">
            <span className="avatar-sm" aria-hidden="true">{initials(userName)}</span>
          </Link>
          <ThemeToggle initial={theme} />
          <LogoutButton />
        </div>
      </header>

      <aside className="side">
        <Brand />
        <nav aria-label="Navigation principale">
          {nav.map((key, i) => {
            if (key === 'sep') return <div key={`sep-${i}`} className="sep" />;
            const d = DOMAINS[key];
            return (
              <Link key={key} href={d.href} style={domainVars(key)} aria-current={current === key ? 'page' : undefined} aria-label={d.label} data-tip={d.label}>
                <d.Icon size={20} aria-hidden="true" />
                <span className="lbl">{d.label}</span>
                <span className="lbl-short">{d.short}</span>
              </Link>
            );
          })}
        </nav>
        <div className="me">
          <Link href="/mon-compte" className="who" aria-label={`Mon compte : ${userName}`} data-tip="Mon compte">
            <span className="avatar-sm" aria-hidden="true">{initials(userName)}</span>
            <span className="who-txt">
              <span>{userName}</span>
              <small>{ROLES[role]?.label}</small>
            </span>
          </Link>
          <ThemeToggle initial={theme} />
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
