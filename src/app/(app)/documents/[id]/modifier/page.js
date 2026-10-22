import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DocumentForm from '@/components/DocumentForm';
import { deleteDocument, updateDocument } from '@/actions/documents';
import { connectDB } from '@/lib/db';
import { dayKey, todayUTC } from '@/lib/dates';
import { vehicleOptions } from '@/lib/vehicle-options';
import { safeNext } from '@/lib/safe-next';
import VehicleDocument from '@/models/VehicleDocument';

export const metadata = { title: 'Modifier un document · Gestion de flotte' };

export default async function EditDocumentPage({ params, searchParams }) {
  const { id } = await params;
  const { next } = await searchParams;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const doc = await VehicleDocument.findOne({ _id: id, deletedAt: null }).lean();
  if (!doc) notFound();
  const vehicles = await vehicleOptions(doc.vehicle);
  const back = safeNext(next || `/vehicules/${doc.vehicle}`);

  return (
    <>
      <Link href={back} className="back"><ArrowLeft size={15} aria-hidden="true" />Retour</Link>
      <PageHeader title="Modifier le document" sub="Pour corriger une saisie. Un renouvellement s’enregistre comme un nouveau document." />
      <DocumentForm
        action={updateDocument.bind(null, id)}
        deleteAction={deleteDocument.bind(null, id, back)}
        initial={{
          vehicle: String(doc.vehicle),
          type: doc.type,
          number: doc.number ?? '',
          expiresAt: doc.expiresAt ? dayKey(doc.expiresAt) : '',
          verifiedAt: dayKey(doc.verifiedAt),
          verifiedBy: doc.verifiedBy,
          notes: doc.notes ?? '',
        }}
        vehicles={vehicles}
        today={dayKey(todayUTC())}
        next={back}
        submitLabel="Enregistrer"
        cancelHref={back}
      />
    </>
  );
}
