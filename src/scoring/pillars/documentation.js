/**
 * Pilier 1 : Documentation (Pondération globale : 20 %)
 * Évalue la présence, la consistance et la structure de la documentation du projet.
 * Total des points internes : 100 points, ramenés sur l'échelle du pilier.
 */

/**
 * Décode le contenu base64 d'un fichier renvoyé par l'API GitHub.
 * Supporte les environnements navigateur (atob) et Node.js (Buffer).
 * 
 * @param {string} base64Str 
 * @returns {string}
 */
export function decodeBase64Content(base64Str) {
  if (!base64Str || typeof base64Str !== 'string') return '';
  // Nettoyer les sauts de ligne éventuels dans le flux base64
  const clean = base64Str.replace(/\s/g, '');
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(clean, 'base64').toString('utf-8');
    }
    if (typeof atob === 'function') {
      // Décodage UTF-8 sécurisé pour atob
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch (_e) {
    // Si le décodage échoue, renvoyer une chaîne vide
  }
  return '';
}

/**
 * Vérifie si un fichier correspondant aux noms attendus existe dans une liste d'éléments de contenu GitHub.
 * 
 * @param {Array<object>|null} contentsList - Liste d'objets retournée par /contents.
 * @param {string[]} targetNames - Noms de fichiers acceptés (insensibles à la casse).
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
 * Calcule le niveau de priorité d'une recommandation selon les points manquants :
 * >= 15 pts : 'high', 10 pts : 'medium', sinon : 'low'.
 * 
 * @param {number} points 
 * @returns {'high' | 'medium' | 'low'}
 */
function getPriorityForPoints(points) {
  if (points >= 15) return 'high';
  if (points === 10) return 'medium';
  return 'low';
}

/**
 * Évalue le pilier Documentation à partir des données extraites par runAnalysis.
 * 
 * @param {object} analysisData - Données d'analyse produites par runAnalysis.
 * @returns {import('../types.js').PillarResult}
 */
