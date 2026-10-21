'use server';

import mongoose from 'mongoose';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { str, int, formValues, isDuplicateKey } from '@/lib/form';
import { VEHICLE_TRANSITIONS } from '@/lib/vehicle-status';
import { endCurrentAssignment } from '@/lib/assignments';
import { addDays, todayUTC } from '@/lib/dates';
import Vehicle from '@/models/Vehicle';

function parseVehicle(fd) {
  const data = {
    plate: str(fd, 'plate').toUpperCase().replace(/\s+/g, ' '),
    brand: str(fd, 'brand'),
    model: str(fd, 'model'),
    year: int(fd, 'year'),
    color: str(fd, 'color'),
    mileage: int(fd, 'mileage'),
    dailyRate: int(fd, 'dailyRate'),
    notes: str(fd, 'notes'),
  };
  const errors = {};
  const nextYear = new Date().getFullYear() + 1;
  if (!data.plate) errors.plate = 'Immatriculation obligatoire.';
  if (!data.brand) errors.brand = 'Marque obligatoire.';
  if (!data.model) errors.model = 'Modèle obligatoire.';
  if (data.year !== null && (Number.isNaN(data.year) || data.year < 1980 || data.year > nextYear)) {
    errors.year = `Année entre 1980 et ${nextYear}.`;
  }
  if (data.mileage !== null && (Number.isNaN(data.mileage) || data.mileage < 0)) {
    errors.mileage = 'Kilométrage invalide.';
  }
  if (data.dailyRate === null || Number.isNaN(data.dailyRate) || data.dailyRate <= 0) {
    errors.dailyRate = 'Tarif journalier obligatoire, en FCFA.';
  }
  if (data.mileage === null) data.mileage = 0;
  return { data, errors };
}

const DUPLICATE_PLATE = { plate: 'Cette immatriculation existe déjà.' };

export async function createVehicle(prevState, formData) {
  await requireSession();
  const { data, errors } = parseVehicle(formData);
  if (Object.keys(errors).length) return { errors, values: formValues(formData) };

  await connectDB();
  let vehicle;
  try {
    vehicle = await Vehicle.create(data);
  } catch (err) {
    if (isDuplicateKey(err)) return { errors: DUPLICATE_PLATE, values: formValues(formData) };
    throw err;
  }
  revalidatePath('/vehicules');
  redirect(`/vehicules/${vehicle._id}`);
}

export async function updateVehicle(id, prevState, formData) {
  await requireSession();
  if (!mongoose.isValidObjectId(id)) return { errors: { form: 'Véhicule introuvable.' } };
  const { data, errors } = parseVehicle(formData);
  if (Object.keys(errors).length) return { errors, values: formValues(formData) };

  await connectDB();
  try {
    const res = await Vehicle.updateOne({ _id: id }, { $set: data }, { runValidators: true });
    if (!res.matchedCount) return { errors: { form: 'Véhicule introuvable.' } };
  } catch (err) {
    if (isDuplicateKey(err)) return { errors: DUPLICATE_PLATE, values: formValues(formData) };
    throw err;
  }
  revalidatePath('/vehicules');
  redirect(`/vehicules/${id}`);
}

export async function setVehicleStatus(id, formData) {
  await requireSession();
  if (!mongoose.isValidObjectId(id)) return;
  const status = str(formData, 'status');

  await connectDB();
  const vehicle = await Vehicle.findById(id);
  if (!vehicle || !VEHICLE_TRANSITIONS[vehicle.status]?.includes(status)) return;
  vehicle.status = status;
  await vehicle.save();
  // Un véhicule sorti du parc n'a plus de chauffeur. En atelier ou immobilisé, il garde le sien.
  if (status === 'sorti_du_parc') await endCurrentAssignment({ vehicle: id }, addDays(todayUTC(), 1));
  revalidatePath('/vehicules');
  revalidatePath(`/vehicules/${id}`);
}
