/**
 * Client d'API GitHub REST v3 pour RepoHealth.
 * Intègre un cache localStorage automatique et la gestion native du rate limit.
 * 
 * Headers obligatoires inclus :
 * - Accept: application/vnd.github+json
 * - X-GitHub-Api-Version: 2022-11-28
 * - User-Agent: RepoHealth/0.1
 */

import { getCached, setCached } from './cache.js';
import { updateRateLimitFromHeaders, isRateLimited, getStoredRateLimit } from './rateLimit.js';

const GITHUB_API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const USER_AGENT = 'RepoHealth/0.1';

/**
 * Exécute une requête GET vers l'API GitHub avec cache et gestion d'erreurs normalisée.
 * 
 * @param {string} endpoint - Chemin de l'endpoint (ex: "/repos/owner/repo")
 * @param {object} [options]
 * @param {number} [options.ttlMs] - Durée de mise en cache personnalisée (optionnelle)
 * @returns {Promise<{ ok: boolean, data?: any, error?: string, resetAt?: number }>}
 */
async function request(endpoint, options = {}) {
  const url = `${GITHUB_API_BASE}${endpoint}`;

  // 1. Vérification préalable du cache local
  const cachedData = getCached(url);
  if (cachedData !== null) {
    return { ok: true, data: cachedData, fromCache: true };
  }

  // 2. Vérification proactive du rate limit si déjà bloqué
  if (isRateLimited()) {
    const { resetAt } = getStoredRateLimit();
    return { ok: false, error: 'rate_limit', resetAt };
  }

  // 3. Appel réseau
  try {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': USER_AGENT
    };

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
export async function fetchRepo(owner, repo) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
}

/**
 * Récupère le README du dépôt.
 * @param {string} owner 
 * @param {string} repo 
 */
export async function fetchReadme(owner, repo) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
}

/**
 * Récupère les fichiers/dossiers d'un chemin donné (ex: racine ou .github).
 * @param {string} owner 
 * @param {string} repo 
 * @param {string} [path=''] 
 */
export async function fetchContents(owner, repo, path = '') {
  const cleanPath = path === '.' || !path ? '' : `/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${cleanPath}`);
}

/**
 * Récupère les workflows GitHub Actions configurés.
 * @param {string} owner 
 * @param {string} repo 
 */
export async function fetchWorkflows(owner, repo) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows`);
}

/**
 * Récupère les dernières releases publiées.
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} [perPage=5] 
 */
export async function fetchReleases(owner, repo, perPage = 5) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=${perPage}`);
}

/**
 * Récupère la liste des contributeurs.
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} [perPage=30] 
 */
export async function fetchContributors(owner, repo, perPage = 30) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=${perPage}`);
}

/**
 * Récupère les issues (ouvertes/fermées).
 * @param {string} owner 
 * @param {string} repo 
 * @param {string} [state='all'] 
 * @param {number} [perPage=100] 
 */
export async function fetchIssues(owner, repo, state = 'all', perPage = 100) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${encodeURIComponent(state)}&per_page=${perPage}`);
}

/**
 * Récupère l'historique récent des commits.
 * @param {string} owner 
 * @param {string} repo 
 * @param {number} [perPage=100] 
 */
export async function fetchCommits(owner, repo, perPage = 100) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${perPage}`);
}

/**
 * Récupère la répartition des langages de programmation.
 * @param {string} owner 
 * @param {string} repo 
 */
export async function fetchLanguages(owner, repo) {
  return request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`);
}

export { API_VERSION, USER_AGENT };
