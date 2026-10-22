import {
  Building2, Car, ClipboardCheck, Cog, Disc, Droplets, Ellipsis, Fuel, Gavel, Landmark, Package,
  ShieldCheck, Smartphone, Sparkles, Ticket, Users, Wrench, Zap,
} from 'lucide-react';
import { categoryLabel } from '@/lib/expense-categories';

const ICONS = {
  carburant: Fuel,
  entretien: Droplets,
  reparation: Wrench,
  pieces: Cog,
  pneus: Disc,
  lavage: Sparkles,
  assurance: ShieldCheck,
  visite_technique: ClipboardCheck,
  vignette_taxes: Ticket,
  amende: Gavel,
  autre_vehicule: Car,
  loyer: Building2,
  salaires: Users,
  eau_electricite: Zap,
  telephone_internet: Smartphone,
  fournitures: Package,
  frais_bancaires: Landmark,
  autre_divers: Ellipsis,
};

// Catégorie de dépense : icône (couleur Dépenses) + libellé
export default function CategoryIcon({ category, withLabel = true }) {
  const Icon = ICONS[category] ?? Ellipsis;
  return (
    <span className="ent">
      <span className="dom sm" style={{ '--c': 'var(--exp)', '--cb': 'var(--exp-bg)' }} aria-hidden="true"><Icon size={15} /></span>
      {withLabel && <span>{categoryLabel(category)}</span>}
    </span>
  );
}
