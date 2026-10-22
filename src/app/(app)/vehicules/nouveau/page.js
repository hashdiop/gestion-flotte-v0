import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import VehicleForm from '@/components/VehicleForm';
import { createVehicle } from '@/actions/vehicles';
import Denied from '@/components/Denied';
import { can } from '@/lib/roles';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Nouveau véhicule · Gestion de flotte' };

export default async function NewVehiclePage() {
  // Réservé aux rôles autorisés (l'action serveur refuse aussi)
  if (!can(await getSession(), 'editFleet')) return <Denied />;
  return (
    <>
      <Link href="/vehicules" className="back"><ArrowLeft size={15} aria-hidden="true" />Véhicules</Link>
      <PageHeader title="Nouveau véhicule" sub="Le véhicule sera créé « en service »." />
      <VehicleForm action={createVehicle} submitLabel="Créer le véhicule" cancelHref="/vehicules" />
    </>
  );
}
