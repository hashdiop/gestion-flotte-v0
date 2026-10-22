import { cookies } from 'next/headers';

export const THEMES = ['clair', 'sombre', 'auto'];

// Thème choisi (cookie « bt_theme »), clair par défaut
export async function getTheme() {
  const value = (await cookies()).get('bt_theme')?.value;
  return THEMES.includes(value) ? value : 'clair';
}
