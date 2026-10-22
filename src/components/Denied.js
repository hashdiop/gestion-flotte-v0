import Link from 'next/link';
import { ShieldX } from 'lucide-react';

// Page réservée : affichée quand le rôle ne permet pas d'accéder à l'écran (l'action serveur refuse aussi)
export default function Denied() {
  return (
    <div className="card denied">
      <span className="dom lg" style={{ '--c': 'var(--bad-fg)', '--cb': 'var(--bad-bg)' }} aria-hidden="true"><ShieldX size={22} /></span>
      <h1>Accès réservé</h1>
      <p className="muted">Ton rôle ne permet pas d’ouvrir cette page.</p>
      <Link href="/" className="btn">Retour à l’accueil</Link>
    </div>
  );
}
