/**
 * Client d'API GitHub REST v3 pour RepoHealth.
 * Intègre un cache localStorage automatique et la gestion native du rate limit.
 * 
 * Headers obligatoires inclus :
 * - Accept: application/vnd.github+json
 * - X-GitHub-Api-Version: 2022-11-28
 * - User-Agent: RepoHealth/0.1
 */

import { getCached, invalidateCache, setCached } from './cache.js';
import { updateRateLimitFromHeaders, isRateLimited, getStoredRateLimit } from './rateLimit.js';

const GITHUB_API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const USER_AGENT = 'RepoHealth/0.1';
export const MAX_API_CALLS = 12;

/**
 * Exécute une requête GET vers l'API GitHub avec cache et gestion d'erreurs normalisée.
 * 
 * @param {string} endpoint - Chemin de l'endpoint (ex: "/repos/owner/repo")
 * @param {object} [options]
 * @param {number} [options.ttlMs] - Durée de mise en cache personnalisée (optionnelle)
 * @param {boolean} [options.forceRefresh] - Ignore et invalide le cache avant la requête
 * @param {{calls: number}} [options.requestBudget] - Budget partagé pour une analyse
 * @returns {Promise<{ ok: boolean, data?: any, error?: string, resetAt?: number, fromCache?: boolean, cachedAt?: number, age?: number, isStale?: boolean }>}
 */
async function request(endpoint, options = {}) {
  const url = `${GITHUB_API_BASE}${endpoint}`;

  // 1. Vérification préalable du cache local
  const cachedData = getCached(url, { forceRefresh: options.forceRefresh });
  if (cachedData !== null) {
    return {
      ok: true,
      data: cachedData.data,
      fromCache: true,
      cachedAt: cachedData.cachedAt,
      age: cachedData.age,
      isStale: cachedData.isStale
    };
  }
  if (options.forceRefresh) {
    invalidateCache(url);
  }

  // 2. Vérification proactive du rate limit si déjà bloqué
  if (isRateLimited()) {
    const { resetAt } = getStoredRateLimit();
    return { ok: false, error: 'rate_limit', resetAt };
  }

  if (options.requestBudget && options.requestBudget.calls >= MAX_API_CALLS) {
    return { ok: false, error: 'request_limit' };
  }

  // 3. Appel réseau
  try {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': USER_AGENT
    };

    if (options.requestBudget) options.requestBudget.calls++;
    const response = await fetch(url, { method: 'GET', headers });

    // Mise à jour de l'état du rate limit à chaque réponse
    const rateState = updateRateLimitFromHeaders(response.headers);

    // Détection spécifique du rate limit (HTTP 403 avec Remaining à 0)
    if (response.status === 403 && rateState.remaining === 0) {
      return { ok: false, error: 'rate_limit', resetAt: rateState.resetAt };
    }

    if (response.status === 404) {
      return { ok: false, error: 'not_found' };
    }

    if (response.status === 403) {
      return { ok: false, error: 'forbidden' };
    }

    if (!response.ok) {
      return { ok: false, error: `http_${response.status}` };
    }

    const data = await response.json();

    // 4. Mise en cache de la réponse réussie
    setCached(url, data, options.ttlMs);

    return { ok: true, data, fromCache: false };
  } catch (error) {
    // Aucune exception non gérée ne remonte au caller
    return { ok: false, error: 'network', details: error?.message };
  }
}

/**
 * Récupère les métadonnées principales d'un dépôt public.
 * @param {string} owner 
 * @param {string} repo 
 */
export async function fetchRepo(owner, repo, options = {}) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, options);
}

/**
 * Récupère le README du dépôt.
 * @param {string} owner 
 * @param {string} repo 
 */
export async function fetchReadme(owner, repo, options = {}) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`, options);
}

/**
 * Récupère les fichiers/dossiers d'un chemin donné (ex: racine ou .github).
 * @param {string} owner 
 * @param {string} repo 
 * @param {string} [path=''] 
 */
export async function fetchContents(owner, repo, path = '', options = {}) {
  const cleanPath = path === '.' || !path ? '' : `/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${cleanPath}`, options);
}

/**
 * Récupère les workflows GitHub Actions configurés.
 * @param {string} owner 
 * @param {string} repo 
 */
export async function fetchWorkflows(owner, repo, options = {}) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows`, options);
}

/**
 * Récupère les dernières releases publiées.
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} [perPage=5] 
 */
export async function fetchReleases(owner, repo, perPage = 5, options = {}) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=${perPage}`, options);
}

/**
 * Récupère la liste des contributeurs.
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} [perPage=30] 
 */
export async function fetchContributors(owner, repo, perPage = 30, options = {}) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=${perPage}`, options);
}

/**
 * Récupère les issues (ouvertes/fermées).
 * @param {string} owner 
 * @param {string} repo 
 * @param {string} [state='all'] 
 * @param {number} [perPage=100] 
 */
export async function fetchIssues(owner, repo, state = 'all', perPage = 100, options = {}) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${encodeURIComponent(state)}&per_page=${perPage}`, options);
}

/**
 * Récupère l'historique récent des commits.
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} [perPage=100] 
 */
export async function fetchCommits(owner, repo, perPage = 100, options = {}) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${perPage}`, options);
}

/**
 * Récupère la répartition des langages de programmation.
 * @param {string} owner 
 * @param {string} repo 
 */
export async function fetchLanguages(owner, repo, options = {}) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`, options);
}

export { API_VERSION, USER_AGENT };
