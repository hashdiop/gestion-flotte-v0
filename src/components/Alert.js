import Link from 'next/link';
import { ArrowRight, CircleAlert, Info, LockKeyhole, TriangleAlert } from 'lucide-react';

const ICONS = { info: Info, warn: TriangleAlert, bad: CircleAlert, closed: LockKeyhole };

// Alerte sur une ligne : icône, message court, action à droite
export default function Alert({ tone = 'info', icon, href, action, children }) {
  const Icon = icon ?? ICONS[tone];
  return (
    <div className={`alert alert-${tone}`}>
      <Icon size={18} aria-hidden="true" />
      <span className="alert-msg">{children}</span>
      {href && (
        <Link href={href} className="alert-act">
          {action}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
