'use server';

import mongoose from 'mongoose';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { str, date } from '@/lib/form';
import { todayUTC } from '@/lib/dates';
import { safeNext } from '@/lib/safe-next';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import Vehicle from '@/models/Vehicle';
import VehicleDocument from '@/models/VehicleDocument';

async function parseDocument(fd) {
  const type = str(fd, 'type');
  const data = {
    vehicle: str(fd, 'vehicle'),
    type,
    number: str(fd, 'number'),
    expiresAt: DOCUMENT_TYPES[type]?.expires ? date(fd, 'expiresAt') : null,
    verifiedAt: date(fd, 'verifiedAt'),
    verifiedBy: str(fd, 'verifiedBy'),
    notes: str(fd, 'notes'),
  };
  const errors = {};
  if (!mongoose.isValidObjectId(data.vehicle)) errors.vehicle = 'Choisis le véhicule.';
  else if (!(await Vehicle.exists({ _id: data.vehicle }))) errors.vehicle = 'Véhicule introuvable.';
  if (!DOCUMENT_TYPES[type]) errors.type = 'Choisis le type de document.';
  else if (DOCUMENT_TYPES[type].expires) {
    if (!data.expiresAt) errors.expiresAt = 'Date d’expiration obligatoire pour ce document.';
    else if (Number.isNaN(data.expiresAt.getTime())) errors.expiresAt = 'Date invalide.';
  }
  if (!data.verifiedAt || Number.isNaN(data.verifiedAt.getTime())) errors.verifiedAt = 'Date de vérification obligatoire.';
  else if (data.verifiedAt > todayUTC()) errors.verifiedAt = 'La vérification ne peut pas être dans le futur.';
  if (!data.verifiedBy) errors.verifiedBy = 'Indique qui a vérifié le document.';
  return { data, errors };
}

function done(vehicleId, next) {
  revalidatePath('/documents');
  revalidatePath('/vehicules', 'layout');
  redirect(safeNext(next || `/vehicules/${vehicleId}`));
}

export async function createDocument(prevState, formData) {
  await requireSession('editDocuments');
  await connectDB();
  const { data, errors } = await parseDocument(formData);
  if (Object.keys(errors).length) return { errors };
  await VehicleDocument.create(data);
  done(data.vehicle, str(formData, 'next'));
}

export async function updateDocument(id, prevState, formData) {
  await requireSession('editDocuments');
  if (!mongoose.isValidObjectId(id)) return { errors: { form: 'Document introuvable.' } };
  await connectDB();
  const { data, errors } = await parseDocument(formData);
  if (Object.keys(errors).length) return { errors };
  const res = await VehicleDocument.updateOne({ _id: id, deletedAt: null }, { $set: data }, { runValidators: true });
  if (!res.matchedCount) return { errors: { form: 'Document introuvable.' } };
  done(data.vehicle, str(formData, 'next'));
}

// Suppression d'une saisie erronée : masquée partout, conservée en base
export async function deleteDocument(id, next) {
  await requireSession('editDocuments');
  if (!mongoose.isValidObjectId(id)) return;
  await connectDB();
  const doc = await VehicleDocument.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: { deletedAt: new Date() } });
  done(doc?.vehicle, next || (doc ? `/vehicules/${doc.vehicle}` : '/documents'));
}
