'use server';

import mongoose from 'mongoose';
import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { requireSession } from '@/lib/session';
import { str } from '@/lib/form';
import { ROLES } from '@/lib/roles';
import User from '@/models/User';

// Mot de passe provisoire lisible (sans 0/O, 1/l/I), à transmettre au titulaire du compte
function temporaryPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join('');
}

// Le dernier admin actif ne peut être ni désactivé ni rétrogradé
async function isLastActiveAdmin(userId) {
  const others = await User.countDocuments({ _id: { $ne: userId }, role: 'admin', active: true });
  return others === 0;
}

// Création d'un compte avec mot de passe provisoire (à changer à la première connexion)
export async function createUser(prevState, formData) {
  const admin = await requireSession('manageUsers');
  const name = str(formData, 'name');
  const email = str(formData, 'email').toLowerCase();
  const role = str(formData, 'role');

  const errors = {};
  if (!name) errors.name = 'Nom obligatoire.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'E-mail invalide.';
  if (!ROLES[role]) errors.role = 'Choisis un rôle.';
  if (Object.keys(errors).length) return { errors };

  await connectDB();
  if (await User.exists({ email })) return { errors: { email: 'Un compte existe déjà avec cet e-mail.' } };
  const password = temporaryPassword();
  await User.create({ name, email, role, passwordHash: await hashPassword(password), mustChangePassword: true, createdBy: admin.name });

  revalidatePath('/comptes');
  return { ok: true, ts: Date.now(), created: { name, email, password } };
}

// Changement de rôle ; la session du compte expire pour que le nouveau rôle s'applique tout de suite
export async function changeUserRole(id, prevState, formData) {
  const admin = await requireSession('manageUsers');
  const role = str(formData, 'role');
  if (!mongoose.isValidObjectId(id) || !ROLES[role]) return { error: 'Rôle invalide.' };
  await connectDB();
  const user = await User.findById(id);
  if (!user) return { error: 'Compte introuvable.' };
  if (user.role === role) return { ok: true, ts: Date.now() };
  if (user.role === 'admin' && user.active && (await isLastActiveAdmin(user._id))) {
    return { error: 'C’est le dernier admin actif : nomme d’abord un autre admin.' };
  }
  if (String(user._id) === admin.uid) return { error: 'Tu ne peux pas changer ton propre rôle.' };
  user.role = role;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();
  revalidatePath('/comptes');
  return { ok: true, ts: Date.now() };
}

// Désactivation (jamais de suppression : l'historique garde son nom) ou réactivation
export async function setUserActive(id, formData) {
  const admin = await requireSession('manageUsers');
  const active = str(formData, 'active') === 'true';
  if (!mongoose.isValidObjectId(id)) return { error: 'Compte introuvable.' };
  await connectDB();
  const user = await User.findById(id);
  if (!user) return { error: 'Compte introuvable.' };
  if (!active) {
    if (String(user._id) === admin.uid) return { error: 'Tu ne peux pas désactiver ton propre compte.' };
    if (user.role === 'admin' && (await isLastActiveAdmin(user._id))) {
      return { error: 'C’est le dernier admin actif : nomme d’abord un autre admin.' };
    }
  }
  user.active = active;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1; // déconnecte le compte s'il est ouvert quelque part
  await user.save();
  revalidatePath('/comptes');
  return { ok: true };
}

// Nouveau mot de passe provisoire ; les sessions ouvertes du compte expirent
export async function resetUserPassword(id) {
  await requireSession('manageUsers');
  if (!mongoose.isValidObjectId(id)) return { error: 'Compte introuvable.' };
  await connectDB();
  const user = await User.findById(id);
  if (!user) return { error: 'Compte introuvable.' };
  const password = temporaryPassword();
  user.passwordHash = await hashPassword(password);
  user.mustChangePassword = true;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();
  revalidatePath('/comptes');
  return { ok: true, ts: Date.now(), reset: { name: user.name, email: user.email, password } };
}
