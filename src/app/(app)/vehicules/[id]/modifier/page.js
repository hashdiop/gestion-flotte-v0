import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import VehicleForm from '@/components/VehicleForm';
import { updateVehicle } from '@/actions/vehicles';
import { connectDB } from '@/lib/db';
import Vehicle from '@/models/Vehicle';

export default async function EditVehiclePage({ params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const v = await Vehicle.findById(id).lean();
  if (!v || v.status === 'sorti_du_parc') notFound();

  const initial = {
    plate: v.plate,
    brand: v.brand,
    model: v.model,
    year: v.year ?? '',
    color: v.color ?? '',
    mileage: v.mileage ?? 0,
    dailyRate: v.dailyRate,
    notes: v.notes ?? '',
  };

  return (
    <>
      <Link href={`/vehicules/${id}`} className="back">← {v.plate}</Link>
      <PageHeader title="Modifier le véhicule" sub={`${v.brand} ${v.model}`} />
      <VehicleForm action={updateVehicle.bind(null, id)} initial={initial} submitLabel="Enregistrer" cancelHref={`/vehicules/${id}`} />
    </>
  );
}
