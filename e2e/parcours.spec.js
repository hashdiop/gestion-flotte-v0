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
  const arrears = page.locator('section', { has: page.getByRole('heading', { name: 'Écarts par chauffeur' }) });
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

test('actions rapides : modifier un véhicule depuis la liste', async ({ page }) => {
  await page.goto('/vehicules');
  await page.getByRole('button', { name: `Actions pour ${PLATE}` }).click();
  await page.getByRole('menuitem', { name: 'Modifier les infos' }).click();

  await expect(page.getByRole('heading', { name: `Modifier ${PLATE}` })).toBeVisible();
  await page.getByLabel('Tarif journalier (FCFA)').fill('16000');
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  // Retour à la liste, avec le nouveau tarif
  await expect(page).toHaveURL(/\/vehicules$/);
  await expect(page.locator('tr', { hasText: PLATE })).toContainText(amount(16000));
});

test('actions rapides : changer le statut depuis la liste', async ({ page }) => {
  await page.goto('/vehicules');
  await page.getByRole('button', { name: `Actions pour ${PLATE}` }).click();
  await page.getByRole('menuitem', { name: 'En atelier' }).click();
  await expect(page.locator('tr', { hasText: PLATE })).toContainText('En atelier');

  await page.getByRole('button', { name: `Actions pour ${PLATE}` }).click();
  await page.getByRole('menuitem', { name: 'En service' }).click();
  await expect(page.locator('tr', { hasText: PLATE })).toContainText('En service');
});

test('actions rapides : modifier un chauffeur depuis la liste', async ({ page }) => {
  await page.goto('/chauffeurs');
  await page.getByRole('button', { name: `Actions pour ${DRIVER}` }).click();
  await page.getByRole('menuitem', { name: 'Modifier les infos' }).click();
  await page.getByLabel('Téléphone').fill('77 000 00 97');
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(page).toHaveURL(/\/chauffeurs$/);
  await expect(page.locator('tr', { hasText: DRIVER })).toContainText('77 000 00 97');
});

test('actions rapides : annuler la confirmation ne désactive pas', async ({ page }) => {
  await page.goto('/chauffeurs');
  await page.getByRole('button', { name: `Actions pour ${DRIVER}` }).click();
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('menuitem', { name: 'Désactiver le chauffeur' }).click();
  await page.reload();
  await expect(page.locator('tr', { hasText: DRIVER })).toContainText('Actif');
});

