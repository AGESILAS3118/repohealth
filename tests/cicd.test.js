import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCicdPillar } from '../src/scoring/pillars/cicd.js';

test('cicd.js - cas 1 : Aucun workflow, aucun dependabot, aucun renovate (score 0, 7 recommandations)', () => {
  const result = computeCicdPillar({
    workflows: [],
    rootContents: [],
    githubContents: []
  });

  assert.equal(result.score, 0);
  assert.equal(result.checks.length, 7);
  assert.equal(result.checks.filter(c => c.passed).length, 0);
  assert.equal(result.recommendations.length, 7);
  assert.equal(result.weight, 15);
});

test('cicd.js - cas 2 : Un seul workflow quelconque (25 pts)', () => {
  const result = computeCicdPillar({
    workflows: [{ id: 1, name: 'Greeting', path: '.github/workflows/greet.yml' }],
    rootContents: [],
    githubContents: []
  });

  assert.equal(result.score, 25);
  const passed = result.checks.filter(c => c.passed);
  assert.equal(passed.length, 1);
  assert.equal(passed[0].id, 'cicd_workflows_present');
  assert.equal(result.recommendations.length, 6);
});

test('cicd.js - cas 3 : Deux workflows quelconques (25 + 10 = 35 pts)', () => {
  const result = computeCicdPillar({
    workflows: [
      { id: 1, name: 'Greeting', path: '.github/workflows/greet.yml' },
      { id: 2, name: 'Stale', path: '.github/workflows/stale.yml' }
    ],
    rootContents: [],
    githubContents: []
  });

  assert.equal(result.score, 35);
  const passedIds = result.checks.filter(c => c.passed).map(c => c.id).sort();
  assert.deepEqual(passedIds, ['cicd_multiple_workflows', 'cicd_workflows_present']);
});

test('cicd.js - cas 4 : Workflow de tests ou CI (name ou path contient "test", "ci" ou "build")', () => {
  const result = computeCicdPillar({
    workflows: [
      { id: 1, name: 'Run Tests', path: '.github/workflows/run-tests.yml' }
    ]
  });

  // Passe cicd_workflows_present (25) + cicd_tests (20) = 45 pts
  assert.equal(result.score, 45);
  const passedIds = result.checks.filter(c => c.passed).map(c => c.id).sort();
  assert.deepEqual(passedIds, ['cicd_tests', 'cicd_workflows_present']);
});

test('cicd.js - cas 5 : Workflow de release ou publication (name ou path contient "release", "publish", "deploy")', () => {
  const result = computeCicdPillar({
    workflows: [
      { id: 1, name: 'Automated Deploy', path: '.github/workflows/deploy.yml' }
    ]
  });

  // Passe cicd_workflows_present (25) + cicd_release (15) = 40 pts
  assert.equal(result.score, 40);
  const passedIds = result.checks.filter(c => c.passed).map(c => c.id).sort();
  assert.deepEqual(passedIds, ['cicd_release', 'cicd_workflows_present']);
});

test('cicd.js - cas 6 : Dependabot présent dans .github (15 pts)', () => {
  const result = computeCicdPillar({
    workflows: [],
    rootContents: [],
    githubContents: [{ name: 'dependabot.yml' }]
  });

  assert.equal(result.score, 15);
  const passed = result.checks.filter(c => c.passed);
  assert.equal(passed.length, 1);
  assert.equal(passed[0].id, 'cicd_dependabot');
});

test('cicd.js - cas 7 : Renovate présent à la racine (5 pts) et dépôt CI/CD parfait (score 100)', () => {
  // Test Renovate seul
  const renovResult = computeCicdPillar({
    workflows: [],
    rootContents: [{ name: '.renovaterc.json' }],
    githubContents: []
  });
  assert.equal(renovResult.score, 5);

  // Test configuration parfaite (toutes les conditions remplies = 100 pts)
  const perfectResult = computeCicdPillar({
    workflows: [
      { id: 1, name: 'CI Build & Tests', path: '.github/workflows/ci.yml' },
      { id: 2, name: 'Lint & Code Style', path: '.github/workflows/lint.yml' },
      { id: 3, name: 'Release to NPM', path: '.github/workflows/release.yml' }
    ],
    githubContents: [{ name: 'dependabot.yml' }],
    rootContents: [{ name: 'renovate.json' }]
  });

  assert.equal(perfectResult.score, 100);
  assert.equal(perfectResult.checks.filter(c => c.passed).length, 7);
  assert.equal(perfectResult.recommendations.length, 0);
});
