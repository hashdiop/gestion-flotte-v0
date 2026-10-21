// Les journées sont stockées à minuit UTC. Dakar est à UTC+0 toute l'année :
// la date UTC est donc aussi la date locale.

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayUTC() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);

export const isSunday = (d) => d.getUTCDay() === 0;

// Lundi de la semaine contenant d
export const mondayOf = (d) => addDays(d, -((d.getUTCDay() + 6) % 7));

// « AAAA-MM-JJ » → Date à minuit UTC, ou null si absent ou invalide
export function parseDay(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

const longFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
export const formatLongDay = (d) => longFmt.format(d);
export const formatShortDay = (d) => shortFmt.format(d);

// Filtre Mongo des affectations qui couvrent le jour d (période [startDate, endDate[)
export const coveringDay = (d) => ({ startDate: { $lte: d }, $or: [{ endDate: null }, { endDate: { $gt: d } }] });
