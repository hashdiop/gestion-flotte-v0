import Assignment from '@/models/Assignment';

// Clôt l'affectation en cours d'un chauffeur ou d'un véhicule (ex. chauffeur désactivé, véhicule sorti du parc).
// endDate est exclue : passer demain pour que la journée en cours reste due.
export async function endCurrentAssignment(filter, endDate) {
  const current = await Assignment.findOne({ ...filter, current: true });
  if (!current) return;
  // Une fin antérieure au début donnerait une période négative
  const end = endDate < current.startDate ? current.startDate : endDate;
  await Assignment.updateOne({ _id: current._id, current: true }, { $set: { current: false, endDate: end } });
}

// Affectations en cours, indexées par l'id du véhicule ou du chauffeur
export async function currentAssignmentsBy(key) {
  const populate = key === 'vehicle' ? { path: 'driver', select: 'firstName lastName' } : { path: 'vehicle', select: 'plate brand model' };
  const list = await Assignment.find({ current: true }).populate(populate).lean();
  return new Map(list.map((a) => [String(a[key]), a]));
}
