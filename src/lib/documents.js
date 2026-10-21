import { ALERT_DAYS, DOCUMENT_TYPES } from './document-types';
import VehicleDocument from '@/models/VehicleDocument';

const DAY_MS = 24 * 60 * 60 * 1000;

// Statut d'un document à la date « today ». rank : plus petit = plus urgent.
export function documentStatus(doc, today) {
  if (!doc) return { key: 'missing', label: 'Manquant', tone: 'bad', rank: 0, days: null };
  if (!doc.expiresAt) return { key: 'none', label: 'Sans échéance', tone: 'ok', rank: 5, days: null };
  const days = Math.round((new Date(doc.expiresAt) - today) / DAY_MS);
  if (days < 0) return { key: 'expired', label: 'Expiré', tone: 'bad', rank: 1, days };
  if (days <= ALERT_DAYS.critical) return { key: 'critical', label: 'Critique', tone: 'bad', rank: 2, days };
  if (days <= ALERT_DAYS.soon) return { key: 'soon', label: 'À renouveler', tone: 'warn', rank: 3, days };
  return { key: 'ok', label: 'À jour', tone: 'ok', rank: 4, days };
}

export const needsAction = (status) => status.rank <= 3;

export function daysLabel(days) {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `−${-days} j`;
  if (days === 0) return 'aujourd’hui';
  return `${days} j`;
}

// Documents en vigueur : Map(vehicleId → { [type]: doc }).
// Le document en vigueur d'un type est celui qui expire le plus tard (à défaut, le plus récent).
export async function currentDocuments(vehicleIds) {
  const filter = { deletedAt: null };
  if (vehicleIds) filter.vehicle = { $in: vehicleIds };
  const docs = await VehicleDocument.find(filter).sort({ expiresAt: -1, createdAt: -1 }).lean();
  const byVehicle = new Map();
  for (const d of docs) {
    const k = String(d.vehicle);
    const set = byVehicle.get(k) ?? {};
    if (!set[d.type]) set[d.type] = d; // premier vu = expiration la plus lointaine
    byVehicle.set(k, set);
  }
  return byVehicle;
}

// Résumé d'un véhicule pour la liste : le cas le plus urgent de ses documents
export function vehicleDocumentSummary(docsByType = {}, today) {
  const statuses = Object.keys(DOCUMENT_TYPES).map((t) => documentStatus(docsByType[t], today));
  const missing = statuses.filter((s) => s.key === 'missing').length;
  const expired = statuses.filter((s) => s.key === 'expired').length;
  if (expired) return { label: `${expired} expiré${expired > 1 ? 's' : ''}`, tone: 'bad' };
  if (missing) return { label: `${missing} manquant${missing > 1 ? 's' : ''}`, tone: 'bad' };
  const next = statuses.filter((s) => s.key === 'critical' || s.key === 'soon').sort((a, b) => a.days - b.days)[0];
  if (next) return { label: `Échéance ${daysLabel(next.days)}`, tone: next.tone };
  return { label: 'À jour', tone: 'ok' };
}
