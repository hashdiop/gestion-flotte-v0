import mongoose from 'mongoose';
// Enregistre les modèles référencés, nécessaires à populate()
import './Driver.js';
import './Vehicle.js';

// Affectation d'un véhicule à un chauffeur sur la période [startDate, endDate[ :
// le jour de fin appartient déjà à l'affectation suivante. endDate vide = affectation en cours.
const assignmentSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    current: { type: Boolean, default: true },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

// Un chauffeur n'a qu'un véhicule en cours, et un véhicule qu'un chauffeur en cours
assignmentSchema.index({ driver: 1 }, { unique: true, partialFilterExpression: { current: true }, name: 'one_current_per_driver' });
assignmentSchema.index({ vehicle: 1 }, { unique: true, partialFilterExpression: { current: true }, name: 'one_current_per_vehicle' });

export default mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
