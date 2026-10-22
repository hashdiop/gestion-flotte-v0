// Sans import : utilisé par le modèle (scripts Node) et par les composants client.

export const ROLES = {
  admin: { label: 'Admin', tone: 'info', hint: 'Tout, y compris les comptes, la clôture et les corrections après clôture' },
  gestionnaire: { label: 'Gestionnaire', tone: 'ok', hint: 'Véhicules, chauffeurs, affectations, versements, dépenses, documents' },
  agent: { label: 'Agent', tone: 'neu', hint: 'Consultation et saisie des versements du jour' },
};

export const ROLE_KEYS = Object.keys(ROLES);

// Qui peut faire quoi. Vérifié côté serveur dans chaque action ; les écrans masquent en plus les boutons.
export const PERMISSIONS = {
  manageUsers: ['admin'],
  closeDay: ['admin'],
  adjustClosed: ['admin'], // écritures correctrices sur une journée clôturée
  editFleet: ['admin', 'gestionnaire'], // véhicules, chauffeurs, affectations, statuts
  editExpenses: ['admin', 'gestionnaire'],
  editDocuments: ['admin', 'gestionnaire'],
  recordPayment: ['admin', 'gestionnaire', 'agent'], // l'agent : seulement la journée en cours
  recordPastPayment: ['admin', 'gestionnaire'],
};

export const can = (user, permission) => Boolean(user && PERMISSIONS[permission]?.includes(user.role));

// Longueur minimale d'un mot de passe
export const MIN_PASSWORD = 8;
