/**
 * Module de gestion du cache local avec TTL basé sur localStorage.
 * Stocke les réponses d'API sous la clé "repochealth_cache:<url>".
 * Gère gracieusement les environnements où localStorage est absent ou restreint.
 */

const CACHE_PREFIX = 'repochealth_cache:';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 heure par défaut

/**
 * Détecte si localStorage est disponible et fonctionnel.
 * @returns {Storage | null}
 */
function getStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      // Test d'écriture et suppression sécurisé
      const testKey = '__repochealth_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return localStorage;
    }
  } catch (_e) {
    // Mode navigation privée stricte, quota dépassé ou environnement Node sans polyfill
  }
  return null;
}

/**
 * Récupère une entrée du cache si elle existe et n'a pas expiré.
 * 
 * @param {string} url - URL clé de la ressource.
 * @returns {any | null} Données mises en cache ou null si absent/expiré.
 */
export function getCached(url) {
  const storage = getStorage();
  if (!storage || !url) return null;

  try {
    const raw = storage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;

    const record = JSON.parse(raw);
    if (!record || typeof record.expiresAt !== 'number') {
      storage.removeItem(CACHE_PREFIX + url);
      return null;
    }

    if (Date.now() > record.expiresAt) {
      storage.removeItem(CACHE_PREFIX + url);
      return null;
    }

    return record.data;
  } catch (_e) {
    // Entrée corrompue
    try {
      storage.removeItem(CACHE_PREFIX + url);
    } catch (_err) {}
    return null;
  }
}

/**
 * Enregistre une valeur dans le cache avec un TTL défini.
 * 
 * @param {string} url - URL clé de la ressource.
 * @param {any} data - Données à sérialiser.
 * @param {number} [ttlMs=3600000] - Durée de vie en millisecondes (défaut 1h).
 * @returns {boolean} true si le stockage a réussi, sinon false.
 */
export function setCached(url, data, ttlMs = DEFAULT_TTL_MS) {
  const storage = getStorage();
  if (!storage || !url) return false;

  const record = {
    data,
    expiresAt: Date.now() + ttlMs,
    savedAt: Date.now()
  };

  try {
    storage.setItem(CACHE_PREFIX + url, JSON.stringify(record));
    return true;
  } catch (_e) {
    // En cas de QuotaExceededError, tenter un nettoyage des expirés avant d'abandonner
    try {
      clearExpired();
      storage.setItem(CACHE_PREFIX + url, JSON.stringify(record));
      return true;
    } catch (_err) {
      return false;
    }
  }
}

/**
 * Nettoie toutes les entrées expirées du cache RepoHealth.
 * @returns {number} Nombre d'entrées supprimées.
 */
export function clearExpired() {
  const storage = getStorage();
  if (!storage) return 0;

  let removedCount = 0;
  const now = Date.now();
  const keysToRemove = [];

  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const raw = storage.getItem(key);
          if (raw) {
            const record = JSON.parse(raw);
            if (!record || typeof record.expiresAt !== 'number' || now > record.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch (_e) {
          keysToRemove.push(key);
        }
      }
    }

    for (const key of keysToRemove) {
      storage.removeItem(key);
      removedCount++;
    }
  } catch (_e) {}

  return removedCount;
}

/**
 * Supprime toutes les entrées de cache associées à RepoHealth.
 * @returns {number} Nombre d'entrées supprimées.
 */
export function clearAll() {
  const storage = getStorage();
  if (!storage) return 0;

  let removedCount = 0;
  const keysToRemove = [];

  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      storage.removeItem(key);
      removedCount++;
    }
  } catch (_e) {}

  return removedCount;
}

// Nettoyage automatique des entrées expirées au chargement du module
clearExpired();
