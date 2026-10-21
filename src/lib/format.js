const numberFmt = new Intl.NumberFormat('fr-FR');
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

export const formatNumber = (n) => numberFmt.format(n ?? 0);
export const formatFCFA = (n) => `${formatNumber(n)} FCFA`;
export const formatDate = (d) => (d ? dateFmt.format(new Date(d)) : '—');

// Valeur d'un <input type="date"> (AAAA-MM-JJ)
export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
