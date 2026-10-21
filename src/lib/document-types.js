// Sans import : utilisé par le modèle (scripts Node) et par les composants client.
// Documents administratifs exigés pour chaque véhicule (règles de gestion §12).
export const DOCUMENT_TYPES = {
  carte_grise: { label: 'Carte grise', expires: false },
  autorisation_transport: { label: 'Autorisation de transport', expires: true },
  assurance: { label: 'Assurance', expires: true },
  visite_technique: { label: 'Visite technique', expires: true },
  vignette: { label: 'Vignette', expires: true },
};

// Seuils d'alerte, en jours avant l'expiration
export const ALERT_DAYS = { critical: 7, soon: 30 };
