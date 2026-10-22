'use client';

import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

const NEXT = { clair: 'sombre', sombre: 'auto', auto: 'clair' };
const META = {
  clair: { Icon: Sun, label: 'Thème clair' },
  sombre: { Icon: Moon, label: 'Thème sombre' },
  auto: { Icon: Monitor, label: 'Thème du système' },
};

// Bascule clair → sombre → système. Le choix est gardé un an dans un cookie lu par le layout racine.
export default function ThemeToggle({ initial = 'clair' }) {
  const [theme, setTheme] = useState(initial);
  const { Icon, label } = META[theme];

  function cycle() {
    // Part du thème réellement appliqué : l'autre bouton (en-tête mobile / menu) a pu le changer
    const applied = document.documentElement.dataset.theme;
    const next = NEXT[META[applied] ? applied : theme];
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `bt_theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button type="button" className="icon-btn" onClick={cycle} aria-label={`${label} (changer)`} data-tip={label}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
