/**
 * Moteur d'évaluation et de calcul de score pour RepoHealth.
 * Orchestre les 7 piliers de santé actuels :
 * 1. Documentation (20 %)
 * 2. CI/CD et automatisation (15 %)
 * 3. Sécurité (20 %)
 * 4. Activité et maintenance (15 %)
 * 5. Communauté (10 %)
 * 6. Qualité du code (10 %)
 * 7. Hygiène du dépôt (10 %)
 * 
 * Version du moteur : 1.0.0
 */

import { getGrade } from './grades.js';
import { evaluateDocumentation } from './pillars/documentation.js';
import { computeCicdPillar } from './pillars/cicd.js';
import { computeSecurityPillar } from './pillars/security.js';
import { computeActivityPillar } from './pillars/activity.js';
import { computeCommunityPillar } from './pillars/community.js';
import { computeCodeQualityPillar } from './pillars/codeQuality.js';
import { computeHygienePillar } from './pillars/hygiene.js';
import { ENGINE_VERSION } from './version.js';

export { ENGINE_VERSION };

/**
 * Registre ordonné des fonctions d'évaluation des piliers supportés.
 */
const REGISTERED_PILLARS = [
  evaluateDocumentation,
  computeCicdPillar,
  computeSecurityPillar,
  computeActivityPillar,
  computeCommunityPillar,
  computeCodeQualityPillar,
  computeHygienePillar
];

const CHECK_DATA_REQUIREMENTS = {
  readme_present: ['readme'],
  readme_substantial: ['readme'],
  readme_structured: ['readme'],
  readme_examples: ['readme'],
  license: ['rootContents'],
  contributing: ['rootContents', 'githubContents'],
  code_of_conduct: ['rootContents', 'githubContents'],
  support: ['rootContents', 'githubContents'],
  changelog: ['rootContents', 'githubContents'],
  cicd_workflows_present: ['workflows'],
  cicd_multiple_workflows: ['workflows'],
  cicd_tests: ['workflows'],
  cicd_lint: ['workflows'],
  cicd_release: ['workflows'],
  cicd_dependabot: ['githubContents'],
  cicd_renovate: ['rootContents', 'githubContents'],
  security_md: ['rootContents', 'githubContents'],
  security_dependabot: ['githubContents'],
  security_no_secrets: ['rootContents'],
  security_license: ['repo'],
  security_not_archived: ['repo'],
  security_documented: ['readme'],
  activity_recent_commit: ['commits'],
  activity_commit_90d: ['commits'],
  activity_regular_6m: ['commits'],
  activity_recent_release: ['releases'],
  activity_issue_close_rate: ['issues'],
  activity_recent_closed_issue: ['issues'],
  community_contributors_2: ['contributors'],
  community_contributors_5: ['contributors'],
  community_bus_factor: ['contributors', 'issues', 'rootContents', 'githubContents'],
  community_issue_template: ['rootContents', 'githubContents'],
  community_pr_template: ['rootContents', 'githubContents'],
  community_response_time: ['issues'],
  community_external_closed: ['issues', 'repo'],
  quality_tests_dir: ['rootContents'],
  quality_test_config: ['rootContents'],
  quality_coverage: ['rootContents', 'workflows'],
  quality_linter: ['rootContents'],
  quality_formatter: ['rootContents'],
  quality_structure: ['rootContents'],
  quality_types: ['rootContents'],
  hygiene_gitignore: ['rootContents'],
  hygiene_description: ['repo'],
  hygiene_topics: ['repo'],
  hygiene_size: ['repo'],
  hygiene_no_binaries: ['rootContents'],
  hygiene_homepage: ['repo'],
  hygiene_not_fork: ['repo']
};

const CHECK_PARTIAL_EVIDENCE = {
  contributing: ['rootContents', 'githubContents'],
  code_of_conduct: ['rootContents', 'githubContents'],
  support: ['rootContents', 'githubContents'],
  changelog: ['rootContents', 'githubContents'],
  cicd_renovate: ['rootContents', 'githubContents'],
  security_md: ['rootContents', 'githubContents'],
  community_issue_template: ['rootContents', 'githubContents'],
  community_pr_template: ['rootContents', 'githubContents'],
  quality_coverage: ['rootContents', 'workflows']
};

const VALID_CHECK_STATUSES = new Set([
  'passed',
  'failed',
  'not_verifiable',
  'insufficient_data'
]);

function hasDataForCheck(checkId, analysisData) {
  const requirements = CHECK_DATA_REQUIREMENTS[checkId];
  return Boolean(requirements && requirements.every((key) =>
    analysisData[key] !== null && analysisData[key] !== undefined
  ));
}

function recommendationPriority(points) {
  if (points >= 15) return 'high';
  if (points >= 10) return 'medium';
  return 'low';
}

/**
 * Normalise un pilier à partir de ses checks et des données effectivement disponibles.
 * Les checks non vérifiables sont exclus du score et des recommandations.
 *
 * @param {import('./types.js').PillarResult} pillar
 * @param {object} analysisData
 * @returns {import('./types.js').PillarResult}
 */
