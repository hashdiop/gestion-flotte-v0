import mongoose from 'mongoose';
// Enregistre les modèles référencés, nécessaires à populate()
import './Driver.js';
import './Vehicle.js';

// Écriture correctrice sur une journée clôturée (règles de gestion §13). La journée clôturée n'est
// jamais modifiée : on ajoute un écart à son attendu et/ou à son versé, avec un motif.
//   correction    : erreur de saisie constatée après coup (pas de mouvement de caisse)
//   remboursement : le chauffeur rembourse plus tard un manque de cette journée ; l'argent
//                   entre dans la caisse du jour de la saisie (entryDate)
const paymentAdjustmentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['correction', 'remboursement'], required: true },
    targetDate: { type: Date, required: true }, // journée clôturée corrigée
    entryDate: { type: Date, required: true }, // journée où l'écriture est passée
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    deltaExpected: { type: Number, default: 0 },
    deltaPaid: { type: Number, default: 0 },
    method: { type: String, enum: ['especes', 'mobile_money', null], default: null }, // remboursement uniquement
    reason: { type: String, required: true, trim: true },
    by: { type: String, required: true },
  },
  { timestamps: true }
);

paymentAdjustmentSchema.index({ targetDate: 1, driver: 1 });
paymentAdjustmentSchema.index({ entryDate: 1 });

export default mongoose.models.PaymentAdjustment || mongoose.model('PaymentAdjustment', paymentAdjustmentSchema);
