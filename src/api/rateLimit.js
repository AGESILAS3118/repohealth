/**
 * Module de suivi et de persistance du rate limit de l'API GitHub.
 * Analyse les en-têtes X-RateLimit-* et gère le verrouillage en cas de dépassement de quota.
 */

const STORAGE_KEY = 'repochealth_ratelimit';

/**
 * Détecte si localStorage est accessible.
 * @returns {Storage | null}
 */
function getStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      return localStorage;
    }
  } catch (_e) {}
  return null;
}

/**
 * Analyse les en-têtes HTTP de la réponse GitHub et met à jour l'état mémorisé.
 * 
 * @param {Headers | object} headers - En-têtes HTTP de la réponse GitHub.
 * @returns {{ limit: number | null, remaining: number | null, resetAt: number | null }}
 */
export function updateRateLimitFromHeaders(headers) {
  if (!headers) return getStoredRateLimit();

  const getHeader = (name) => {
    if (typeof headers.get === 'function') {
      return headers.get(name);
    }
    // Objet classique (ex: lors de tests unitaires ou mocks)
    const lowerName = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lowerName) return v;
    }
    return null;
  };

  const limitHeader = getHeader('x-ratelimit-limit');
  const remainingHeader = getHeader('x-ratelimit-remaining');
  const resetHeader = getHeader('x-ratelimit-reset');

  if (limitHeader === null && remainingHeader === null && resetHeader === null) {
    return getStoredRateLimit();
  }

  const limit = limitHeader !== null ? parseInt(limitHeader, 10) : null;
  const remaining = remainingHeader !== null ? parseInt(remainingHeader, 10) : null;
  // Le header reset est un timestamp Unix en secondes
  const resetAt = resetHeader !== null ? parseInt(resetHeader, 10) * 1000 : null;

  const state = { limit, remaining, resetAt };

  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_e) {}
  }

  return state;
}

/**
 * Récupère le dernier état connu du rate limit depuis le stockage local.
 * 
 * @returns {{ limit: number | null, remaining: number | null, resetAt: number | null }}
 */
export function getStoredRateLimit() {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (_e) {}
  }

  return { limit: null, remaining: null, resetAt: null };
}

/**
 * Vérifie si l'API GitHub est actuellement bloquée par le rate limit.
 * 
 * @returns {boolean} true si le quota restant est 0 et que l'heure de reset est dans le futur.
 */
export function isRateLimited() {
  const { remaining, resetAt } = getStoredRateLimit();
  if (remaining === 0 && resetAt && resetAt > Date.now()) {
    return true;
  }
  return false;
}

/**
 * Calcule le nombre de secondes restantes avant la réinitialisation du quota.
 * 
 * @returns {number} Secondes restantes (minimum 0).
 */
export function secondsUntilReset() {
  const { resetAt } = getStoredRateLimit();
  if (!resetAt) return 0;
  const diffMs = resetAt - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
}
