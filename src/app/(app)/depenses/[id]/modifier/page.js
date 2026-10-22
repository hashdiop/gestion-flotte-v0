import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ExpenseForm from '@/components/ExpenseForm';
import { deleteExpense, updateExpense } from '@/actions/expenses';
import { connectDB } from '@/lib/db';
import { dayKey, todayUTC } from '@/lib/dates';
import { vehicleOptions } from '@/lib/vehicle-options';
import Expense from '@/models/Expense';

export const metadata = { title: 'Modifier une dépense · Gestion de flotte' };

export default async function EditExpensePage({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const x = await Expense.findOne({ _id: id, deletedAt: null }).lean();
  if (!x) notFound();
  const vehicles = await vehicleOptions(x.vehicle);
  const back = `/depenses?mois=${dayKey(x.date).slice(0, 7)}`;

  return (
    <>
      <Link href={back} className="back"><ArrowLeft size={15} aria-hidden="true" />Dépenses</Link>
      <PageHeader title="Modifier la dépense" />
      <ExpenseForm
        action={updateExpense.bind(null, id)}
        deleteAction={deleteExpense.bind(null, id)}
        initial={{
          type: x.type,
          vehicle: x.vehicle ? String(x.vehicle) : '',
          category: x.category,
          amount: x.amount,
          date: dayKey(x.date),
          description: x.description ?? '',
        }}
        vehicles={vehicles}
        today={dayKey(todayUTC())}
        submitLabel="Enregistrer"
        cancelHref={back}
      />
    </>
  );
}
