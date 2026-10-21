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
