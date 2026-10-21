// Lecture des champs d'un FormData

export const str = (fd, key) => String(fd.get(key) ?? '').trim();

// Entier saisi avec ou sans espaces (« 15 000 ») ; null si vide, NaN si invalide
export function int(fd, key) {
  const s = str(fd, key).replace(/[\s  ]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
}

// Date AAAA-MM-JJ en minuit UTC ; null si vide, Invalid Date si invalide
export function date(fd, key) {
  const s = str(fd, key);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : new Date(NaN);
}

// Valeurs brutes renvoyées au formulaire pour le réafficher après une erreur
export const formValues = (fd) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith('$')));

export const isDuplicateKey = (err) => err?.code === 11000;
