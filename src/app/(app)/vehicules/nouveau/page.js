import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import VehicleForm from '@/components/VehicleForm';
import { createVehicle } from '@/actions/vehicles';

export const metadata = { title: 'Nouveau véhicule · Gestion de flotte' };

export default function NewVehiclePage() {
  return (
    <>
      <Link href="/vehicules" className="back"><ArrowLeft size={15} aria-hidden="true" />Véhicules</Link>
      <PageHeader title="Nouveau véhicule" sub="Le véhicule sera créé « en service »." />
      <VehicleForm action={createVehicle} submitLabel="Créer le véhicule" cancelHref="/vehicules" />
    </>
  );
}
