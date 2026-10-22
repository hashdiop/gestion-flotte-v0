import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import DriverForm from '@/components/DriverForm';
import { createDriver } from '@/actions/drivers';

export const metadata = { title: 'Nouveau chauffeur · Gestion de flotte' };

export default function NewDriverPage() {
  return (
    <>
      <Link href="/chauffeurs" className="back"><ArrowLeft size={15} aria-hidden="true" />Chauffeurs</Link>
      <PageHeader title="Nouveau chauffeur" sub="Le véhicule s'affecte depuis la fiche, à l'étape suivante." />
      <DriverForm action={createDriver} submitLabel="Créer le chauffeur" cancelHref="/chauffeurs" />
    </>
  );
}
