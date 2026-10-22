# Gestion de flotte — V0

Application Next.js 16 + MongoDB (Mongoose) : véhicules, chauffeurs, affectations, versements journaliers,
dépenses (par véhicule ou diverses) et documents administratifs des véhicules.
L'interface reprend `docs/maquette/Gestion flotte V2.html`.

## Démarrage

Prérequis : Node.js 22 ou plus, MongoDB en local (port 27017).

```bash
npm install
cp .env.local.example .env.local   # puis remplir AUTH_SECRET et le compte gestionnaire
npm run user:admin                 # crée le compte défini dans .env.local
npm run seed                       # données de démonstration (refuse si la base n'est pas vide)
npm run dev
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` puis `npm start` | Version de production |
| `npm run user:admin` | Crée le compte gestionnaire, ou change son mot de passe |
| `npm run seed -- --reset` | Remplace toutes les données par la démo |
| `npm run test:e2e` | Tests de bout en bout (Playwright) |

Avant le premier `npm run test:e2e` : `npx playwright install chromium`.
Les tests compilent l'application, la lancent sur le port 3100 avec une base dédiée (`bt_flotte_e2e`),
la remplissent avec le seed et y créent un compte de test. La base de développement n'est jamais touchée.

## Comptes et rôles

| Rôle | Peut faire |
| --- | --- |
| Admin | Tout, dont la page « Comptes », la clôture journalière et les corrections après clôture |
| Gestionnaire | Véhicules, chauffeurs, affectations, versements, dépenses, documents (pas de clôture ni de comptes) |
| Agent | Consulter, et saisir les versements de la journée en cours |

- Les droits sont vérifiés côté serveur dans chaque action ; les écrans masquent en plus les boutons.
- Un compte est créé par un admin avec un mot de passe provisoire (affiché une seule fois), à changer à la première connexion.
- Désactiver un compte, changer son rôle ou son mot de passe ferme immédiatement ses sessions ouvertes.
- Un compte n'est jamais supprimé (l'historique garde son nom). Le dernier admin actif ne peut être ni désactivé ni rétrogradé.
- Chacun change son mot de passe depuis « Mon compte » (clic sur son nom en bas du menu).

## Mise en production : premier admin

1. Renseigner `MONGODB_URI` (base de production), `AUTH_SECRET` (long et aléatoire), `ADMIN_EMAIL`,
   `ADMIN_PASSWORD` et `ADMIN_NAME` dans l'environnement du serveur.
2. Créer le compte initial, une seule fois : `npm run user:admin`. Ne pas lancer le seed en production.
3. Se connecter avec ce compte, ouvrir « Comptes » et créer un admin nominatif pour la personne responsable.
4. Cette personne se connecte, change son mot de passe provisoire et crée les autres comptes.
5. Désactiver ensuite le compte initial depuis « Comptes », et retirer `ADMIN_PASSWORD` de l'environnement.

## Organisation

- `src/app/` : pages. `(app)/` regroupe les pages protégées, `login/` la connexion.
- `src/actions/` : actions serveur (enregistrements), chacune vérifie la session.
- `src/models/` : schémas Mongoose.
- `src/lib/` : règles métier et utilitaires (dates, statuts, calculs).
- `src/proxy.js` : redirige vers `/login` sans session valide.
- `scripts/` : seed et création du compte gestionnaire.
- `e2e/` : tests Playwright.

## Règles principales

- Un versement est dû du lundi au samedi, au tarif du véhicule conduit. Le montant attendu est figé à la saisie.
- Une affectation couvre `[début, fin[` ; retirer un véhicule le soir laisse la journée due.
- Rien n'est effacé : véhicule « sorti du parc », chauffeur désactivé, dépense ou document supprimé masqué.
- Documents : à renouveler à 30 jours, critiques à 7 jours, puis expirés. Un renouvellement garde l'historique.
