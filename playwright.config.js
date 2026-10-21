import { defineConfig, devices } from '@playwright/test';
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
  // Application compilée, lancée sur un port à part avec la base de test.
  // .env.local fournit AUTH_SECRET ; MONGODB_URI est remplacé par la base de test.
  webServer: {
    command: `npm run build && npx next start -p ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/api/health`,
    env: { MONGODB_URI: E2E_MONGODB_URI },
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
