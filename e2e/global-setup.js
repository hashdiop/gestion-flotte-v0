// Avant les tests : remet la base de test dans l'état du seed et crée le compte de test.
import { execFileSync } from 'node:child_process';
import { E2E_ADMIN, E2E_MONGODB_URI } from './test-env.js';

export default function globalSetup() {
  if (!E2E_MONGODB_URI.endsWith('_e2e')) throw new Error('La base des tests doit se terminer par _e2e');
  const env = {
    ...process.env,
    MONGODB_URI: E2E_MONGODB_URI,
    ADMIN_EMAIL: E2E_ADMIN.email,
    ADMIN_PASSWORD: E2E_ADMIN.password,
    ADMIN_NAME: E2E_ADMIN.name,
  };
  // Sans --env-file : .env.local pointe sur la base de développement
  execFileSync(process.execPath, ['scripts/seed.js', '--reset'], { env, stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/create-admin.js'], { env, stdio: 'inherit' });
}
