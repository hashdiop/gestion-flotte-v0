import mongoose from 'mongoose';

// Réglages de l'application (un seul document, _id « app »)
const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'app' },
    // Première journée soumise à la clôture ; les journées antérieures restent modifiables librement
    closureStartDate: { type: Date, required: true },
    // Heure (Dakar = UTC) à partir de laquelle le tableau de bord rappelle de clôturer
    closingHour: { type: Number, default: 21, min: 0, max: 23 },
  },
  { timestamps: true }
);

export default mongoose.models.Setting || mongoose.model('Setting', settingSchema);
