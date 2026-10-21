import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    hiredAt: { type: Date }, // date d'arrivée dans l'entreprise
    active: { type: Boolean, default: true }, // un chauffeur qui part est désactivé, jamais supprimé
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Driver || mongoose.model('Driver', driverSchema);
