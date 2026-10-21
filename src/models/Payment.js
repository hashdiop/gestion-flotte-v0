import mongoose from 'mongoose';
import { PAYMENT_METHODS } from '../lib/payment-methods.js';
// Enregistre les modèles référencés, nécessaires à populate()
import './Driver.js';
import './Vehicle.js';

// Versement d'un chauffeur pour une journée. Une seule saisie par chauffeur et par jour.
//   expected = 0          → jour non dû (véhicule en atelier, décision du gestionnaire…)
//   paid = 0              → non versé
//   0 < paid < expected   → partiel
const paymentSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    expected: { type: Number, required: true, min: 0 }, // tarif du véhicule au moment de la saisie
    paid: { type: Number, required: true, min: 0, default: 0 },
    method: { type: String, enum: [...Object.keys(PAYMENT_METHODS), null], default: null },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

paymentSchema.index({ driver: 1, date: 1 }, { unique: true });
paymentSchema.index({ date: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
