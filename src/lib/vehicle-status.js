// Statuts d'un véhicule (règles de gestion §2.2, sans « en préparation » pour la V0)
export const VEHICLE_STATUS = {
  en_service: { label: 'En service', tone: 'ok' },
  en_atelier: { label: 'En atelier', tone: 'info' },
  immobilise: { label: 'Immobilisé', tone: 'warn' },
  sorti_du_parc: { label: 'Sorti du parc', tone: 'neu' },
};

export const VEHICLE_STATUS_KEYS = Object.keys(VEHICLE_STATUS);

// Passages autorisés ; « sorti du parc » est un état final
export const VEHICLE_TRANSITIONS = {
  en_service: ['en_atelier', 'immobilise', 'sorti_du_parc'],
  en_atelier: ['en_service', 'immobilise'],
  immobilise: ['en_atelier', 'en_service', 'sorti_du_parc'],
  sorti_du_parc: [],
};
