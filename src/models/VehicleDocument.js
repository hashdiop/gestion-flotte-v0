import mongoose from 'mongoose';
import { DOCUMENT_TYPES } from '../lib/document-types.js';
// Enregistre le modèle référencé, nécessaire à populate()
import './Vehicle.js';

// Un enregistrement par pièce vérifiée. Un renouvellement ajoute un nouvel enregistrement :
// l'historique reste, et le document « en vigueur » est le plus récent (expiration la plus lointaine).
// Aucune copie numérique n'est conservée (règles de gestion §12).
const vehicleDocumentSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    type: { type: String, enum: Object.keys(DOCUMENT_TYPES), required: true },
    number: { type: String, trim: true }, // n° de police, de carte grise…
    expiresAt: { type: Date, default: null }, // vide pour un document sans échéance (carte grise)
    verifiedAt: { type: Date, required: true },
    verifiedBy: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.VehicleDocument || mongoose.model('VehicleDocument', vehicleDocumentSchema);
