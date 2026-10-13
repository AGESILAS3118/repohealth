/**
 * Module d'orchestration de l'analyse d'un dépôt GitHub public.
 * Exécute les requêtes principales GitHub API et les requêtes ciblées aux métadonnées
 * de test, avec interruption propre au rate limit et tolérance aux 404 non bloquants.
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

const TEST_DIRECTORIES = new Set(['tests', 'test', '__tests__']);
const TEST_FILE_PATTERN = /\.test\.(?:js|mjs|cjs)$/i;
const KNOWN_TEST_CONFIGS = new Set([
  'jest.config.js', 'vitest.config.js', '.mocharc.json', 'pytest.ini',
  'phpunit.xml', 'playwright.config.js'
]);

function decodeGitHubFile(response) {
  const content = response?.data?.content;
  if (!response?.ok || typeof content !== 'string' || response.data.encoding !== 'base64') return null;
  try {
    const binary = atob(content.replaceAll(/\s/g, ''));
    return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
  } catch {
    return null;
  }
}

function parsePackageJson(response) {
  const text = decodeGitHubFile(response);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function hasNativeTestScript(packageJson) {
  const scripts = packageJson?.scripts;
  return scripts && typeof scripts === 'object' && Object.values(scripts).some(
    (script) => typeof script === 'string' && /\bnode\s+--test/.test(script)
  );
}

function needsTestFileInspection(packageJson, rootContents) {
  if (hasNativeTestScript(packageJson)) return false;
  if (rootContents.some((item) => item?.name && KNOWN_TEST_CONFIGS.has(String(item.name).toLowerCase()))) {
    return false;
  }
  const scripts = packageJson?.scripts;
  return !scripts || !Object.values(scripts).some(
    (script) => typeof script === 'string' && /\b(?:jest|vitest|mocha|pytest|playwright)\b/i.test(script)
  );
}

async function getNodeTestFiles(owner, repo, rootContents, options) {
  const testFiles = [];
  const directories = rootContents
    .filter((item) => item?.type === 'dir' && TEST_DIRECTORIES.has(String(item.name).toLowerCase()))
    .map((item) => item.name);

  while (directories.length > 0) {
    const directory = directories.shift();
    const listing = await fetchContents(owner, repo, directory, options);
    if (!listing.ok) {
      if (listing.error === 'rate_limit') return { testFiles, error: listing };
      continue;
    }

    for (const item of Array.isArray(listing.data) ? listing.data : []) {
      const path = `${directory}/${item.name}`;
      if (item.type === 'dir') {
        directories.push(path);
      } else if (item.type === 'file' && TEST_FILE_PATTERN.test(String(item.name))) {
        const fileResponse = await fetchContents(owner, repo, path, options);
        if (!fileResponse.ok) {
          if (fileResponse.error === 'rate_limit') return { testFiles, error: fileResponse };
          continue;
        }
        const content = decodeGitHubFile(fileResponse);
        if (content !== null) {
          testFiles.push({ path, content });
          if (/(?:\bfrom\s*['"]node:test['"]|\brequire\(\s*['"]node:test['"]\s*\))/.test(content)) {
            return { testFiles };
          }
        }
      }
    }
  }

  return { testFiles };
}

/**
 * Lance l'analyse complète d'un dépôt en orchestrant jusqu'à 9 requêtes.
 * 
 * @param {string} owner - Propriétaire du dépôt.
 * @param {string} repo - Nom du dépôt.
 * @returns {Promise<{ ok: boolean, data?: object, error?: string, resetAt?: number }>}
 */
export async function runAnalysis(owner, repo, { forceRefresh = false } = {}) {
  const requestOptions = { forceRefresh };
  // 1. fetchRepo (bloquant si 404 ou erreur)
  const repoRes = await fetchRepo(owner, repo, requestOptions);
  if (!repoRes.ok) {
    return repoRes;
  }

  // 2. fetchReadme (non bloquant si 404, bloquant si rate_limit)
  const readmeRes = await fetchReadme(owner, repo, requestOptions);
  if (!readmeRes.ok) {
    if (readmeRes.error === 'rate_limit') return readmeRes;
  }

  // 3. fetchContents('.') (racine du projet)
  const rootContentsRes = await fetchContents(owner, repo, '.', requestOptions);
  if (!rootContentsRes.ok) {
    if (rootContentsRes.error === 'rate_limit') return rootContentsRes;
  }

  const packageJsonRes = await fetchContents(owner, repo, 'package.json', requestOptions);
  if (packageJsonRes.error === 'rate_limit') return packageJsonRes;
  const packageJson = parsePackageJson(packageJsonRes);
  let testFiles = [];
  if (needsTestFileInspection(packageJson, rootContentsRes.data || [])) {
    const testFilesResult = await getNodeTestFiles(owner, repo, rootContentsRes.data || [], requestOptions);
    if (testFilesResult.error) return testFilesResult.error;
    testFiles = testFilesResult.testFiles;
  }

  // 4. fetchContents('.github') (dossier spécifique, souvent 404 si non présent)
  const githubContentsRes = await fetchContents(owner, repo, '.github', requestOptions);
  if (!githubContentsRes.ok) {
    if (githubContentsRes.error === 'rate_limit') return githubContentsRes;
  }

  // 5. fetchWorkflows (Actions)
  const workflowsRes = await fetchWorkflows(owner, repo, requestOptions);
  if (!workflowsRes.ok) {
    if (workflowsRes.error === 'rate_limit') return workflowsRes;
  }

  // 6. fetchReleases (dernières releases)
  const releasesRes = await fetchReleases(owner, repo, 5, requestOptions);
  if (!releasesRes.ok) {
    if (releasesRes.error === 'rate_limit') return releasesRes;
  }

  // 7. fetchContributors (contributeurs)
  const contributorsRes = await fetchContributors(owner, repo, 30, requestOptions);
  if (!contributorsRes.ok) {
    if (contributorsRes.error === 'rate_limit') return contributorsRes;
  }

  // 8. fetchIssues (issues ouvertes/fermées)
  const issuesRes = await fetchIssues(owner, repo, 'all', 100, requestOptions);
  if (!issuesRes.ok) {
    if (issuesRes.error === 'rate_limit') return issuesRes;
  }

  // 9. fetchCommits (historique récent)
  const commitsRes = await fetchCommits(owner, repo, 100, requestOptions);
  if (!commitsRes.ok) {
    if (commitsRes.error === 'rate_limit') return commitsRes;
  }

  // Construction de l'objet de diagnostic structuré
  const cachedResponses = [
    repoRes, readmeRes, rootContentsRes, githubContentsRes, workflowsRes,
    releasesRes, contributorsRes, issuesRes, commitsRes
  ].filter((response) => response.fromCache);
  const result = {
    repo: repoRes.data || null,
    packageJson,
    testFiles,
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
    apiVersion: API_VERSION,
    cache: {
      fromCache: cachedResponses.length > 0,
      age: cachedResponses.reduce((oldest, response) => Math.max(oldest, response.age || 0), 0)
    }
  };

  return {
    ok: true,
    data: result
  };
}
