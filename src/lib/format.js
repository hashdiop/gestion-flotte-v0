const numberFmt = new Intl.NumberFormat('fr-FR');
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

export const formatNumber = (n) => numberFmt.format(n ?? 0);
export const formatFCFA = (n) => `${formatNumber(n)} FCFA`;
export const formatDate = (d) => (d ? dateFmt.format(new Date(d)) : '—');

// Montant abrégé pour les indicateurs (1,56 M ; 412 k) — la valeur exacte reste affichée au survol
const shortFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
export function formatShort(n) {
  const a = Math.abs(n ?? 0);
  if (a >= 1e6) return `${shortFmt.format(n / 1e6)} M`;
  if (a >= 1e4) return `${shortFmt.format(Math.round(n / 1e3))} k`;
  return formatNumber(n);
}

// Valeur d'un <input type="date"> (AAAA-MM-JJ)
export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
