/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  // Build autonome (.next/standalone) : seul le nécessaire est copié dans l'image Docker
  output: 'standalone',
  // Le badge de développement masquait le bouton « Se déconnecter » en bas de la barre latérale
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
