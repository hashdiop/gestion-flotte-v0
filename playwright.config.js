import { defineConfig, devices } from '@playwright/test';
import nextEnv from '@next/env';

// Le serveur standalone ne lit pas .env.local : on charge les variables ici pour les lui transmettre
nextEnv.loadEnvConfig(process.cwd());
import { E2E_BASE_URL, E2E_MONGODB_URI, E2E_PORT, STORAGE_STATE } from './e2e/test-env.js';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  // Les scénarios partagent une base : on les joue l'un après l'autre
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: E2E_BASE_URL,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [
    // Se connecte une fois et garde le cookie pour les autres scénarios
    { name: 'connexion', testMatch: /auth\.setup\.js/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['connexion'],
    },
  ],
  // Application compilée et lancée comme dans l'image Docker (serveur standalone + fichiers statiques),
  // sur un port à part avec la base de test. .env.local (chargé plus haut) fournit AUTH_SECRET.
  webServer: {
    command:
      `npm run build && node -e "require('fs').cpSync('.next/static', '.next/standalone/.next/static', { recursive: true })"` +
      ` && node .next/standalone/server.js`,
    url: `${E2E_BASE_URL}/api/health`,
    env: { MONGODB_URI: E2E_MONGODB_URI, PORT: String(E2E_PORT), HOSTNAME: '127.0.0.1' },
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
