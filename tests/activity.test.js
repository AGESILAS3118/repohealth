import test from 'node:test';
import assert from 'node:assert/strict';
import { computeActivityPillar } from '../src/scoring/pillars/activity.js';

const NOW = 1700000000000; // Timestamp de test déterministe
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function createCommit(daysAgo) {
  const dateStr = new Date(NOW - daysAgo * ONE_DAY_MS).toISOString();
  return {
    sha: 'abc',
    commit: { author: { date: dateStr } }
  };
}

test('activity.js - cas 1 : Dépôt inactif depuis 1 an (score 0, 6 recommandations)', () => {
  const result = computeActivityPillar({
    commits: [createCommit(400)],
    releases: [{ published_at: new Date(NOW - 450 * ONE_DAY_MS).toISOString() }],
    issues: [{ state: 'open' }]
  }, NOW);

  assert.equal(result.score, 0);
  assert.equal(result.checks.length, 6);
  assert.equal(result.checks.filter(c => c.passed).length, 0);
  assert.equal(result.recommendations.length, 6);
  assert.equal(result.weight, 15);
});

test('activity.js - cas 2 : Dépôt avec commit récent < 30 jours (25 + 15 = 40 pts)', () => {
  const result = computeActivityPillar({
    commits: [createCommit(10)],
    releases: [],
    issues: []
  }, NOW);

  // Le commit est à 10 jours donc < 30j (25 pts) et < 90j (15 pts) = 40 pts
  assert.equal(result.score, 40);
  const passedIds = result.checks.filter(c => c.passed).map(c => c.id).sort();
  assert.deepEqual(passedIds, ['activity_commit_90d', 'activity_recent_commit']);
});

test('activity.js - cas 3 : Commits entre 30 et 90 jours (15 pts)', () => {
  const result = computeActivityPillar({
    commits: [createCommit(45)],
    releases: [],
    issues: []
  }, NOW);

  assert.equal(result.score, 15);
  const passedIds = result.checks.filter(c => c.passed).map(c => c.id).sort();
  assert.deepEqual(passedIds, ['activity_commit_90d']);
});

test('activity.js - cas 4 : Commits réguliers sur 6 mois (au moins 12 commits) (20 pts)', () => {
  const commits = [];
  for (let i = 0; i < 15; i++) {
    commits.push(createCommit(i * 10)); // étalés sur 150 jours (< 6 mois)
  }

  const result = computeActivityPillar({
    commits,
    releases: [],
    issues: []
  }, NOW);

  // Commits récents (<30j: 25, <90j: 15, >=12 sur 6m: 20) = 60 pts
  const regularCheck = result.checks.find(c => c.id === 'activity_regular_6m');
  assert.equal(regularCheck.passed, true);
  assert.equal(regularCheck.points, 20);
});

test('activity.js - cas 5 : Release récente dans les 12 derniers mois (15 pts)', () => {
  const result = computeActivityPillar({
    commits: [],
    releases: [{ name: 'v1.0.0', published_at: new Date(NOW - 60 * ONE_DAY_MS).toISOString() }],
    issues: []
  }, NOW);

  assert.equal(result.score, 15);
  const releaseCheck = result.checks.find(c => c.id === 'activity_recent_release');
  assert.equal(releaseCheck.passed, true);
  assert.equal(releaseCheck.points, 15);
});

test('activity.js - cas 6 : Release ancienne (> 12 mois) ne valide pas le check (0 pt)', () => {
  const result = computeActivityPillar({
    commits: [],
    releases: [{ name: 'v0.1.0', published_at: new Date(NOW - 400 * ONE_DAY_MS).toISOString() }],
    issues: []
  }, NOW);

  const releaseCheck = result.checks.find(c => c.id === 'activity_recent_release');
  assert.equal(releaseCheck.passed, false);
});

test('activity.js - cas 7 : Taux de fermeture élevé (> 50%) et issue fermée récemment', () => {
  const result = computeActivityPillar({
    commits: [],
    releases: [],
    issues: [
      { state: 'closed', closed_at: new Date(NOW - 15 * ONE_DAY_MS).toISOString() },
      { state: 'closed', closed_at: new Date(NOW - 40 * ONE_DAY_MS).toISOString() },
      { state: 'open' }
    ]
  }, NOW);

  // 2 fermées sur 3 = 66% (>50% -> 15 pts) + au moins 1 fermée dans les 90j (10 pts) = 25 pts
  assert.equal(result.score, 25);
  const closeRateCheck = result.checks.find(c => c.id === 'activity_issue_close_rate');
  const recentClosedCheck = result.checks.find(c => c.id === 'activity_recent_closed_issue');
  assert.equal(closeRateCheck.passed, true);
  assert.equal(recentClosedCheck.passed, true);
});

test('activity.js - cas 8 : Aucune issue présente et dépôt parfait (score 100)', () => {
  // Aucune issue
  const noIssuesRes = computeActivityPillar({ issues: [] }, NOW);
  const closeRateCheck = noIssuesRes.checks.find(c => c.id === 'activity_issue_close_rate');
  assert.equal(closeRateCheck.passed, false);

  // Dépôt parfait
  const perfectCommits = [];
  for (let i = 0; i < 15; i++) {
    perfectCommits.push(createCommit(i * 5));
  }

  const perfectResult = computeActivityPillar({
    commits: perfectCommits,
    releases: [{ published_at: new Date(NOW - 10 * ONE_DAY_MS).toISOString() }],
    issues: [
      { state: 'closed', closed_at: new Date(NOW - 5 * ONE_DAY_MS).toISOString() },
      { state: 'closed', closed_at: new Date(NOW - 20 * ONE_DAY_MS).toISOString() },
      { state: 'open' }
    ]
  }, NOW);

  assert.equal(perfectResult.score, 100);
  assert.equal(perfectResult.checks.filter(c => c.passed).length, 6);
  assert.equal(perfectResult.recommendations.length, 0);
});
