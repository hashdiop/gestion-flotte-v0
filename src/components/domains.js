import { Banknote, Car, FileCheck, LayoutDashboard, LockKeyhole, Receipt, Users } from 'lucide-react';

// Rubriques de l'application : libellé, lien, icône et couleur (variables CSS --{key} et --{key}-bg)
export const DOMAINS = {
  dash: { label: 'Tableau de bord', short: 'Accueil', href: '/', Icon: LayoutDashboard },
  veh: { label: 'Véhicules', short: 'Véhicules', href: '/vehicules', Icon: Car },
  drv: { label: 'Chauffeurs', short: 'Chauffeurs', href: '/chauffeurs', Icon: Users },
  pay: { label: 'Versements', short: 'Versements', href: '/versements', Icon: Banknote },
  exp: { label: 'Dépenses', short: 'Dépenses', href: '/depenses', Icon: Receipt },
  doc: { label: 'Documents', short: 'Docs', href: '/documents', Icon: FileCheck },
  clo: { label: 'Clôture', short: 'Clôture', href: '/versements/cloture', Icon: LockKeyhole },
};

// Variables CSS d'une rubrique, à poser en style sur un élément (lues par .dom, .side nav a…)
export const domainVars = (key) => ({ '--c': `var(--${key})`, '--cb': `var(--${key}-bg)` });

// Icône de rubrique dans une tuile colorée
export function DomainIcon({ domain, size = 18, tile = true, className = '' }) {
  const { Icon } = DOMAINS[domain];
  if (!tile) return <Icon size={size} style={{ color: `var(--${domain})` }} aria-hidden="true" />;
  return (
    <span className={`dom ${className}`} style={domainVars(domain)} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}
