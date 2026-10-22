import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import VehicleForm from '@/components/VehicleForm';
import { updateVehicle } from '@/actions/vehicles';
import { connectDB } from '@/lib/db';
import { safeNext } from '@/lib/safe-next';
import Vehicle from '@/models/Vehicle';

export default async function EditVehiclePage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
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

  // Ouvert depuis la liste (actions rapides) : on y revient après l'enregistrement
  const next = sp.next ? safeNext(sp.next) : '';
  const back = next || `/vehicules/${id}`;

  return (
    <>
      <Link href={back} className="back"><ArrowLeft size={15} aria-hidden="true" />{next ? 'Véhicules' : v.plate}</Link>
      <PageHeader title={`Modifier ${v.plate}`} sub={`${v.brand} ${v.model}`} />
      <VehicleForm action={updateVehicle.bind(null, id)} initial={initial} submitLabel="Enregistrer" cancelHref={back} next={next} />
    </>
  );
}
