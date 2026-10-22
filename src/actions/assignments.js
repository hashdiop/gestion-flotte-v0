'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { str, date, isDuplicateKey } from '@/lib/form';
import { addDays, todayUTC } from '@/lib/dates';
import { endCurrentAssignment } from '@/lib/assignments';
import { lockError } from '@/lib/closure';
import { formatDate } from '@/lib/format';
import Assignment from '@/models/Assignment';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';

// Affecte un véhicule à un chauffeur à partir d'une date.
// Les affectations en cours du chauffeur et du véhicule sont closes à cette date.
export async function assignVehicle(prevState, formData) {
  await requireSession();
  const driverId = str(formData, 'driverId');
  const vehicleId = str(formData, 'vehicleId');
  const startDate = date(formData, 'startDate') ?? todayUTC();
  const reason = str(formData, 'reason');

  if (!mongoose.isValidObjectId(driverId)) return { errors: { driverId: 'Choisis un chauffeur.' } };
  if (!mongoose.isValidObjectId(vehicleId)) return { errors: { vehicleId: 'Choisis un véhicule.' } };
  if (Number.isNaN(startDate.getTime())) return { errors: { startDate: 'Date invalide.' } };
  if (startDate > todayUTC()) return { errors: { startDate: 'L’affectation ne peut pas commencer dans le futur.' } };

  await connectDB();
  // Une affectation antidatée ne peut pas réécrire une journée clôturée.
  // Aujourd'hui reste permis même après la clôture du soir : les lignes du jour sont déjà figées.
  const locked = startDate < todayUTC() ? await lockError(startDate) : null;
  if (locked) return { errors: { startDate: locked } };
  const [driver, vehicle] = await Promise.all([Driver.findById(driverId).lean(), Vehicle.findById(vehicleId).lean()]);
  if (!driver?.active) return { errors: { driverId: 'Ce chauffeur est introuvable ou désactivé.' } };
  if (!vehicle) return { errors: { vehicleId: 'Véhicule introuvable.' } };
  if (vehicle.status !== 'en_service') return { errors: { vehicleId: 'Seul un véhicule « en service » peut être affecté.' } };

  const [driverCur, vehicleCur] = await Promise.all([
    Assignment.findOne({ driver: driverId, current: true }),
    Assignment.findOne({ vehicle: vehicleId, current: true }),
  ]);
  if (driverCur && String(driverCur.vehicle) === vehicleId) {
    return { errors: { form: `${vehicle.plate} est déjà affecté à ce chauffeur.` } };
  }
  // Affectations du chauffeur ou du véhicule qui couvrent encore la date de début :
  // celles en cours, et celles retirées aujourd'hui (elles couvrent la journée jusqu'à ce soir)
  const overlapping = await Assignment.find({
    $or: [{ driver: driverId }, { vehicle: vehicleId }],
    $and: [{ $or: [{ current: true }, { endDate: { $gt: startDate } }] }],
  });
  const latestStart = overlapping.reduce((max, a) => (a.startDate > max ? a.startDate : max), new Date(0));
  if (startDate < latestStart) {
    return { errors: { startDate: `La date doit être au plus tôt le ${formatDate(latestStart)}, début de l’affectation en cours.` } };
  }

  for (const a of overlapping) {
    await Assignment.updateOne({ _id: a._id }, { $set: { current: false, endDate: startDate } });
  }
  try {
    await Assignment.create({ driver: driverId, vehicle: vehicleId, startDate, reason });
  } catch (err) {
    if (isDuplicateKey(err)) return { errors: { form: 'Une autre affectation vient d’être enregistrée. Recharge la page.' } };
    throw err;
  }

  revalidatePath('/', 'layout');
  return { success: `${vehicle.plate} affecté à ${driver.firstName} ${driver.lastName} à partir du ${formatDate(startDate)}.`, ts: Date.now() };
}

// Retire le véhicule au chauffeur ce soir : la journée en cours reste due
export async function endAssignment(assignmentId) {
  await requireSession();
  if (!mongoose.isValidObjectId(assignmentId)) return;
  await connectDB();
  await endCurrentAssignment({ _id: assignmentId }, addDays(todayUTC(), 1));
  revalidatePath('/', 'layout');
}
