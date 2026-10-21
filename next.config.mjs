/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  // Le badge de développement masquait le bouton « Se déconnecter » en bas de la barre latérale
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
