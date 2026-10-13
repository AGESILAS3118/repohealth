/**
 * Pilier 3 : Sécurité (Pondération globale : 20 %)
 * Évalue la politique de sécurité, la détection de secrets exposés, les dépendances et l'archivage.
 * Total des points internes : 100 points, ramenés sur l'échelle du pilier.
 */

import { decodeBase64Content } from './documentation.js';

/**
 * Fichiers considérés comme des secrets / clés privées sensibles à la racine.
 */
const FORBIDDEN_SECRET_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  'secrets.json',
  'credentials.json',
  'id_rsa',
  'id_rsa.pub'
];

/**
 * Vérifie si un fichier correspondant aux noms ciblés est présent dans une liste de contenus.
 * 
 * @param {Array<object>|null} contentsList 
 * @param {string[]} targetNames 
 * @returns {boolean}
 */
function hasMatchingFile(contentsList, targetNames) {
  if (!Array.isArray(contentsList)) return false;
  const targetLower = targetNames.map(n => n.toLowerCase());
  return contentsList.some(item => {
    if (!item || !item.name) return false;
    return targetLower.includes(item.name.toLowerCase());
  });
}

/**
 * Calcule la priorité de la recommandation selon les points manquants.
 * >= 15 pts : 'high', >= 10 pts : 'medium', sinon : 'low'.
 * 
 * @param {number} points 
 * @returns {'high' | 'medium' | 'low'}
 */
function getPriorityForPoints(points) {
  if (points >= 15) return 'high';
  if (points >= 10) return 'medium';
  return 'low';
}

/**
 * Évalue le pilier Sécurité à partir des données collectées par runAnalysis.
 * 
 * @param {object} analysisData - Données d'analyse produites par runAnalysis.
 * @returns {import('../types.js').PillarResult}
 */
export function computeSecurityPillar(analysisData = {}) {
  const safeData = (analysisData && typeof analysisData === 'object') ? analysisData : {};
  const repo = safeData.repo || {};
  const rootContents = safeData.rootContents || [];
  const githubContents = safeData.githubContents || [];
  const readmeData = safeData.readme || null;

  // Décodage du README
  const readmeText = readmeData && readmeData.content ? decodeBase64Content(readmeData.content) : '';

  /** @type {import('../types.js').CheckResult[]} */
  const checks = [];

  // 1. SECURITY.md présent (20 pts)
  // SECURITY.md à la racine ou dans .github/SECURITY.md
  const hasSecurityMd = hasMatchingFile(rootContents, ['SECURITY.md', 'SECURITY']) ||
                        hasMatchingFile(githubContents, ['SECURITY.md', 'SECURITY']);
  checks.push({
    id: 'security_md',
    labelKey: 'check_security_md',
    passed: hasSecurityMd,
    weight: 20,
    points: hasSecurityMd ? 20 : 0,
    detail: hasSecurityMd ? 'Politique SECURITY.md détectée' : null
  });

  // 2. Dependabot configuré (20 pts)
  // dependabot.yml ou dependabot.yaml dans githubContents
  const hasDependabot = hasMatchingFile(githubContents, ['dependabot.yml', 'dependabot.yaml']);
  checks.push({
    id: 'security_dependabot',
    labelKey: 'check_security_dependabot',
    passed: hasDependabot,
    weight: 20,
    points: hasDependabot ? 20 : 0,
    detail: hasDependabot ? 'Fichier dependabot.yml trouvé' : null
  });

  // 3. Aucun secret exposé à la racine (20 pts)
  // aucun fichier racine nommé .env, .env.local, .env.production, secrets.json, credentials.json, id_rsa, id_rsa.pub
  const exposedSecret = rootContents.find(item => {
    if (!item || !item.name) return false;
    return FORBIDDEN_SECRET_FILES.some(f => f.toLowerCase() === item.name.toLowerCase());
  });
  const noSecretsExposed = !exposedSecret;
  checks.push({
    id: 'security_no_secrets',
    labelKey: 'check_security_no_secrets',
    passed: noSecretsExposed,
    weight: 20,
    points: noSecretsExposed ? 20 : 0,
    detail: exposedSecret ? `Fichier sensible identifié : ${exposedSecret.name}` : 'Aucun secret évident trouvé'
  });

  // 4. Licence présente (15 pts)
  // repo.license !== null
  const hasLicense = Boolean(repo && repo.license !== null && repo.license !== undefined);
  checks.push({
    id: 'security_license',
    labelKey: 'check_security_license',
    passed: hasLicense,
    weight: 15,
    points: hasLicense ? 15 : 0,
    detail: hasLicense ? `Licence : ${repo.license?.spdx_id || repo.license?.name || 'Détectée'}` : null
  });

  // 5. Dépôt non archivé (10 pts)
  // repo.archived === false
  const notArchived = Boolean(repo && repo.archived === false);
  checks.push({
    id: 'security_not_archived',
    labelKey: 'check_security_not_archived',
    passed: notArchived,
    weight: 10,
    points: notArchived ? 10 : 0,
    detail: notArchived ? 'Dépôt actif (non archivé)' : 'Dépôt archivé en lecture seule'
  });

  // 6. Section sécurité documentée (15 pts)
  // le README décodé contient le mot "security" ou "sécurité" (insensible à la casse)
  const hasSecurityInReadme = Boolean(readmeText && /security|sécurité/i.test(readmeText));
  checks.push({
    id: 'security_documented',
    labelKey: 'check_security_documented',
    passed: hasSecurityInReadme,
    weight: 15,
    points: hasSecurityInReadme ? 15 : 0,
    detail: hasSecurityInReadme ? 'Mention sécurité présente dans le README' : null
  });

  for (const check of checks) {
    check.status = check.passed ? 'passed' : 'failed';
  }

  // Calcul du score interne
  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const maxScore = 100;

  // Recommandations
  /** @type {import('../types.js').Recommendation[]} */
  const recommendations = [];
  for (const check of checks) {
    if (!check.passed) {
      recommendations.push({
        id: `rec_${check.id}`,
        labelKey: `rec_${check.id}`,
        points: check.weight,
        priority: getPriorityForPoints(check.weight)
      });
    }
  }

  recommendations.sort((a, b) => b.points - a.points);

  return {
    id: 'security',
    labelKey: 'report_pillar_security',
    weight: 20,
    score: Math.min(100, Math.max(0, totalScore)),
    maxScore,
    checks,
    recommendations
  };
}
