import { Info } from 'lucide-react';

// Petite icône ⓘ : l'explication s'affiche au survol ou au focus, au lieu d'occuper la page
export default function InfoTip({ text }) {
  if (!text) return null;
  return (
    <span className="info-tip" tabIndex={0} role="note" aria-label={text} data-tip={text}>
      <Info size={16} aria-hidden="true" />
    </span>
  );
}
