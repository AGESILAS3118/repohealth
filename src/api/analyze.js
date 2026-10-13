/**
 * Module d'orchestration de l'analyse d'un dépôt GitHub public.
 * Exécute au maximum 9 requêtes GitHub API ordonnées, avec interruption propre
 * en cas d'atteinte du rate limit et tolérance aux 404 non bloquants.
 */

import {
  fetchRepo,
  fetchReadme,
  fetchContents,
  fetchWorkflows,
  fetchReleases,
  fetchContributors,
  fetchIssues,
  fetchCommits,
  API_VERSION
} from './github.js';
import { getStoredRateLimit } from './rateLimit.js';

/**
 * Lance l'analyse complète d'un dépôt en orchestrant jusqu'à 9 requêtes.
 * 
 * @param {string} owner - Propriétaire du dépôt.
 * @param {string} repo - Nom du dépôt.
 * @returns {Promise<{ ok: boolean, data?: object, error?: string, resetAt?: number }>}
 */
export async function runAnalysis(owner, repo) {
  // 1. fetchRepo (bloquant si 404 ou erreur)
  const repoRes = await fetchRepo(owner, repo);
  if (!repoRes.ok) {
    return repoRes;
  }

  // 2. fetchReadme (non bloquant si 404, bloquant si rate_limit)
  const readmeRes = await fetchReadme(owner, repo);
  if (!readmeRes.ok) {
    if (readmeRes.error === 'rate_limit') return readmeRes;
  }

  // 3. fetchContents('.') (racine du projet)
  const rootContentsRes = await fetchContents(owner, repo, '.');
  if (!rootContentsRes.ok) {
    if (rootContentsRes.error === 'rate_limit') return rootContentsRes;
  }

  // 4. fetchContents('.github') (dossier spécifique, souvent 404 si non présent)
  const githubContentsRes = await fetchContents(owner, repo, '.github');
  if (!githubContentsRes.ok) {
    if (githubContentsRes.error === 'rate_limit') return githubContentsRes;
  }

  // 5. fetchWorkflows (Actions)
  const workflowsRes = await fetchWorkflows(owner, repo);
  if (!workflowsRes.ok) {
    if (workflowsRes.error === 'rate_limit') return workflowsRes;
  }

  // 6. fetchReleases (dernières releases)
  const releasesRes = await fetchReleases(owner, repo, 5);
  if (!releasesRes.ok) {
    if (releasesRes.error === 'rate_limit') return releasesRes;
  }

  // 7. fetchContributors (contributeurs)
  const contributorsRes = await fetchContributors(owner, repo, 30);
  if (!contributorsRes.ok) {
    if (contributorsRes.error === 'rate_limit') return contributorsRes;
  }

  // 8. fetchIssues (issues ouvertes/fermées)
  const issuesRes = await fetchIssues(owner, repo, 'all', 100);
  if (!issuesRes.ok) {
    if (issuesRes.error === 'rate_limit') return issuesRes;
  }

  // 9. fetchCommits (historique récent)
  const commitsRes = await fetchCommits(owner, repo, 100);
  if (!commitsRes.ok) {
    if (commitsRes.error === 'rate_limit') return commitsRes;
  }

  // Construction de l'objet de diagnostic structuré
  const result = {
    repo: repoRes.data || null,
    readme: readmeRes.ok ? readmeRes.data : null,
    rootContents: rootContentsRes.ok ? rootContentsRes.data : null,
    githubContents: githubContentsRes.ok ? githubContentsRes.data : null,
    workflows: workflowsRes.ok ? workflowsRes.data : null,
    releases: releasesRes.ok ? releasesRes.data : null,
    contributors: contributorsRes.ok ? contributorsRes.data : null,
    issues: issuesRes.ok ? issuesRes.data : null,
    commits: commitsRes.ok ? commitsRes.data : null,
    rateLimit: getStoredRateLimit(),
    fetchedAt: new Date().toISOString(),
    apiVersion: API_VERSION
  };

  return {
    ok: true,
    data: result
  };
}
