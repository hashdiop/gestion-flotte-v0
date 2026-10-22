import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { getTheme } from '@/lib/theme';
import './globals.css';

const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata = {
  title: 'Gestion de flotte',
  description: 'Véhicules, chauffeurs, versements, dépenses et documents',
};

export default async function RootLayout({ children }) {
  // Thème appliqué dès le rendu serveur : pas de flash au chargement
  const theme = await getTheme();
  return (
    <html lang="fr" data-theme={theme} className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
