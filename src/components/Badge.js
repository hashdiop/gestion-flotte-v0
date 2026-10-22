import { CircleAlert, CircleCheck, CircleMinus, CircleX, Clock } from 'lucide-react';

// Icône par défaut selon l'état ; icon={false} pour s'en passer, icon={Composant} pour la remplacer
const TONE_ICON = { ok: CircleCheck, warn: CircleAlert, bad: CircleX, info: Clock, neu: CircleMinus };

export default function Badge({ tone = 'neu', icon, children }) {
  const Icon = icon === false ? null : icon ?? TONE_ICON[tone];
  return (
    <span className={`b ${tone}`}>
      {Icon && <Icon size={13} strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </span>
  );
}
