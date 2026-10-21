'use server';

import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { createSession, deleteSession } from '@/lib/session';
import { safeNext } from '@/lib/safe-next';
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

  await createSession(user);
  redirect(next);
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
