'use server';

import mongoose from 'mongoose';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { str, int, date, formValues, isDuplicateKey } from '@/lib/form';
import { formatDate } from '@/lib/format';
import { lastChangeDate, recordStatusChange } from '@/lib/vehicle-status-history';
import { lockError } from '@/lib/closure';
import { VEHICLE_TRANSITIONS } from '@/lib/vehicle-status';
import { endCurrentAssignment } from '@/lib/assignments';
import { addDays, todayUTC } from '@/lib/dates';
import { safeNext } from '@/lib/safe-next';
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
  const next = str(formData, 'next');
  redirect(next ? safeNext(next) : `/vehicules/${id}`);
}

// Change le statut d'un véhicule à partir d'une date (aujourd'hui par défaut) et l'inscrit dans l'historique.
// Les journées passées en atelier ou immobilisé deviennent non dues (voir lib/day-rows.js).
export async function changeVehicleStatus(id, prevState, formData) {
  await requireSession();
  if (!mongoose.isValidObjectId(id)) return { error: 'Véhicule introuvable.' };
  const status = str(formData, 'status');
  const today = todayUTC();
  const from = date(formData, 'date') ?? today;
  const reason = str(formData, 'reason');
  if (Number.isNaN(from.getTime())) return { error: 'Date invalide.' };
  if (from > today) return { error: 'Le changement ne peut pas être daté dans le futur.' };

  await connectDB();
  // Un statut antidaté ne peut pas changer ce qui était dû sur une journée clôturée.
  // Aujourd'hui reste permis même après la clôture du soir : les lignes du jour sont déjà figées.
  const locked = from < today ? await lockError(from) : null;
  if (locked) return { error: locked };
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) return { error: 'Véhicule introuvable.' };
  if (!VEHICLE_TRANSITIONS[vehicle.status]?.includes(status)) return { error: 'Ce changement de statut n’est pas autorisé.' };
  const last = await lastChangeDate(vehicle._id);
  if (last && from < last) return { error: `La date doit être au plus tôt le ${formatDate(last)}, dernier changement enregistré.` };

  await recordStatusChange(vehicle, status, from, reason);
  vehicle.status = status;
  await vehicle.save();
  // Un véhicule sorti du parc n'a plus de chauffeur (la journée de sortie reste due).
  // En atelier ou immobilisé, il garde le sien : ces journées sont simplement non dues.
  if (status === 'sorti_du_parc') await endCurrentAssignment({ vehicle: id }, addDays(from, 1));
  revalidatePath('/', 'layout');
  return { ok: true, ts: Date.now() };
}

// Variante pour un simple <form action> (actions rapides de la liste) : changement daté d'aujourd'hui
export async function setVehicleStatus(id, formData) {
  await changeVehicleStatus(id, null, formData);
}
