// Chemin de retour après connexion : uniquement un chemin interne (« /… », jamais « //… » ni « /\… »)
export function safeNext(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : '/';
}
