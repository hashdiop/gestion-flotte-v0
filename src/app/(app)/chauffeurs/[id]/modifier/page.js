import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DriverForm from '@/components/DriverForm';
import { updateDriver } from '@/actions/drivers';
import { connectDB } from '@/lib/db';
import { toDateInput } from '@/lib/format';
import Driver from '@/models/Driver';

export default async function EditDriverPage({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const d = await Driver.findById(id).lean();
  if (!d) notFound();

  const initial = {
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone,
    address: d.address ?? '',
    hiredAt: toDateInput(d.hiredAt),
    notes: d.notes ?? '',
  };

  return (
    <>
      <Link href={`/chauffeurs/${id}`} className="back">← {d.firstName} {d.lastName}</Link>
      <PageHeader title="Modifier le chauffeur" />
      <DriverForm action={updateDriver.bind(null, id)} initial={initial} submitLabel="Enregistrer" cancelHref={`/chauffeurs/${id}`} />
    </>
  );
}
