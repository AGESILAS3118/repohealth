/**
 * Pilier 2 : CI/CD et automatisation (Pondération globale : 15 %)
 * Évalue la présence de workflows GitHub Actions, tests automatisés, linting, releases et outils de dépendances.
 * Total des points internes : 100 points, ramenés sur l'échelle du pilier.
 */

/**
 * Extrait un tableau propre de workflows à partir de la réponse GitHub.
 * L'API /actions/workflows retourne soit un tableau d'objets, soit { total_count, workflows: [...] }.
 * 
 * @param {any} workflowsData 
 * @returns {Array<object>}
 */
function extractWorkflowsList(workflowsData) {
  if (!workflowsData) return [];
  if (Array.isArray(workflowsData)) return workflowsData;
  if (Array.isArray(workflowsData.workflows)) return workflowsData.workflows;
  return [];
}

/**
 * Vérifie si un workflow valide un pattern textuel dans son name ou path (insensible à la casse).
 * 
 * @param {Array<object>} workflowsList 
 * @param {string[]} keywords 
 * @returns {boolean}
 */
function hasMatchingWorkflow(workflowsList, keywords) {
  return workflowsList.some(wf => {
    const name = (wf.name || '').toLowerCase();
    const path = (wf.path || '').toLowerCase();
    return keywords.some(kw => name.includes(kw) || path.includes(kw));
  });
}

/**
 * Vérifie si un fichier correspondant aux noms ciblés est présent dans une liste de contenus GitHub.
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
 * Évalue le pilier CI/CD et automatisation à partir des données de runAnalysis.
 * 
 * @param {object} analysisData - Données d'analyse produites par runAnalysis.
 * @returns {import('../types.js').PillarResult}
 */
export function computeCicdPillar(analysisData = {}) {
  const safeData = (analysisData && typeof analysisData === 'object') ? analysisData : {};
  const workflowsList = extractWorkflowsList(safeData.workflows);
  const rootContents = safeData.rootContents || [];
  const githubContents = safeData.githubContents || [];

  /** @type {import('../types.js').CheckResult[]} */
  const checks = [];

  // 1. Au moins un workflow GitHub Actions présent (25 pts)
  const hasAtLeastOneWf = workflowsList.length > 0;
  checks.push({
    id: 'cicd_workflows_present',
    labelKey: 'check_cicd_workflows_present',
    passed: hasAtLeastOneWf,
    weight: 25,
    points: hasAtLeastOneWf ? 25 : 0,
    detail: hasAtLeastOneWf ? `${workflowsList.length} workflow(s) détecté(s)` : null
  });

  // 2. Au moins deux workflows présents (10 pts)
  const hasMultipleWf = workflowsList.length >= 2;
  checks.push({
    id: 'cicd_multiple_workflows',
    labelKey: 'check_cicd_multiple_workflows',
    passed: hasMultipleWf,
    weight: 10,
    points: hasMultipleWf ? 10 : 0,
    detail: hasMultipleWf ? `${workflowsList.length} workflows` : null
  });

  // 3. Un workflow lié aux tests ou à la CI (20 pts)
  // Contient "test", "ci" ou "build" dans name ou path
  const hasTestCiWf = hasMatchingWorkflow(workflowsList, ['test', 'ci', 'build']);
  checks.push({
    id: 'cicd_tests',
    labelKey: 'check_cicd_tests',
    passed: hasTestCiWf,
    weight: 20,
    points: hasTestCiWf ? 20 : 0,
    detail: hasTestCiWf ? 'Workflow de test/CI identifié' : null
  });

  // 4. Un workflow de linting (10 pts)
  // Contient "lint"
  const hasLintWf = hasMatchingWorkflow(workflowsList, ['lint']);
  checks.push({
    id: 'cicd_lint',
    labelKey: 'check_cicd_lint',
    passed: hasLintWf,
    weight: 10,
    points: hasLintWf ? 10 : 0,
    detail: hasLintWf ? 'Workflow de linting identifié' : null
  });

  // 5. Un workflow de release ou publication (15 pts)
  // Contient "release", "publish" ou "deploy"
  const hasReleaseWf = hasMatchingWorkflow(workflowsList, ['release', 'publish', 'deploy']);
  checks.push({
    id: 'cicd_release',
    labelKey: 'check_cicd_release',
    passed: hasReleaseWf,
    weight: 15,
    points: hasReleaseWf ? 15 : 0,
    detail: hasReleaseWf ? 'Workflow de release/déploiement identifié' : null
  });

  // 6. Dependabot configuré (15 pts)
  // dependabot.yml ou dependabot.yaml dans githubContents
  const hasDependabot = hasMatchingFile(githubContents, ['dependabot.yml', 'dependabot.yaml']);
  checks.push({
    id: 'cicd_dependabot',
    labelKey: 'check_cicd_dependabot',
    passed: hasDependabot,
    weight: 15,
    points: hasDependabot ? 15 : 0,
    detail: hasDependabot ? 'Fichier dependabot.yml trouvé' : null
  });

  // 7. Renovate configuré (5 pts)
  // renovate.json, .renovaterc ou .renovaterc.json à la racine
  const hasRenovate = hasMatchingFile(rootContents, ['renovate.json', '.renovaterc', '.renovaterc.json']) ||
                      hasMatchingFile(githubContents, ['renovate.json', '.renovaterc', '.renovaterc.json']);
  checks.push({
    id: 'cicd_renovate',
    labelKey: 'check_cicd_renovate',
    passed: hasRenovate,
    weight: 5,
    points: hasRenovate ? 5 : 0,
    detail: hasRenovate ? 'Configuration Renovate trouvée' : null
  });

  for (const check of checks) {
    check.status = check.passed ? 'passed' : 'failed';
  }

  // Calcul du score interne (somme des points obtenus sur 100)
  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const maxScore = 100;

  // Recommandations ordonnées par points décroissants
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
    id: 'cicd',
    labelKey: 'report_pillar_cicd',
    weight: 15,
    score: Math.min(100, Math.max(0, totalScore)),
    maxScore,
    checks,
    recommendations
  };
}
