import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import mongoose from 'mongoose';
import PageHeader from '@/components/PageHeader';
import DocumentForm from '@/components/DocumentForm';
import { createDocument } from '@/actions/documents';
import { connectDB } from '@/lib/db';
import { dayKey, todayUTC } from '@/lib/dates';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { vehicleOptions } from '@/lib/vehicle-options';
import { getSession } from '@/lib/session';
import { safeNext } from '@/lib/safe-next';
import Denied from '@/components/Denied';
import { can } from '@/lib/roles';

export const metadata = { title: 'Nouveau document · Gestion de flotte' };

// ?vehicule=…&type=… préremplissent le formulaire (bouton « Renouveler » ou « Ajouter »)
export default async function NewDocumentPage({ searchParams }) {
  // Réservé aux rôles autorisés (l'action serveur refuse aussi)
  if (!can(await getSession(), 'editDocuments')) return <Denied />;
  const { vehicule, type, next } = await searchParams;
  await connectDB();
  const [vehicles, session] = await Promise.all([vehicleOptions(), getSession()]);
  const vehicle = mongoose.isValidObjectId(vehicule) && vehicles.some((v) => v.value === vehicule) ? vehicule : '';
  const back = safeNext(next || (vehicle ? `/vehicules/${vehicle}` : '/documents'));
  const renewing = vehicle && DOCUMENT_TYPES[type];

  return (
    <>
      <Link href={back} className="back"><ArrowLeft size={15} aria-hidden="true" />Retour</Link>
      <PageHeader
        title={renewing ? `${DOCUMENT_TYPES[type].label} : nouvelle vérification` : 'Nouveau document'}
        sub={renewing ? 'Le document précédent reste dans l’historique.' : undefined}
      />
      <DocumentForm
        action={createDocument}
        initial={{ vehicle, type: DOCUMENT_TYPES[type] ? type : '', verifiedBy: session?.name }}
        vehicles={vehicles}
        today={dayKey(todayUTC())}
        next={back}
        submitLabel="Enregistrer"
        cancelHref={back}
      />
    </>
  );
}
