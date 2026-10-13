/**
 * Pilier 7 : Hygiène du dépôt (Pondération globale : 10 %)
 * Évalue la propreté du dépôt, la description, les métadonnées et la présence de gros artefacts.
 * Total des points internes : 100 points.
 */

function hasMatchingFile(contentsList, targetNames) {
  if (!Array.isArray(contentsList)) return false;
  const targetLower = targetNames.map((name) => name.toLowerCase());
  return contentsList.some((item) => {
    if (!item || !item.name) return false;
    const name = String(item.name).toLowerCase();
    return targetLower.includes(name) || targetLower.some((target) => name.includes(target));
  });
}

function getPriorityForPoints(points) {
  if (points >= 15) return 'high';
  if (points >= 10) return 'medium';
  return 'low';
}

export function computeHygienePillar(analysisData = {}) {
  const safeData = analysisData && typeof analysisData === 'object' ? analysisData : {};
  const repo = safeData.repo || {};
  const rootContents = Array.isArray(safeData.rootContents) ? safeData.rootContents : [];

  const hasGitignore = hasMatchingFile(rootContents, ['.gitignore']);
  const hasDescription = typeof repo.description === 'string' && repo.description.trim().length >= 19;
  const hasEnoughTopics = Array.isArray(repo.topics) && repo.topics.length >= 3;
  const sizeIsReasonable = Number.isFinite(repo.size) && repo.size < 500000;
  const hasRootBinaryArtifact = rootContents.some((item) => {
    if (!item || !item.name) return false;
    const name = String(item.name).toLowerCase();
    return /\.(zip|tar|gz|exe|dmg|iso|mp4|mov|psd|ai)$/i.test(name)
      || /^\.env(?:\.|$)/.test(name)
      || name === '.npmrc';
  });
  const hasHomepage = typeof repo.homepage === 'string' && repo.homepage.trim().length > 0;
  const notFork = repo.fork === false;

  const checks = [
    {
      id: 'hygiene_gitignore',
      labelKey: 'check_hygiene_gitignore',
      passed: hasGitignore,
      weight: 20,
      points: hasGitignore ? 20 : 0,
      detail: hasGitignore ? '.gitignore présent' : null
    },
    {
      id: 'hygiene_description',
      labelKey: 'check_hygiene_description',
      passed: hasDescription,
      weight: 15,
      points: hasDescription ? 15 : 0,
      detail: hasDescription ? 'Description du dépôt renseignée' : null
    },
    {
      id: 'hygiene_topics',
      labelKey: 'check_hygiene_topics',
      passed: hasEnoughTopics,
      weight: 15,
      points: hasEnoughTopics ? 15 : 0,
      detail: hasEnoughTopics ? `${repo.topics.length} topics détectés` : null
    },
    {
      id: 'hygiene_size',
      labelKey: 'check_hygiene_size',
      passed: sizeIsReasonable,
      weight: 15,
      points: sizeIsReasonable ? 15 : 0,
      detail: sizeIsReasonable ? 'Taille du dépôt acceptable' : null
    },
    {
      id: 'hygiene_no_binaries',
      labelKey: 'check_hygiene_no_binaries',
      passed: !hasRootBinaryArtifact,
      weight: 15,
      points: !hasRootBinaryArtifact ? 15 : 0,
      detail: !hasRootBinaryArtifact ? 'Aucun binaire volumineux détecté à la racine' : 'Fichier binaire détecté à la racine'
    },
    {
      id: 'hygiene_homepage',
      labelKey: 'check_hygiene_homepage',
      passed: hasHomepage,
      weight: 10,
      points: hasHomepage ? 10 : 0,
      detail: hasHomepage ? 'Page d’accueil ou site web renseigné' : null
    },
    {
      id: 'hygiene_not_fork',
      labelKey: 'check_hygiene_not_fork',
      passed: notFork,
      weight: 10,
      points: notFork ? 10 : 0,
      detail: notFork ? 'Dépôt principal (non fork)' : 'Dépôt fork détecté'
    }
  ];

  for (const check of checks) {
    check.status = check.passed ? 'passed' : 'failed';
  }

  const totalScore = checks.reduce((sum, check) => sum + check.points, 0);
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
    id: 'hygiene',
    labelKey: 'report_pillar_hygiene',
    weight: 10,
    score: Math.min(100, Math.max(0, totalScore)),
    maxScore: 100,
    checks,
    recommendations
  };
}
