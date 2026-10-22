'use server';

import mongoose from 'mongoose';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { str, int, date, formValues } from '@/lib/form';
import { dayKey, todayUTC } from '@/lib/dates';
import { EXPENSE_CATEGORIES, EXPENSE_TYPES } from '@/lib/expense-categories';
import Expense from '@/models/Expense';
import Vehicle from '@/models/Vehicle';

async function parseExpense(fd) {
  const type = str(fd, 'type');
  const data = {
    type,
    vehicle: type === 'vehicule' ? str(fd, 'vehicle') : null,
    category: str(fd, 'category'),
    amount: int(fd, 'amount'),
    date: date(fd, 'date'),
    description: str(fd, 'description'),
  };
  const errors = {};
  if (!EXPENSE_TYPES[type]) errors.type = 'Choisis le type de dépense.';
  if (type === 'vehicule') {
    if (!mongoose.isValidObjectId(data.vehicle)) errors.vehicle = 'Choisis le véhicule.';
    else if (!(await Vehicle.exists({ _id: data.vehicle }))) errors.vehicle = 'Véhicule introuvable.';
  }
  if (!EXPENSE_CATEGORIES[type]?.[data.category]) errors.category = 'Choisis une catégorie.';
  if (data.amount === null || Number.isNaN(data.amount) || data.amount <= 0) errors.amount = 'Montant invalide, en FCFA.';
  if (!data.date || Number.isNaN(data.date.getTime())) errors.date = 'Date invalide.';
  else if (data.date > todayUTC()) errors.date = 'La date ne peut pas être future.';
  return { data, errors };
}

// Après enregistrement, on revient sur la liste du mois de la dépense
const listUrl = (d) => `/depenses?mois=${dayKey(d).slice(0, 7)}`;

export async function createExpense(prevState, formData) {
  await requireSession('editExpenses');
  await connectDB();
  const { data, errors } = await parseExpense(formData);
  if (Object.keys(errors).length) return { errors, values: formValues(formData) };

  await Expense.create(data);
  revalidatePath('/depenses');
  if (data.vehicle) revalidatePath(`/vehicules/${data.vehicle}`);
  redirect(listUrl(data.date));
}

export async function updateExpense(id, prevState, formData) {
  await requireSession('editExpenses');
  if (!mongoose.isValidObjectId(id)) return { errors: { form: 'Dépense introuvable.' } };
  await connectDB();
  const { data, errors } = await parseExpense(formData);
  if (Object.keys(errors).length) return { errors, values: formValues(formData) };

  const expense = await Expense.findOne({ _id: id, deletedAt: null });
  if (!expense) return { errors: { form: 'Dépense introuvable.' } };
  const previousVehicle = expense.vehicle;
  expense.set(data);
  await expense.save(); // save() plutôt que updateOne : les validateurs croisés type/véhicule/catégorie s'appliquent
  revalidatePath('/depenses');
  for (const v of [previousVehicle, data.vehicle]) if (v) revalidatePath(`/vehicules/${v}`);
  redirect(listUrl(data.date));
}

export async function deleteExpense(id) {
  await requireSession('editExpenses');
  if (!mongoose.isValidObjectId(id)) return;
  await connectDB();
  const expense = await Expense.findOneAndUpdate({ _id: id, deletedAt: null }, { $set: { deletedAt: new Date() } });
  revalidatePath('/depenses');
  if (expense?.vehicle) revalidatePath(`/vehicules/${expense.vehicle}`);
  redirect(expense ? listUrl(expense.date) : '/depenses');
}
