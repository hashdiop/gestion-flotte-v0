import { test, expect } from '@playwright/test';
import { E2E_BASE_URL } from './test-env.js';

// Comptes et rôles. S'exécute avant parcours.spec.js (ordre alphabétique) : la journée n'est pas encore clôturée.
test.describe.configure({ mode: 'serial' });

const suffix = String(Date.now()).slice(-6);
const AGENT = { name: `Agent Test${suffix}`, email: `agent${suffix}@bt.local`, password: '' };
const GEST = { name: `Gestion Test${suffix}`, email: `gest${suffix}@bt.local`, password: '' };
const NEW_PASSWORD = 'nouveau-mdp-123';

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (offset = 0) => new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);
const isSunday = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay() === 0;

// Session séparée pour se connecter avec un autre compte
async function loginAs(browser, account, password) {
  const context = await browser.newContext({ baseURL: E2E_BASE_URL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(account.email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  return { context, page };
}

async function createAccount(page, account, roleLabel) {
  await page.goto('/comptes');
  const form = page.locator('form', { has: page.getByRole('button', { name: 'Créer le compte' }) });
  await form.getByLabel('Nom').fill(account.name);
  await form.getByLabel('E-mail').fill(account.email);
  await form.getByLabel('Rôle').selectOption({ label: roleLabel });
  await form.getByRole('button', { name: 'Créer le compte' }).click();
  const temp = page.getByTestId('temp-password');
  await expect(temp).toBeVisible();
  account.password = (await temp.textContent()).trim();
  await expect(page.locator('.user-row', { hasText: account.email })).toContainText(roleLabel);
}

test('l’admin crée un compte agent et un compte gestionnaire', async ({ page }) => {
  await createAccount(page, AGENT, 'Agent');
  await createAccount(page, GEST, 'Gestionnaire');
  // Un e-mail déjà pris est refusé
  const form = page.locator('form', { has: page.getByRole('button', { name: 'Créer le compte' }) });
  await form.getByLabel('Nom').fill('Doublon');
  await form.getByLabel('E-mail').fill(AGENT.email);
  await form.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page.getByText('Un compte existe déjà avec cet e-mail.')).toBeVisible();
});

test('l’admin ne peut pas changer son propre rôle', async ({ page }) => {
  await page.goto('/comptes');
  const me = page.locator('.user-row', { hasText: '(toi)' });
  await expect(me.getByRole('combobox')).toBeDisabled();
  await expect(me.getByRole('button', { name: /^Désactiver/ })).toHaveCount(0);
});

test('mot de passe provisoire : changement obligatoire à la première connexion', async ({ browser }) => {
  const { context, page } = await loginAs(browser, AGENT, AGENT.password);
  await expect(page).toHaveURL(/\/mon-compte$/);
  // Toute autre page ramène à « Mon compte »
  await page.goto('/vehicules');
  await expect(page).toHaveURL(/\/mon-compte$/);

  await page.getByLabel('Mot de passe actuel').fill(AGENT.password);
  await page.getByLabel('Nouveau mot de passe').fill(NEW_PASSWORD);
  await page.getByLabel('Confirmer').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await context.close();
});

test('agent : consultation et versements du jour seulement', async ({ browser }) => {
  const { context, page } = await loginAs(browser, AGENT, NEW_PASSWORD);
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

  // Pas de bouton d'ajout, pas de rubrique Comptes, pages réservées refusées
  await page.goto('/vehicules');
  await expect(page.getByRole('link', { name: 'Ajouter un véhicule' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Comptes' })).toHaveCount(0);
  await page.goto('/vehicules/nouveau');
  await expect(page.getByRole('heading', { name: 'Accès réservé' })).toBeVisible();
  await page.goto('/comptes');
  await expect(page.getByRole('heading', { name: 'Accès réservé' })).toBeVisible();
  await page.goto('/depenses');
  await expect(page.getByRole('link', { name: 'Ajouter une dépense' })).toHaveCount(0);

  // Versements : saisie possible aujourd'hui, pas sur une journée passée
  if (!isSunday(isoDay(0))) {
    await page.goto('/versements');
    await expect(page.getByRole('button', { name: 'Saisir' }).first()).toBeVisible();
  }
  const past = [isoDay(-1), isoDay(-2)].find((d) => !isSunday(d));
  await page.goto(`/versements?date=${past}`);
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Saisir|Modifier|Corriger)$/ })).toHaveCount(0);
  await context.close();
});

test('gestionnaire : gère le parc mais ne clôture pas', async ({ browser }) => {
  const first = await loginAs(browser, GEST, GEST.password);
  await first.page.getByLabel('Mot de passe actuel').fill(GEST.password);
  await first.page.getByLabel('Nouveau mot de passe').fill(NEW_PASSWORD);
  await first.page.getByLabel('Confirmer').fill(NEW_PASSWORD);
  await first.page.getByRole('button', { name: 'Changer le mot de passe' }).click();
  await expect(first.page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  const page = first.page;

  await page.goto('/vehicules');
  await expect(page.getByRole('link', { name: 'Ajouter un véhicule' })).toBeVisible();
  await page.goto('/versements/cloture');
  await expect(page.getByRole('button', { name: /^Clôturer la journée/ })).toHaveCount(0);
  await page.goto('/comptes');
  await expect(page.getByRole('heading', { name: 'Accès réservé' })).toBeVisible();
  await first.context.close();
});

test('un compte désactivé est déconnecté immédiatement', async ({ page, browser }) => {
  const agent = await loginAs(browser, AGENT, NEW_PASSWORD);
  await expect(agent.page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

  // L'admin désactive le compte de l'agent
  await page.goto('/comptes');
  const row = page.locator('.user-row', { hasText: AGENT.email });
  page.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: `Désactiver ${AGENT.name}` }).click();
  await expect(row).toContainText('Désactivé');

  // La session déjà ouverte de l'agent ne vaut plus rien
  await agent.page.goto('/vehicules');
  await expect(agent.page).toHaveURL(/\/login/);
  await agent.context.close();
});