export function evaluateDocumentation(analysisData = {}) {
  const safeData = (analysisData && typeof analysisData === 'object') ? analysisData : {};
  const readmeData = safeData.readme || null;
  const rootContents = safeData.rootContents || [];
  const githubContents = safeData.githubContents || [];

  // Décodage du texte du README
  const readmeText = readmeData && readmeData.content ? decodeBase64Content(readmeData.content) : '';

  /** @type {import('../types.js').CheckResult[]} */
  const checks = [];

  // 1. README présent (15 points)
  const isReadmePresent = readmeData !== null;
  checks.push({
    id: 'readme_present',
    labelKey: 'check_readme_present',
    passed: isReadmePresent,
    weight: 15,
    points: isReadmePresent ? 15 : 0,
    detail: isReadmePresent ? readmeData.name || 'README.md' : null
  });

  // 2. README substantiel (> 800 caractères) (15 points)
  const isReadmeSubstantial = isReadmePresent && readmeText.length > 800;
  checks.push({
    id: 'readme_substantial',
    labelKey: 'check_readme_substantial',
    passed: isReadmeSubstantial,
    weight: 15,
    points: isReadmeSubstantial ? 15 : 0,
    detail: isReadmePresent ? `${readmeText.length} caractères` : null
  });

  // 3. README structuré (au moins 2 titres Markdown '#' ou '##') (10 points)
  // Recherche des lignes commençant par # ou ##
  const headerMatches = readmeText.match(/^#{1,2}\s+.+/gm) || [];
  const isReadmeStructured = isReadmePresent && headerMatches.length >= 2;
  checks.push({
    id: 'readme_structured',
    labelKey: 'check_readme_structured',
    passed: isReadmeStructured,
    weight: 10,
    points: isReadmeStructured ? 10 : 0,
    detail: isReadmePresent ? `${headerMatches.length} titres détectés` : null
  });

  // 4. README avec exemples de code (présence d'au moins un bloc ```) (10 points)
  const hasCodeExamples = isReadmePresent && /```[\s\S]*?```/.test(readmeText);
  checks.push({
    id: 'readme_examples',
    labelKey: 'check_readme_examples',
    passed: hasCodeExamples,
    weight: 10,
    points: hasCodeExamples ? 10 : 0,
    detail: hasCodeExamples ? 'Exemple de code identifié' : null
  });

  // 5. LICENSE présente (15 points)
  // Fichiers acceptés à la racine : LICENSE, LICENSE.md, LICENSE.txt ou COPYING
  const hasLicense = hasMatchingFile(rootContents, [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'COPYING',
    'COPYING.txt',
    'LICENCE',
    'LICENCE.md'
  ]);
  checks.push({
    id: 'license',
    labelKey: 'check_license',
    passed: hasLicense,
    weight: 15,
    points: hasLicense ? 15 : 0,
    detail: hasLicense ? 'Fichier de licence trouvé' : null
  });

  // 6. CONTRIBUTING présent (10 points)
  // CONTRIBUTING.md ou .github/CONTRIBUTING.md
  const hasContributing = hasMatchingFile(rootContents, ['CONTRIBUTING.md', 'CONTRIBUTING']) ||
                          hasMatchingFile(githubContents, ['CONTRIBUTING.md', 'CONTRIBUTING']);
  checks.push({
    id: 'contributing',
    labelKey: 'check_contributing',
    passed: hasContributing,
    weight: 10,
    points: hasContributing ? 10 : 0,
    detail: hasContributing ? 'Guide de contribution trouvé' : null
  });

  // 7. CODE_OF_CONDUCT présent (10 points)
  // CODE_OF_CONDUCT.md ou .github/CODE_OF_CONDUCT.md
  const hasCodeOfConduct = hasMatchingFile(rootContents, ['CODE_OF_CONDUCT.md', 'CODE_OF_CONDUCT']) ||
                           hasMatchingFile(githubContents, ['CODE_OF_CONDUCT.md', 'CODE_OF_CONDUCT']);
  checks.push({
    id: 'code_of_conduct',
    labelKey: 'check_code_of_conduct',
    passed: hasCodeOfConduct,
    weight: 10,
    points: hasCodeOfConduct ? 10 : 0,
    detail: hasCodeOfConduct ? 'Code de conduite trouvé' : null
  });

  // 8. SUPPORT présent (5 points)
  // SUPPORT.md ou .github/SUPPORT.md
  const hasSupport = hasMatchingFile(rootContents, ['SUPPORT.md', 'SUPPORT']) ||
                     hasMatchingFile(githubContents, ['SUPPORT.md', 'SUPPORT']);
  checks.push({
    id: 'support',
    labelKey: 'check_support',
    passed: hasSupport,
    weight: 5,
    points: hasSupport ? 5 : 0,
    detail: hasSupport ? 'Support et assistance trouvés' : null
  });

  // 9. CHANGELOG présent (10 points)
  // CHANGELOG.md, CHANGELOG, HISTORY.md ou .github/CHANGELOG.md
  const hasChangelog = hasMatchingFile(rootContents, ['CHANGELOG.md', 'CHANGELOG', 'HISTORY.md', 'HISTORY']) ||
                       hasMatchingFile(githubContents, ['CHANGELOG.md', 'CHANGELOG']);
  checks.push({
    id: 'changelog',
    labelKey: 'check_changelog',
    passed: hasChangelog,
    weight: 10,
    points: hasChangelog ? 10 : 0,
    detail: hasChangelog ? 'Journal des modifications trouvé' : null
  });

  for (const check of checks) {
    check.status = check.passed ? 'passed' : 'failed';
  }

  // Calcul du score interne (somme des points obtenus sur 100)
  const totalScore = checks.reduce((sum, c) => sum + c.points, 0);
  const maxScore = 100;

  // Génération des recommandations pour les vérifications échouées
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

  // Tri des recommandations par points décroissants
  recommendations.sort((a, b) => b.points - a.points);

  return {
    id: 'documentation',
    labelKey: 'report_pillar_documentation',
    weight: 20, // Poids de 20% dans le calcul global
    score: Math.min(100, Math.max(0, totalScore)),
    maxScore,
    checks,
    recommendations
  };
}
