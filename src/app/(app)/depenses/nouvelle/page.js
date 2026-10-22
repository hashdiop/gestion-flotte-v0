import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import mongoose from 'mongoose';
import PageHeader from '@/components/PageHeader';
import ExpenseForm from '@/components/ExpenseForm';
import { createExpense } from '@/actions/expenses';
import { connectDB } from '@/lib/db';
import { dayKey, todayUTC } from '@/lib/dates';
import { vehicleOptions } from '@/lib/vehicle-options';

export const metadata = { title: 'Nouvelle dépense · Gestion de flotte' };

export default async function NewExpensePage({ searchParams }) {
  const { vehicule } = await searchParams;
  await connectDB();
  const vehicles = await vehicleOptions();
  // Depuis la fiche d'un véhicule : on le présélectionne
  const preset = mongoose.isValidObjectId(vehicule) && vehicles.some((v) => v.value === vehicule) ? vehicule : '';

  return (
    <>
      <Link href={preset ? `/vehicules/${preset}` : '/depenses'} className="back"><ArrowLeft size={15} aria-hidden="true" />{preset ? 'Véhicule' : 'Dépenses'}</Link>
      <PageHeader title="Nouvelle dépense" />
      <ExpenseForm
        action={createExpense}
        initial={{ type: 'vehicule', vehicle: preset }}
        vehicles={vehicles}
        today={dayKey(todayUTC())}
        submitLabel="Enregistrer la dépense"
        cancelHref={preset ? `/vehicules/${preset}` : '/depenses'}
      />
    </>
  );
}
