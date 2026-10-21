import { test as setup, expect } from '@playwright/test';
import { E2E_ADMIN, STORAGE_STATE } from './test-env.js';

setup('connexion du gestionnaire de test', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(E2E_ADMIN.email);
  await page.getByLabel('Mot de passe').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await page.context().storageState({ path: STORAGE_STATE });
});
