import Vehicle from '@/models/Vehicle';
import VehicleStatusChange from '@/models/VehicleStatusChange';

// Statuts où la journée n'est pas due par le chauffeur (règles de gestion §4)
export const NOT_DUE_STATUSES = new Set(['en_atelier', 'immobilise']);

// Renvoie une fonction (vehicleId, jour) → statut du véhicule ce jour-là.
// Sans historique pour un véhicule (données antérieures à cette fonctionnalité), on retient son statut actuel.
export async function loadStatusResolver(vehicleIds) {
  const ids = [...new Set(vehicleIds.map(String))];
  const [vehicles, changes] = await Promise.all([
    Vehicle.find({ _id: { $in: ids } }, 'status').lean(),
    VehicleStatusChange.find({ vehicle: { $in: ids } }).sort({ date: 1, createdAt: 1 }).lean(),
  ]);
  const current = new Map(vehicles.map((v) => [String(v._id), v.status]));
  const timelines = new Map();
  for (const c of changes) {
    const k = String(c.vehicle);
    if (!timelines.has(k)) timelines.set(k, []);
    timelines.get(k).push(c);
  }

  return (vehicleId, day) => {
    const k = String(vehicleId);
    const timeline = timelines.get(k);
    if (!timeline) return current.get(k) ?? 'en_service';
    // Avant le premier changement connu : le véhicule était en service
    let status = 'en_service';
    for (const c of timeline) {
      if (c.date > day) break;
      status = c.status; // à date égale, le dernier enregistré l'emporte (tri par createdAt)
    }
    return status;
  };
}

// Enregistre un changement de statut. Sans historique, un véhicule est considéré en service :
// pas besoin de point de départ, et on peut dater un changement avant sa saisie dans l'application.
// Seule exception : un véhicule déjà hors service sans historique (données antérieures à cette
// fonctionnalité). On trace alors d'abord son statut actuel depuis sa création, pour ne pas réécrire le passé.
export async function recordStatusChange(vehicle, status, date, reason) {
  const hasHistory = await VehicleStatusChange.exists({ vehicle: vehicle._id });
  if (!hasHistory && vehicle.status !== 'en_service') {
    const created = new Date(vehicle.createdAt);
    const createdDay = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
    await VehicleStatusChange.create({ vehicle: vehicle._id, status: vehicle.status, date: createdDay < date ? createdDay : date });
  }
  await VehicleStatusChange.create({ vehicle: vehicle._id, status, date, reason });
}

// Date du dernier changement enregistré (une nouvelle date ne peut pas la précéder)
export async function lastChangeDate(vehicleId) {
  const last = await VehicleStatusChange.findOne({ vehicle: vehicleId }).sort({ date: -1, createdAt: -1 }).lean();
  return last?.date ?? null;
}
