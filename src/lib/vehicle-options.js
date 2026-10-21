import Vehicle from '@/models/Vehicle';

// Véhicules proposés dans le formulaire : le parc actif, plus le véhicule déjà choisi s'il est sorti du parc
export async function vehicleOptions(keepId) {
  const filter = keepId ? { $or: [{ status: { $ne: 'sorti_du_parc' } }, { _id: keepId }] } : { status: { $ne: 'sorti_du_parc' } };
  const vehicles = await Vehicle.find(filter).sort({ plate: 1 }).lean();
  return vehicles.map((v) => ({ value: String(v._id), label: `${v.plate} · ${v.brand} ${v.model}` }));
}
