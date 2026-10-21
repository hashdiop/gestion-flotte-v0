// Environnement des tests de bout en bout : base dédiée, jamais la base de développement.
// Les identifiants ci-dessous n'existent que dans cette base de test.
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_MONGODB_URI = 'mongodb://127.0.0.1:27017/bt_flotte_e2e';
export const E2E_ADMIN = { email: 'e2e@bt.local', password: 'e2e-mot-de-passe-123', name: 'Testeur E2E' };
export const STORAGE_STATE = 'e2e/.auth/session.json';
