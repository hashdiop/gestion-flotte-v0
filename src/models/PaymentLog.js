import mongoose from 'mongoose';

// Journal des versements : chaque saisie, modification, passage en « Non versé » à la clôture,
// correction ou remboursement, avec l'état avant / après, l'auteur et l'heure. Jamais modifié.
const snapshot = { expected: Number, paid: Number, method: String, note: String };

const paymentLogSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // journée concernée
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    action: { type: String, enum: ['saisie', 'modification', 'cloture', 'correction', 'remboursement'], required: true },
    before: { type: snapshot, default: null },
    after: { type: snapshot, default: null },
    reason: { type: String, trim: true },
    by: { type: String, required: true },
  },
  { timestamps: true }
);

paymentLogSchema.index({ date: 1, driver: 1, createdAt: 1 });

export default mongoose.models.PaymentLog || mongoose.model('PaymentLog', paymentLogSchema);