export function normalizePillarResult(pillar, analysisData = {}) {
  const safeData = analysisData && typeof analysisData === 'object' ? analysisData : {};
  const checks = (Array.isArray(pillar.checks) ? pillar.checks : []).map((check) => {
    const suppliedStatus = VALID_CHECK_STATUSES.has(check.status) ? check.status : null;
    const hasRequiredData = hasDataForCheck(check.id, safeData);
    const hasPositivePartialEvidence = check.passed &&
      (CHECK_PARTIAL_EVIDENCE[check.id] || []).some((key) =>
        safeData[key] !== null && safeData[key] !== undefined
      );
    const status = suppliedStatus === 'not_verifiable' || suppliedStatus === 'insufficient_data'
      ? suppliedStatus
      : hasRequiredData || hasPositivePartialEvidence
        ? (suppliedStatus || (check.passed ? 'passed' : 'failed'))
        : 'insufficient_data';

    return {
      ...check,
      status,
      passed: status === 'passed' ? true : status === 'failed' ? false : check.passed,
      points: status === 'passed' ? check.weight : 0
    };
  });

  const evaluableChecks = checks.filter((check) => check.status === 'passed' || check.status === 'failed');
  const evaluableWeight = evaluableChecks.reduce((sum, check) => sum + check.weight, 0);
  const earnedPoints = evaluableChecks.reduce((sum, check) => sum + check.points, 0);
  const score = evaluableWeight > 0
    ? Math.max(0, Math.min(100, (earnedPoints / evaluableWeight) * 100))
    : null;

  const recommendationsById = new Map(
    (Array.isArray(pillar.recommendations) ? pillar.recommendations : []).map((recommendation) => [
      recommendation.id,
      recommendation
    ])
  );
  const recommendations = checks
    .filter((check) => check.status === 'failed')
    .map((check) => recommendationsById.get(`rec_${check.id}`) || ({
      id: `rec_${check.id}`,
      labelKey: `rec_${check.id}`,
      points: check.weight,
      priority: recommendationPriority(check.weight)
    }))
    .sort((a, b) => b.points - a.points);

  const status = score !== null
    ? 'scored'
    : checks.length > 0 && checks.every((check) => check.status === 'not_verifiable')
      ? 'not_verifiable'
      : 'insufficient_data';

  return {
    ...pillar,
    checks,
    recommendations,
    score,
    status
  };
}

/**
 * Calcule le rapport d'évaluation complet à partir des données collectées par runAnalysis.
 * 
 * @param {object} analysisData - Objet structuré retourné par runAnalysis.
 * @returns {import('./types.js').ScoreReport}
 */
export function computeScoreReport(analysisData = {}) {
  const safeData = analysisData && typeof analysisData === 'object' ? analysisData : {};
  const pillars = REGISTERED_PILLARS.map((evaluator) => {
    const pillar = evaluator(safeData);
    const hasCommunitySignals =
      (Array.isArray(safeData.contributors) && safeData.contributors.length > 0) ||
      (Array.isArray(safeData.issues) && safeData.issues.length > 0);

    if (pillar.id === 'community' && !hasCommunitySignals) {
      return normalizePillarResult({
        ...pillar,
        checks: pillar.checks.map((check) => ({ ...check, status: 'insufficient_data' })),
        recommendations: []
      }, safeData);
    }

    return normalizePillarResult(pillar, safeData);
  });

  // Les piliers sans score sont exclus ; les poids restants sont renormalisés.
  let totalWeightedScore = 0;
  let totalWeights = 0;

  for (const pillar of pillars) {
    if (typeof pillar.score === 'number') {
      totalWeightedScore += (pillar.score / 100) * pillar.weight;
      totalWeights += pillar.weight;
    }
  }

  const unverifiablePillars = pillars
    .filter((pillar) => pillar.score === null)
    .map((pillar) => ({
      id: pillar.id,
      labelKey: pillar.labelKey,
      reason: pillar.status === 'not_verifiable'
        ? 'Les contrôles de ce pilier ne peuvent pas être vérifiés avec les données disponibles.'
        : 'Données insuffisantes pour évaluer ce pilier.'
    }));

  if (totalWeights === 0) {
    return {
      score: null,
      grade: null,
      pillars,
      unverifiablePillars,
      message: 'Aucun pilier n’a pu être évalué faute de données suffisantes.',
      engineVersion: ENGINE_VERSION,
      computedAt: new Date().toISOString()
    };
  }

  const rawGlobalScore = (totalWeightedScore / totalWeights) * 100;

  // Borner strictement entre 0 et 100
  const boundedScore = Math.max(0, Math.min(100, rawGlobalScore));

  // Arrondi à un chiffre après la virgule ou entier le plus proche
  const roundedScore = Math.round(boundedScore * 10) / 10;

  const grade = getGrade(roundedScore);

  return {
    score: roundedScore,
    grade,
    pillars,
    unverifiablePillars,
    engineVersion: ENGINE_VERSION,
    computedAt: new Date().toISOString()
  };
}
