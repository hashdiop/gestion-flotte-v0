import { test, expect } from '@playwright/test';
import { E2E_ADMIN } from './test-env.js';

// Ces scénarios partent sans session
test.use({ storageState: { cookies: [], origins: [] } });

test('une page protégée renvoie vers la connexion, puis y revient', async ({ page }) => {
  await page.goto('/vehicules');
  await expect(page).toHaveURL(/\/login\?next=%2Fvehicules/);

  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/vehicules$/);
  await expect(page.getByRole('heading', { name: 'Véhicules', exact: true })).toBeVisible();
});

test('un mauvais mot de passe est refusé', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill('pas-le-bon');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // .form-error : Next ajoute aussi un role="alert" vide (annonce des changements de page)
  await expect(page.locator('.form-error')).toHaveText('E-mail ou mot de passe incorrect.');
  await expect(page).toHaveURL(/\/login/);
});

test('une adresse /api sans session répond 401', async ({ request }) => {
  const res = await request.get('/api/nimporte-quoi');
  expect(res.status()).toBe(401);
});

test('la déconnexion ramène à la connexion', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/chauffeurs');
  await expect(page).toHaveURL(/\/login/);
});
