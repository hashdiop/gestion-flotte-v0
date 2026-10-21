import { test, expect } from '@playwright/test';

// Parcours complet d'un gestionnaire, avec ses propres données (plaque et chauffeur uniques).
// Les étapes dépendent les unes des autres : elles s'enchaînent dans l'ordre.
test.describe.configure({ mode: 'serial' });

const suffix = String(Date.now()).slice(-5);
const PLATE = `E2E-${suffix}-ZZ`;
const FIRST = 'Testeur';
const LAST = `Parcours${suffix}`;
const DRIVER = `${FIRST} ${LAST}`;
const RATE = 14000;

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (offset = 0) => new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);
const isSunday = new Date().getUTCDay() === 0;

// Les montants sont formatés en fr-FR (espace fine insécable) : on compare avec \s
const amount = (n) => new RegExp(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\s'));

let vehicleUrl;
let driverUrl;

test('ajouter un véhicule', async ({ page }) => {
  await page.goto('/vehicules/nouveau');
  await page.getByLabel('Immatriculation').fill(PLATE.toLowerCase()); // normalisée en majuscules
  await page.getByLabel('Tarif journalier (FCFA)').fill('14 000');
  await page.getByLabel('Marque').fill('Toyota');
  await page.getByLabel('Modèle').fill('Corolla');
  await page.getByLabel('Année').fill('2021');
  await page.getByRole('button', { name: 'Créer le véhicule' }).click();

  await expect(page.getByRole('heading', { name: PLATE })).toBeVisible();
  await expect(page.getByText('En service', { exact: true }).first()).toBeVisible();
  vehicleUrl = new URL(page.url()).pathname;
});

test('une immatriculation en double est refusée', async ({ page }) => {
  await page.goto('/vehicules/nouveau');
  await page.getByLabel('Immatriculation').fill(PLATE);
  await page.getByLabel('Tarif journalier (FCFA)').fill('10000');
  await page.getByLabel('Marque').fill('Kia');
  await page.getByLabel('Modèle').fill('Rio');
  await page.getByRole('button', { name: 'Créer le véhicule' }).click();
  await expect(page.getByText('Cette immatriculation existe déjà.')).toBeVisible();
  // Les autres champs sont conservés
  await expect(page.getByLabel('Marque')).toHaveValue('Kia');
});

test('ajouter un chauffeur', async ({ page }) => {
  await page.goto('/chauffeurs/nouveau');
  await page.getByLabel('Prénom').fill(FIRST);
  await page.getByLabel('Nom', { exact: true }).fill(LAST);
  await page.getByLabel('Téléphone').fill('77 000 00 98');
  await page.getByLabel("Date d'arrivée").fill(isoDay(-30));
  await page.getByRole('button', { name: 'Créer le chauffeur' }).click();

  await expect(page.getByRole('heading', { name: DRIVER })).toBeVisible();
  driverUrl = new URL(page.url()).pathname;
});

test('affecter le véhicule au chauffeur', async ({ page }) => {
  await page.goto(driverUrl);
  const select = page.getByLabel('Véhicule (en service)');
  const value = await select.locator('option', { hasText: PLATE }).getAttribute('value');
  await select.selectOption(value);
  await page.getByLabel('Motif').fill('Attitré');
  await page.getByRole('button', { name: 'Affecter' }).click();

  await expect(page.getByRole('status')).toContainText(`${PLATE} affecté à ${DRIVER}`);
  // L'affectation apparaît dans la liste des véhicules
  await page.goto('/vehicules');
  await expect(page.locator('tr', { hasText: PLATE })).toContainText(DRIVER);
});

test('encaisser un versement partiel du jour', async ({ page }) => {
  test.skip(isSunday, 'Le dimanche, aucun versement n’est dû');
  await page.goto('/versements');
  const row = page.locator('tr', { hasText: PLATE });
  await expect(row).toContainText('À encaisser');
  await row.getByRole('button', { name: 'Saisir' }).click();

  const form = page.locator('tr.edit-row form');
  await form.locator('input[name="amount"]').fill(String(RATE - 2000));
  await form.getByRole('button', { name: 'Encaisser' }).click();

  await expect(row).toContainText(/Partiel\s−2\s000/);
  // Le tableau de bord le compte dans les écarts cumulés
  await page.goto('/');
  const arrears = page.locator('section', { has: page.getByRole('heading', { name: 'Écarts cumulés par chauffeur' }) });
  await expect(arrears.locator('.list-item', { hasText: DRIVER })).toContainText(/−2\s000/);
});

test('« Non dû » exige un motif', async ({ page }) => {
  test.skip(isSunday, 'Le dimanche, aucun versement n’est dû');
  await page.goto('/versements');
  const row = page.locator('tr', { hasText: PLATE });
  await row.getByRole('button', { name: 'Modifier' }).click();
  const form = page.locator('tr.edit-row form');
  await form.locator('input[name="note"]').fill('');
  await form.getByRole('button', { name: 'Non dû' }).click();
  await expect(form.locator('.form-error')).toHaveText('Indique pourquoi la journée n’est pas due.');
});

test('enregistrer une dépense sur le véhicule', async ({ page }) => {
  const vehicleId = vehicleUrl.split('/').pop();
  await page.goto(`/depenses/nouvelle?vehicule=${vehicleId}`);
  await page.getByLabel('Catégorie').selectOption('reparation');
  await page.getByLabel('Montant (FCFA)').fill('12345');
  await page.getByLabel('Description').fill('Test E2E : plaquettes');
  await page.getByRole('button', { name: 'Enregistrer la dépense' }).click();

  await expect(page).toHaveURL(/\/depenses\?mois=/);
  await expect(page.locator('tr', { hasText: 'Test E2E : plaquettes' })).toContainText(amount(12345));
  await page.goto(vehicleUrl);
  const card = page.locator('section', { has: page.getByRole('heading', { name: 'Dépenses' }) });
  await expect(card).toContainText(amount(12345));
});

test('suivre et renouveler un document', async ({ page }) => {
  await page.goto(vehicleUrl);
  const docs = page.locator('section', { has: page.getByRole('heading', { name: 'Documents' }) });
  // Nouveau véhicule : ses 5 documents sont manquants
  await expect(docs.getByText('Manquant')).toHaveCount(5);

  await docs.locator('tr', { hasText: 'Assurance' }).getByRole('link', { name: 'Ajouter' }).click();
  await page.getByLabel("Date d'expiration").fill(isoDay(5));
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page).toHaveURL(vehicleUrl);
  await expect(docs.locator('tr', { hasText: 'Assurance' })).toContainText('Critique');

  // Présent dans l'échéancier « À traiter »
  await page.goto('/documents');
  const row = page.locator('tr', { hasText: PLATE }).filter({ hasText: 'Assurance' });
  await expect(row).toContainText('Critique');

  // Renouvellement d'un an : la ligne sort de « À traiter »
  await row.getByRole('link', { name: 'Renouveler' }).click();
  await page.getByLabel("Date d'expiration").fill(isoDay(365));
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.locator('tr', { hasText: PLATE }).filter({ hasText: 'Assurance' })).toHaveCount(0);
});

test('désactiver le chauffeur lui retire son véhicule', async ({ page }) => {
  await page.goto(driverUrl);
  await page.getByRole('button', { name: 'Désactiver le chauffeur' }).click();
  await expect(page.getByText('Chauffeur désactivé : aucun véhicule.')).toBeVisible();

  await page.goto('/vehicules');
  await expect(page.locator('tr', { hasText: PLATE })).not.toContainText(DRIVER);
  await page.goto('/chauffeurs?etat=inactifs');
  await expect(page.getByRole('link', { name: DRIVER })).toBeVisible();
});
