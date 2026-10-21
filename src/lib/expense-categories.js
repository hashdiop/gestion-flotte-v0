// Sans import : utilisé par le modèle (scripts Node) et par les composants client.
// Une dépense « véhicule » est rattachée à un véhicule ; une dépense « divers » concerne l'entreprise.
export const EXPENSE_TYPES = { vehicule: 'Véhicule', divers: 'Divers' };

export const EXPENSE_CATEGORIES = {
  vehicule: {
    carburant: 'Carburant',
    entretien: 'Entretien (vidange, filtres…)',
    reparation: 'Réparation',
    pieces: 'Pièces',
    pneus: 'Pneus',
    lavage: 'Lavage',
    assurance: 'Assurance',
    visite_technique: 'Visite technique',
    vignette_taxes: 'Vignette et taxes',
    amende: 'Amende',
    autre_vehicule: 'Autre (véhicule)',
  },
  divers: {
    loyer: 'Loyer',
    salaires: 'Salaires',
    eau_electricite: 'Eau et électricité',
    telephone_internet: 'Téléphone et internet',
    fournitures: 'Fournitures',
    frais_bancaires: 'Frais bancaires',
    autre_divers: 'Autre (divers)',
  },
};

export const categoryLabel = (key) => EXPENSE_CATEGORIES.vehicule[key] ?? EXPENSE_CATEGORIES.divers[key] ?? key;
