'use server';

import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, deleteSession, requireSession } from '@/lib/session';
import { safeNext } from '@/lib/safe-next';
import { str } from '@/lib/form';
import { MIN_PASSWORD } from '@/lib/roles';
import User from '@/models/User';

export async function login(prevState, formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const next = safeNext(String(formData.get('next') || '/'));

  if (!email || !password) {
    return { error: 'Renseigne l’e-mail et le mot de passe.', email };
  }

  await connectDB();
  const user = await User.findOne({ email, active: true }).select('+passwordHash');
  const ok = user && (await verifyPassword(password, user.passwordHash));
  if (!ok) {
    return { error: 'E-mail ou mot de passe incorrect.', email };
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  await createSession(user);
  // Mot de passe provisoire : on passe d'abord par « Mon compte »
  redirect(user.mustChangePassword ? '/mon-compte' : next);
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}

// Changement de son propre mot de passe. Les autres sessions de ce compte expirent ;
// celle-ci est renouvelée pour rester connecté.
export async function changeOwnPassword(prevState, formData) {
  const session = await requireSession('self');
  const current = str(formData, 'current');
  const next = String(formData.get('next') || '');
  const confirm = String(formData.get('confirm') || '');

  if (!current) return { errors: { current: 'Indique ton mot de passe actuel.' } };
  if (next.length < MIN_PASSWORD) return { errors: { next: `${MIN_PASSWORD} caractères minimum.` } };
  if (next !== confirm) return { errors: { confirm: 'Les deux mots de passe ne correspondent pas.' } };
  if (next === current) return { errors: { next: 'Choisis un mot de passe différent de l’actuel.' } };

  await connectDB();
  const user = await User.findById(session.uid).select('+passwordHash');
  if (!user || !(await verifyPassword(current, user.passwordHash))) return { errors: { current: 'Mot de passe actuel incorrect.' } };

  user.passwordHash = await hashPassword(next);
  user.mustChangePassword = false;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  await user.save();
  await createSession(user);
  return { ok: true, ts: Date.now() };
}
