import mongoose from 'mongoose';

// Clôture d'une journée : état figé au moment de la clôture (rapport de clôture).
// Les corrections ultérieures ne modifient pas ce document : elles sont des écritures correctrices.
const lineSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    driverName: String,
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    plate: String,
    expected: Number,
    paid: Number,
    method: String,
    status: String, // libellé affiché (Payé, Partiel −3 000, Non versé, Non dû…)
    note: String,
    convertedAtClosure: Boolean, // ligne non saisie, passée en « Non versé » par la clôture
  },
  { _id: false }
);

const dayClosureSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    closedAt: { type: Date, required: true },
    closedBy: { type: String, required: true },
    expected: { type: Number, required: true },
    paid: { type: Number, required: true },
    missingCount: { type: Number, default: 0 }, // lignes « Non versé »
    convertedCount: { type: Number, default: 0 }, // dont passées en « Non versé » par la clôture
    byMethod: { especes: { type: Number, default: 0 }, mobile_money: { type: Number, default: 0 } },
    // Caisse : espèces enregistrées (versements + remboursements du jour) contre espèces comptées
    cashExpected: { type: Number, required: true },
    cashCounted: { type: Number, required: true },
    note: { type: String, trim: true },
    lines: [lineSchema],
  },
  { timestamps: true }
);

export default mongoose.models.DayClosure || mongoose.model('DayClosure', dayClosureSchema);
