import { formatNumber } from './format';

// Statut affiché d'un versement saisi
export function paymentStatus(p) {
  if (p.expected === 0) return { label: 'Non dû', tone: 'neu' };
  if (p.paid === 0) return { label: 'Non versé', tone: 'bad' };
  if (p.paid < p.expected) return { label: `Partiel −${formatNumber(p.expected - p.paid)}`, tone: 'warn' };
  if (p.paid > p.expected) return { label: `Payé +${formatNumber(p.paid - p.expected)}`, tone: 'ok' };
  return { label: 'Payé', tone: 'ok' };
}

// Statut d'une ligne sans saisie
export const missingStatus = (isToday) =>
  isToday ? { label: 'À encaisser', tone: 'info' } : { label: 'Non saisi', tone: 'warn' };
