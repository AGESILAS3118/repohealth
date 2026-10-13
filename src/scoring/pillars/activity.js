/**
 * Pilier 4 : Activité et maintenance (Pondération globale : 15 %)
 * Évalue la récence des commits, la régularité sur 6 mois, les releases et le traitement des issues.
 * Total des points internes : 100 points, ramenés sur l'échelle du pilier.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
const NINETY_DAYS_MS = 90 * ONE_DAY_MS;
const SIX_MONTHS_MS = 182 * ONE_DAY_MS;
const TWELVE_MONTHS_MS = 365 * ONE_DAY_MS;

/**
 * Extrait la date d'un commit en millisecondes.
 * @param {object} commitItem 
 * @returns {number|null}
 */
function getCommitTimestamp(commitItem) {
  if (!commitItem) return null;
  const dateStr = commitItem.commit?.author?.date ||
                  commitItem.commit?.committer?.date ||
                  commitItem.author?.date;
  if (!dateStr) return null;
  const ts = Date.parse(dateStr);
  return Number.isNaN(ts) ? null : ts;
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
 * Évalue le pilier Activité et maintenance à partir des données de runAnalysis.
 * 
 * @param {object} analysisData - Données d'analyse produites par runAnalysis.
 * @param {number} [referenceTime=Date.now()] - Horodatage de référence (permet d'injecter une date fixe dans les tests).
 * @returns {import('../types.js').PillarResult}
 */
export function computeActivityPillar(analysisData = {}, referenceTime = Date.now()) {
  const safeData = (analysisData && typeof analysisData === 'object') ? analysisData : {};
  const commits = Array.isArray(safeData.commits) ? safeData.commits : [];
  const releases = Array.isArray(safeData.releases) ? safeData.releases : [];
  const issues = Array.isArray(safeData.issues) ? safeData.issues : [];

  const now = referenceTime;

  /** @type {import('../types.js').CheckResult[]} */
  const checks = [];

  // Récence du dernier commit
  const latestCommitTs = commits.length > 0 ? getCommitTimestamp(commits[0]) : null;
  const commitAgeMs = latestCommitTs !== null ? (now - latestCommitTs) : Infinity;

  // 1. Dernier commit < 30 jours (25 pts)
  const isCommitWithin30d = commitAgeMs <= THIRTY_DAYS_MS;
  checks.push({
    id: 'activity_recent_commit',
    labelKey: 'check_activity_recent_commit',
    passed: isCommitWithin30d,
    weight: 25,
    points: isCommitWithin30d ? 25 : 0,
    detail: isCommitWithin30d ? 'Dernier commit il y a moins de 30 jours' : null
  });

  // 2. Dernier commit < 90 jours (15 pts) - (si < 30j, c'est également < 90j)
  const isCommitWithin90d = commitAgeMs <= NINETY_DAYS_MS;
  checks.push({
    id: 'activity_commit_90d',
    labelKey: 'check_activity_commit_90d',
    passed: isCommitWithin90d,
    weight: 15,
    points: isCommitWithin90d ? 15 : 0,
    detail: isCommitWithin90d ? 'Dernier commit il y a moins de 90 jours' : null
  });

  // 3. Activité régulière sur 6 mois (20 pts)
  // Au moins 12 commits datés de moins de 6 mois
  const commitsInLast6m = commits.filter(c => {
    const ts = getCommitTimestamp(c);
    return ts !== null && (now - ts) <= SIX_MONTHS_MS;
  });
  const hasRegularCommits = commitsInLast6m.length >= 12;
  checks.push({
    id: 'activity_regular_6m',
    labelKey: 'check_activity_regular_6m',
    passed: hasRegularCommits,
    weight: 20,
    points: hasRegularCommits ? 20 : 0,
    detail: `${commitsInLast6m.length} commits sur les 6 derniers mois (requis : >= 12)`
  });

  // 4. Release dans les 12 derniers mois (15 pts)
  let hasReleaseWithin12m = false;
  if (releases.length > 0 && releases[0]) {
    const relDateStr = releases[0].published_at || releases[0].created_at;
    if (relDateStr) {
      const relTs = Date.parse(relDateStr);
      if (!Number.isNaN(relTs) && (now - relTs) <= TWELVE_MONTHS_MS) {
        hasReleaseWithin12m = true;
      }
    }
  }
  checks.push({
    id: 'activity_recent_release',
    labelKey: 'check_activity_recent_release',
    passed: hasReleaseWithin12m,
    weight: 15,
    points: hasReleaseWithin12m ? 15 : 0,
    detail: hasReleaseWithin12m ? `Release récente : ${releases[0]?.name || releases[0]?.tag_name}` : null
  });

  // Filtrer les issues pures (GitHub API retourne aussi les pull requests dans /issues, distinguables par item.pull_request)
  const actualIssues = issues.filter(i => !i.pull_request);
  const totalIssuesCount = actualIssues.length;
  const closedIssues = actualIssues.filter(i => i.state === 'closed');
  const closedIssuesCount = closedIssues.length;

  // 5. Taux de fermeture des issues > 50 % (15 pts)
  // Si aucune issue, on considère que le dépôt est sain seulement s'il montre d'autres signes d'activité maintenue.
  const closeRate = totalIssuesCount > 0 ? (closedIssuesCount / totalIssuesCount) : 0;
  const noIssueButActiveRepo = totalIssuesCount === 0 && (hasRegularCommits || (hasReleaseWithin12m && commits.length > 0));
  const hasGoodCloseRate = (totalIssuesCount > 0 && closeRate > 0.5) || noIssueButActiveRepo;
  checks.push({
    id: 'activity_issue_close_rate',
    labelKey: 'check_activity_issue_close_rate',
    passed: hasGoodCloseRate,
    weight: 15,
    points: hasGoodCloseRate ? 15 : 0,
    detail: totalIssuesCount > 0 ? `${Math.round(closeRate * 100)} % fermées (${closedIssuesCount}/${totalIssuesCount})` : 'Aucune issue trouvée'
  });

  // 6. Au moins une issue fermée dans les 90 derniers jours (10 pts)
  const hasRecentClosedIssue = closedIssues.some(issue => {
    const closedAtStr = issue.closed_at;
    if (!closedAtStr) return false;
    const closedTs = Date.parse(closedAtStr);
    return !Number.isNaN(closedTs) && (now - closedTs) <= NINETY_DAYS_MS;
  }) || noIssueButActiveRepo;
  checks.push({
    id: 'activity_recent_closed_issue',
    labelKey: 'check_activity_recent_closed_issue',
    passed: hasRecentClosedIssue,
    weight: 10,
    points: hasRecentClosedIssue ? 10 : 0,
    detail: hasRecentClosedIssue ? 'Au moins une issue traitée et fermée récemment' : null
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
    id: 'activity',
    labelKey: 'report_pillar_activity',
    weight: 15,
    score: Math.min(100, Math.max(0, totalScore)),
    maxScore,
    checks,
    recommendations
  };
}
