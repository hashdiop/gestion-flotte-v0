import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import DriverForm from '@/components/DriverForm';
import { createDriver } from '@/actions/drivers';
import Denied from '@/components/Denied';
import { can } from '@/lib/roles';
import { getSession } from '@/lib/session';

export const metadata = { title: 'Nouveau chauffeur · Gestion de flotte' };

export default async function NewDriverPage() {
  // Réservé aux rôles autorisés (l'action serveur refuse aussi)
  if (!can(await getSession(), 'editFleet')) return <Denied />;
  return (
    <>
      <Link href="/chauffeurs" className="back"><ArrowLeft size={15} aria-hidden="true" />Chauffeurs</Link>
      <PageHeader title="Nouveau chauffeur" sub="Le véhicule s'affecte depuis la fiche, à l'étape suivante." />
      <DriverForm action={createDriver} submitLabel="Créer le chauffeur" cancelHref="/chauffeurs" />
    </>
  );
}
