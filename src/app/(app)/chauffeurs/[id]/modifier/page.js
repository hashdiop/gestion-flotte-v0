import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DriverForm from '@/components/DriverForm';
import { updateDriver } from '@/actions/drivers';
import { connectDB } from '@/lib/db';
import { safeNext } from '@/lib/safe-next';
import { toDateInput } from '@/lib/format';
import Driver from '@/models/Driver';
import Denied from '@/components/Denied';
import { can } from '@/lib/roles';
import { getSession } from '@/lib/session';

export default async function EditDriverPage({ params, searchParams }) {
  // Réservé aux rôles autorisés (l'action serveur refuse aussi)
  if (!can(await getSession(), 'editFleet')) return <Denied />;
  const { id } = await params;
  const sp = await searchParams;
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

  // Ouvert depuis la liste (actions rapides) : on y revient après l'enregistrement
  const next = sp.next ? safeNext(sp.next) : '';
  const back = next || `/chauffeurs/${id}`;

  return (
    <>
      <Link href={back} className="back"><ArrowLeft size={15} aria-hidden="true" />{next ? 'Chauffeurs' : `${d.firstName} ${d.lastName}`}</Link>
      <PageHeader title={`Modifier ${d.firstName} ${d.lastName}`} />
      <DriverForm action={updateDriver.bind(null, id)} initial={initial} submitLabel="Enregistrer" cancelHref={back} next={next} />
    </>
  );
}
