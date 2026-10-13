import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCommunityPillar } from '../src/scoring/pillars/community.js';

const base = {
  repo: { owner: { login: 'octocat' } },
  rootContents: [],
  githubContents: [],
  issues: []
};

test('community.js - cas 1 : dépôt solo sans communauté (score 0)', () => {
  const result = computeCommunityPillar({
    ...base,
    contributors: [{ login: 'octocat', contributions: 12 }],
    issues: []
  });

  assert.equal(result.score, 0);
  assert.equal(result.checks.length, 7);
  assert.equal(result.recommendations.length, 7);
  assert.equal(result.weight, 10);
});

test('community.js - cas 2 : 5 contributeurs actifs (35 pts)', () => {
  const result = computeCommunityPillar({
    ...base,
    contributors: [
      { login: 'alice', contributions: 30 },
      { login: 'bob', contributions: 25 },
      { login: 'carol', contributions: 20 },
      { login: 'dave', contributions: 15 },
      { login: 'erin', contributions: 10 }
    ]
  });

  assert.equal(result.score, 35);
  const passedIds = result.checks.filter((check) => check.passed).map((check) => check.id).sort();
  assert.deepEqual(passedIds, ['community_contributors_2', 'community_contributors_5']);
});

test('community.js - cas 3 : bus factor trop faible (> 70 %) doit échouer', () => {
  const result = computeCommunityPillar({
    ...base,
    contributors: [
      { login: 'alice', contributions: 80 },
      { login: 'bob', contributions: 10 },
      { login: 'carol', contributions: 10 }
    ]
  });

  const busCheck = result.checks.find((check) => check.id === 'community_bus_factor');
  assert.equal(busCheck.passed, false);
  assert.equal(busCheck.points, 0);
});

test('community.js - cas 4 : template d’issue présent', () => {
  const result = computeCommunityPillar({
    ...base,
    contributors: [
      { login: 'alice', contributions: 12 },
      { login: 'bob', contributions: 8 }
    ],
    rootContents: [{ name: 'ISSUE_TEMPLATE.md' }]
  });

  const templateCheck = result.checks.find((check) => check.id === 'community_issue_template');
  assert.equal(templateCheck.passed, true);
  assert.equal(templateCheck.points, 15);
});

test('community.js - cas 5 : template de PR absent', () => {
  const result = computeCommunityPillar({
    ...base,
    contributors: [
      { login: 'alice', contributions: 12 },
      { login: 'bob', contributions: 8 }
    ]
  });

  const prCheck = result.checks.find((check) => check.id === 'community_pr_template');
  assert.equal(prCheck.passed, false);
});

test('community.js - cas 6 : temps de réponse rapide (< 30 jours)', () => {
  const now = Date.now();
  const result = computeCommunityPillar({
    ...base,
    contributors: [
      { login: 'alice', contributions: 10 },
      { login: 'bob', contributions: 8 }
    ],
    issues: [
      { state: 'closed', created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), closed_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() }
    ]
  });

  const responseCheck = result.checks.find((check) => check.id === 'community_response_time');
  assert.equal(responseCheck.passed, true);
  assert.equal(responseCheck.points, 10);
});

test('community.js - cas 7 : temps de réponse lent (> 30 jours)', () => {
  const now = Date.now();
  const result = computeCommunityPillar({
    ...base,
    contributors: [
      { login: 'alice', contributions: 10 },
      { login: 'bob', contributions: 8 }
    ],
    issues: [
      { state: 'closed', created_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(), closed_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() }
    ]
  });

  const responseCheck = result.checks.find((check) => check.id === 'community_response_time');
  assert.equal(responseCheck.passed, false);
});

test('community.js - cas 8 : issue fermée par un contributeur externe', () => {
  const now = Date.now();
  const result = computeCommunityPillar({
    ...base,
    contributors: [
      { login: 'alice', contributions: 12 },
      { login: 'bob', contributions: 8 }
    ],
    issues: [
      { state: 'closed', created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), closed_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), user: { login: 'charlie' } }
    ],
    repo: { owner: { login: 'octocat' } }
  });

  const externalCheck = result.checks.find((check) => check.id === 'community_external_closed');
  assert.equal(externalCheck.passed, true);
  assert.equal(externalCheck.points, 10);
});
