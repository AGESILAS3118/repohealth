/**
 * Pilier 5 : Communauté (Pondération globale : 10 %)
 * Évalue les contributeurs, les modèles de collaboration et la réactivité sur les issues.
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

function parseIssueDate(dateString) {
  if (!dateString) return null;
  const timestamp = Date.parse(dateString);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getPriorityForPoints(points) {
  if (points >= 15) return 'high';
  if (points >= 10) return 'medium';
  return 'low';
}

export function computeCommunityPillar(analysisData = {}) {
  const safeData = analysisData && typeof analysisData === 'object' ? analysisData : {};
  const contributors = Array.isArray(safeData.contributors) ? safeData.contributors : [];
  const issues = Array.isArray(safeData.issues) ? safeData.issues : [];
  const repo = safeData.repo || {};
  const rootContents = Array.isArray(safeData.rootContents) ? safeData.rootContents : [];
  const githubContents = Array.isArray(safeData.githubContents) ? safeData.githubContents : [];
  const repoOwner = repo.owner && repo.owner.login ? repo.owner.login : null;

  const totalContributions = contributors.reduce((sum, contributor) => {
    const value = Number(contributor && contributor.contributions);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const topContributorShare = totalContributions > 0 && contributors.length > 0
    ? (Number(contributors[0]?.contributions) || 0) / totalContributions
    : 0;

  const closedIssues = issues.filter((issue) => issue && issue.state === 'closed');
  const validClosedResponseTimes = closedIssues
    .map((issue) => {
      const createdAt = parseIssueDate(issue.created_at);
      const closedAt = parseIssueDate(issue.closed_at);
      if (createdAt === null || closedAt === null) return null;
      return (closedAt - createdAt) / (24 * 60 * 60 * 1000);
    })
    .filter((value) => Number.isFinite(value));

  const averageResponseDays = validClosedResponseTimes.length > 0
    ? validClosedResponseTimes.reduce((sum, value) => sum + value, 0) / validClosedResponseTimes.length
    : null;

  const hasExternalClosedIssue = closedIssues.some((issue) => {
    const userLogin = issue && issue.user && issue.user.login ? issue.user.login : null;
    return Boolean(userLogin && repoOwner && userLogin !== repoOwner);
  });

  const checks = [
    {
      id: 'community_contributors_2',
      labelKey: 'check_community_contributors_2',
      passed: contributors.length >= 2,
      weight: 20,
      points: contributors.length >= 2 ? 20 : 0,
      detail: contributors.length >= 2 ? `${contributors.length} contributeurs détectés` : null
    },
    {
      id: 'community_contributors_5',
      labelKey: 'check_community_contributors_5',
      passed: contributors.length >= 5,
      weight: 15,
      points: contributors.length >= 5 ? 15 : 0,
      detail: contributors.length >= 5 ? `${contributors.length} contributeurs actifs` : null
    },
    {
      id: 'community_bus_factor',
      labelKey: 'check_community_bus_factor',
      passed: contributors.length > 0 && totalContributions > 0 && topContributorShare < 0.7 && (
        contributors.length < 5 ||
        hasMatchingFile(rootContents, ['ISSUE_TEMPLATE', 'ISSUE_TEMPLATE.md']) ||
        hasMatchingFile(githubContents, ['ISSUE_TEMPLATE', 'ISSUE_TEMPLATE.md']) ||
        hasMatchingFile(rootContents, ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE']) ||
        hasMatchingFile(githubContents, ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE']) ||
        averageResponseDays !== null ||
        hasExternalClosedIssue
      ),
      weight: 20,
      points: contributors.length > 0 && totalContributions > 0 && topContributorShare < 0.7 && (
        contributors.length < 5 ||
        hasMatchingFile(rootContents, ['ISSUE_TEMPLATE', 'ISSUE_TEMPLATE.md']) ||
        hasMatchingFile(githubContents, ['ISSUE_TEMPLATE', 'ISSUE_TEMPLATE.md']) ||
        hasMatchingFile(rootContents, ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE']) ||
        hasMatchingFile(githubContents, ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE']) ||
        averageResponseDays !== null ||
        hasExternalClosedIssue
      ) ? 20 : 0,
      detail: contributors.length > 0 && totalContributions > 0 ? `${Math.round(topContributorShare * 100)}% du total attribué au principal contributeur` : null
    },
    {
      id: 'community_issue_template',
      labelKey: 'check_community_issue_template',
      passed: hasMatchingFile(rootContents, ['ISSUE_TEMPLATE', 'ISSUE_TEMPLATE.md']) || hasMatchingFile(githubContents, ['ISSUE_TEMPLATE', 'ISSUE_TEMPLATE.md']) || hasMatchingFile(rootContents, ['issue_template']) || hasMatchingFile(githubContents, ['issue_template']),
      weight: 15,
      points: (hasMatchingFile(rootContents, ['ISSUE_TEMPLATE', 'ISSUE_TEMPLATE.md']) || hasMatchingFile(githubContents, ['ISSUE_TEMPLATE', 'ISSUE_TEMPLATE.md']) || hasMatchingFile(rootContents, ['issue_template']) || hasMatchingFile(githubContents, ['issue_template'])) ? 15 : 0,
      detail: null
    },
    {
      id: 'community_pr_template',
      labelKey: 'check_community_pr_template',
      passed: hasMatchingFile(rootContents, ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE']) || hasMatchingFile(githubContents, ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE']),
      weight: 10,
      points: (hasMatchingFile(rootContents, ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE']) || hasMatchingFile(githubContents, ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE'])) ? 10 : 0,
      detail: null
    },
    {
      id: 'community_response_time',
      labelKey: 'check_community_response_time',
      passed: averageResponseDays !== null && averageResponseDays < 30,
      weight: 10,
      points: averageResponseDays !== null && averageResponseDays < 30 ? 10 : 0,
      detail: averageResponseDays !== null ? `${averageResponseDays.toFixed(1)} jours de réponse moyenne` : null
    },
    {
      id: 'community_external_closed',
      labelKey: 'check_community_external_closed',
      passed: hasExternalClosedIssue,
      weight: 10,
      points: hasExternalClosedIssue ? 10 : 0,
      detail: hasExternalClosedIssue ? 'Issue fermée par contributeur externe détectée' : null
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
    id: 'community',
    labelKey: 'report_pillar_community',
    weight: 10,
    score: Math.min(100, Math.max(0, totalScore)),
    maxScore: 100,
    checks,
    recommendations
  };
}