test('véhicule en atelier : journées non dues d’office, selon l’historique', async ({ page }) => {
  const plate2 = `E2E-${suffix}-AT`;
  const last2 = `Atelier${suffix}`;
  // Jours ouvrés (hors dimanche) relatifs à aujourd'hui
  const workday = (...offsets) => offsets.map(isoDay).find((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 0);
  const before = workday(-3, -4); // avant l'atelier : dû
  const during = workday(-1, 0); // pendant l'atelier : non dû

  // Véhicule et chauffeur dédiés, affectés depuis 7 jours
  await page.goto('/vehicules/nouveau');
  await page.getByLabel('Immatriculation').fill(plate2);
  await page.getByLabel('Tarif journalier (FCFA)').fill('12000');
  await page.getByLabel('Marque').fill('Dacia');
  await page.getByLabel('Modèle').fill('Logan');
  await page.getByRole('button', { name: 'Créer le véhicule' }).click();
  await expect(page.getByRole('heading', { name: plate2 })).toBeVisible(); // attend la fiche avant de lire l'URL
  const vUrl = new URL(page.url()).pathname;

  await page.goto('/chauffeurs/nouveau');
  await page.getByLabel('Prénom').fill('Testeur');
  await page.getByLabel('Nom', { exact: true }).fill(last2);
  await page.getByLabel('Téléphone').fill('77 000 00 96');
  await page.getByRole('button', { name: 'Créer le chauffeur' }).click();
  const select = page.getByLabel('Véhicule (en service)');
  await select.selectOption(await select.locator('option', { hasText: plate2 }).getAttribute('value'));
  await page.getByLabel('À partir du').fill(isoDay(-7));
  await page.getByRole('button', { name: 'Affecter' }).click();
  await expect(page.getByRole('status')).toContainText(plate2);

  // En atelier depuis avant-hier
  await page.goto(vUrl);
  const statut = page.locator('#statut');
  await statut.getByLabel('À partir du').fill(isoDay(-2));
  await statut.getByLabel('Motif').fill('Embrayage');
  await statut.getByRole('button', { name: 'Passer « En atelier »' }).click();
  await expect(statut.locator('tr', { hasText: 'Embrayage' })).toContainText('En atelier');

  // Pendant l'atelier : non dû, sans aucune saisie
  await page.goto(`/versements?date=${during}`);
  await expect(page.locator('tr', { hasText: plate2 })).toContainText('Non dû · en atelier');
  // Avant l'atelier : toujours dû
  await page.goto(`/versements?date=${before}`);
  await expect(page.locator('tr', { hasText: plate2 })).toContainText('Non saisi');

  // Une date antérieure au dernier changement est refusée
  await page.goto(vUrl);
  await statut.getByLabel('À partir du').fill(isoDay(-5));
  await statut.getByRole('button', { name: 'Passer « En service »' }).click();
  await expect(statut.locator('.form-error')).toContainText('au plus tôt');
});

test('désactiver le chauffeur lui retire son véhicule', async ({ page }) => {
  await page.goto(driverUrl);
  await page.getByRole('button', { name: 'Désactiver le chauffeur' }).click();
  await expect(page.getByText('Chauffeur désactivé : aucun véhicule.')).toBeVisible();

  await page.goto('/vehicules');
  await expect(page.locator('tr', { hasText: PLATE })).not.toContainText(DRIVER);
  await page.goto('/chauffeurs?etat=inactifs');
  await expect(page.getByRole('link', { name: DRIVER, exact: true })).toBeVisible();
});

// En dernier : la clôture fige la journée d'aujourd'hui sur la base de test
test('clôturer la journée, puis corriger avec motif', async ({ page }) => {
  test.skip(isSunday, 'Le dimanche, il n’y a rien à clôturer');
  const today = isoDay(0);

  await page.goto('/versements/cloture');
  await expect(page.getByRole('heading', { name: /^À clôturer/ })).toBeVisible();
  // Les lignes sans saisie sont annoncées avant la clôture
  await expect(page.locator('.form-warn')).toContainText('« Non versé »');

  await page.getByLabel('Espèces comptées en caisse (FCFA)').fill('0');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /^Clôturer la journée du/ }).click();

  // Rapport de clôture
  await expect(page).toHaveURL(new RegExp(`/versements/cloture/${today}$`));
  await expect(page.getByRole('heading', { name: 'Rapport de clôture' })).toBeVisible();
  await expect(page.locator('tr', { hasText: PLATE })).toContainText(/Partiel\s−2\s000/);

  // La journée est figée : seule une écriture correctrice est possible
  await page.goto('/versements');
  await expect(page.locator('.closed-banner')).toContainText('Journée clôturée');
  const row = page.locator('tr', { hasText: PLATE });
  await row.getByRole('button', { name: 'Corriger' }).click();
  const form = page.locator('tr.edit-row form');

  // Remboursement refusé : la caisse du jour est déjà clôturée
  await form.getByLabel('Motif (obligatoire)').fill('Rattrapage');
  await form.getByRole('button', { name: 'Enregistrer l’écriture' }).click();
  await expect(form.locator('.form-error')).toContainText('se saisira demain');

  // Correction : motif obligatoire, puis versé corrigé
  await form.getByLabel('Correction d’une erreur').check();
  await form.getByLabel('Versé corrigé (FCFA)').fill(String(RATE - 1000));
  await form.getByLabel('Motif (obligatoire)').fill('');
  await form.getByRole('button', { name: 'Enregistrer l’écriture' }).click();
  await expect(form.locator('.form-error')).toHaveText('Le motif est obligatoire.');
  await form.getByLabel('Motif (obligatoire)').fill('Reçu n° 12 retrouvé');
  await form.getByRole('button', { name: 'Enregistrer l’écriture' }).click();
  await expect(row).toContainText(/Corrigé · versé \+1\s000/);
  await expect(row).toContainText(/Partiel\s−1\s000/);

  // Le rapport garde l'état de la clôture et liste la correction à part
  await page.goto(`/versements/cloture/${today}`);
  await expect(page.locator('tr', { hasText: 'Reçu n° 12 retrouvé' })).toContainText(/\+1\s000/);

  // Plus rien à clôturer : demain n'a pas commencé
  await page.goto('/versements/cloture');
  await expect(page.getByText('Rien à clôturer pour l’instant.')).toBeVisible();
});
