import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, EXPENSE_TYPES } from '../lib/expense-categories.js';
// Enregistre le modèle référencé, nécessaire à populate()
import './Vehicle.js';

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: Object.keys(EXPENSE_TYPES), required: true },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
      // Obligatoire pour une dépense véhicule, absent pour une dépense diverse
      validate: {
        validator(v) {
          return this.type === 'vehicule' ? Boolean(v) : !v;
        },
        message: 'Véhicule obligatoire pour une dépense véhicule, interdit pour une dépense diverse.',
      },
    },
    category: {
      type: String,
      required: true,
      validate: {
        validator(c) {
          return Boolean(EXPENSE_CATEGORIES[this.type]?.[c]);
        },
        message: 'Catégorie incompatible avec le type de dépense.',
      },
    },
    amount: { type: Number, required: true, min: 1 }, // FCFA
    description: { type: String, trim: true },
    // Une dépense supprimée disparaît des écrans mais reste en base (règle « rien n'est effacé »)
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ vehicle: 1, date: -1 });

export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
