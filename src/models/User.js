import mongoose from 'mongoose';
import { ROLE_KEYS } from '../lib/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    // Moindre privilège par défaut ; le premier admin est créé par « npm run user:admin »
    role: { type: String, enum: ROLE_KEYS, default: 'agent' },
    active: { type: Boolean, default: true }, // un compte n'est jamais supprimé : il est désactivé
    // Mot de passe provisoire (création, réinitialisation) : à changer à la prochaine connexion
    mustChangePassword: { type: Boolean, default: false },
    // Incrémenté à chaque changement de mot de passe, de rôle ou désactivation : les sessions ouvertes expirent
    sessionVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true }
);

// En développement, le rechargement à chaud garde l'ancien modèle compilé : s'il date d'avant
// l'ajout des rôles et de sessionVersion, on le recompile avec le schéma actuel.
if (mongoose.models.User && !mongoose.models.User.schema.path('sessionVersion')) mongoose.deleteModel('User');

export default mongoose.models.User || mongoose.model('User', userSchema);
