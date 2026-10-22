'use server';

import mongoose from 'mongoose';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { str, date, formValues } from '@/lib/form';
import { endCurrentAssignment } from '@/lib/assignments';
import { addDays, todayUTC } from '@/lib/dates';
import { safeNext } from '@/lib/safe-next';
import Driver from '@/models/Driver';

function parseDriver(fd) {
  const data = {
    firstName: str(fd, 'firstName'),
    lastName: str(fd, 'lastName'),
    phone: str(fd, 'phone'),
    address: str(fd, 'address'),
    hiredAt: date(fd, 'hiredAt'),
    notes: str(fd, 'notes'),
  };
  const errors = {};
  if (!data.firstName) errors.firstName = 'Prénom obligatoire.';
  if (!data.lastName) errors.lastName = 'Nom obligatoire.';
  if (!data.phone) errors.phone = 'Téléphone obligatoire.';
  else if (!/^[+\d][\d\s.-]{5,}$/.test(data.phone)) errors.phone = 'Numéro invalide.';
  if (data.hiredAt && Number.isNaN(data.hiredAt.getTime())) errors.hiredAt = 'Date invalide.';
  else if (data.hiredAt && data.hiredAt > new Date()) errors.hiredAt = 'La date d’arrivée ne peut pas être future.';
  return { data, errors };
}

export async function createDriver(prevState, formData) {
  await requireSession();
  const { data, errors } = parseDriver(formData);
  if (Object.keys(errors).length) return { errors, values: formValues(formData) };

  await connectDB();
  const driver = await Driver.create(data);
  revalidatePath('/chauffeurs');
  redirect(`/chauffeurs/${driver._id}`);
}

export async function updateDriver(id, prevState, formData) {
  await requireSession();
  if (!mongoose.isValidObjectId(id)) return { errors: { form: 'Chauffeur introuvable.' } };
  const { data, errors } = parseDriver(formData);
  if (Object.keys(errors).length) return { errors, values: formValues(formData) };

  await connectDB();
  const res = await Driver.updateOne({ _id: id }, { $set: data }, { runValidators: true });
  if (!res.matchedCount) return { errors: { form: 'Chauffeur introuvable.' } };
  revalidatePath('/chauffeurs');
  const next = str(formData, 'next');
  redirect(next ? safeNext(next) : `/chauffeurs/${id}`);
}

export async function setDriverActive(id, formData) {
  await requireSession();
  if (!mongoose.isValidObjectId(id)) return;
  const active = str(formData, 'active') === 'true';

  await connectDB();
  await Driver.updateOne({ _id: id }, { $set: { active } });
  // Un chauffeur qui part rend son véhicule
  if (!active) await endCurrentAssignment({ driver: id }, addDays(todayUTC(), 1));
  revalidatePath('/chauffeurs');
  revalidatePath(`/chauffeurs/${id}`);
}
