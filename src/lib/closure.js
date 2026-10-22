import { addDays, isSunday, todayUTC } from './dates';
import { formatDate } from './format';
import DayClosure from '@/models/DayClosure';
import Payment from '@/models/Payment';
import PaymentAdjustment from '@/models/PaymentAdjustment';
import Setting from '@/models/Setting';

// Réglages ; créés au premier usage avec une clôture qui démarre aujourd'hui
export async function getSettings() {
  const existing = await Setting.findById('app').lean();
  if (existing) return existing;
  try {
    return (await Setting.create({ _id: 'app', closureStartDate: todayUTC() })).toObject();
  } catch {
    return Setting.findById('app').lean(); // créé entre-temps par une autre requête
  }
}

// État de la clôture :
//   lastClosed  : dernière journée clôturée (null si aucune)
//   nextToClose : prochaine journée à clôturer (les dimanches sont sautés : rien n'y est dû),
//                 null si elle n'a pas encore commencé (on ne clôture pas une journée future)
export async function getClosureState() {
  const settings = await getSettings();
  const last = await DayClosure.findOne().sort({ date: -1 }).lean();
  const lastClosed = last?.date ?? null;
  let next = lastClosed ? addDays(lastClosed, 1) : settings.closureStartDate;
  if (next < settings.closureStartDate) next = settings.closureStartDate;
  while (isSunday(next)) next = addDays(next, 1);
  const today = todayUTC();
  return {
    startDate: settings.closureStartDate,
    closingHour: settings.closingHour,
    lastClosed,
    lastClosure: last,
    nextToClose: next <= today ? next : null,
  };
}

// Une journée est verrouillée si elle est clôturée (ou couverte par une clôture plus récente)
export const isLocked = (state, day) => Boolean(state.lastClosed && day <= state.lastClosed);

// Message d'erreur commun quand on touche à une journée clôturée
export function lockedMessage(state) {
  return `Les journées jusqu’au ${formatDate(state.lastClosed)} sont clôturées : passe par une correction avec motif.`;
}

// Espèces attendues en caisse pour une journée : versements en espèces + remboursements en espèces saisis ce jour-là
export async function cashExpectedFor(day) {
  const [payments, refunds] = await Promise.all([
    Payment.find({ date: day, method: 'especes' }, 'paid').lean(),
    PaymentAdjustment.find({ entryDate: day, kind: 'remboursement', method: 'especes' }, 'deltaPaid').lean(),
  ]);
  return payments.reduce((s, p) => s + p.paid, 0) + refunds.reduce((s, r) => s + r.deltaPaid, 0);
}

// Raccourci pour les actions : renvoie un message d'erreur si la date est verrouillée, sinon null
export async function lockError(day) {
  const state = await getClosureState();
  return isLocked(state, day) ? lockedMessage(state) : null;
}
