'use client';

import { useEffect, useRef, useState } from 'react';
import { EllipsisVertical } from 'lucide-react';

// Position du menu sous son bouton (ou au-dessus s'il manque de place en bas), par rapport à la fenêtre
function placeUnder(button) {
  const r = button.getBoundingClientRect();
  const up = window.innerHeight - r.bottom < 280;
  return {
    right: Math.max(8, window.innerWidth - r.right),
    ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
  };
}

// Menu « Actions » d'une ligne de liste. Les entrées (liens, formulaires) sont passées en enfants.
// Le menu est placé par rapport à la fenêtre (position: fixed) : les tableaux défilent
// horizontalement dans un conteneur qui couperait un menu positionné à l'intérieur.
// Au défilement, il suit son bouton plutôt que de se fermer.
export default function RowMenu({ label, children }) {
  const [pos, setPos] = useState(null); // null = fermé
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const follow = () => btnRef.current && setPos(placeUnder(btnRef.current));
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
  }, [pos]);

  return (
    <div className="row-menu" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="btn icon ghost"
        aria-haspopup="menu"
        aria-expanded={Boolean(pos)}
        aria-label={label}
        title="Plus d’actions"
        onClick={() => setPos(pos ? null : placeUnder(btnRef.current))}
      >
        <EllipsisVertical size={18} aria-hidden="true" />
      </button>
      {pos && (
        // Un clic sur une entrée ferme le menu. Pour un bouton, on attend que l'envoi du formulaire
        // soit parti : fermer tout de suite retirerait le formulaire de la page avant l'envoi.
        <div
          className="menu"
          role="menu"
          style={pos}
          onClick={(e) => {
            if (e.target.closest('a')) setPos(null);
            else if (e.target.closest('button')) setTimeout(() => setPos(null), 0);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
