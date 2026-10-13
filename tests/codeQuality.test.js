import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCodeQualityPillar } from '../src/scoring/pillars/codeQuality.js';

test('codeQuality.js - cas 1 : dépôt sans tests (score 0)', () => {
  const result = computeCodeQualityPillar({
    rootContents: [],
    workflows: []
  });

  assert.equal(result.score, 0);
  assert.equal(result.checks.length, 7);
  assert.equal(result.recommendations.length, 7);
  assert.equal(result.weight, 10);
});

test('codeQuality.js - cas 2 : dossier tests présent (25 pts)', () => {
  const result = computeCodeQualityPillar({
    rootContents: [{ name: 'tests' }],
    workflows: []
  });

  const testsCheck = result.checks.find((check) => check.id === 'quality_tests_dir');
  assert.equal(testsCheck.passed, true);
  assert.equal(testsCheck.points, 25);
});

test('codeQuality.js - cas 3 : configuration de coverage', () => {
  const result = computeCodeQualityPillar({
    rootContents: [{ name: 'coverage' }],
    workflows: []
  });

  const coverageCheck = result.checks.find((check) => check.id === 'quality_coverage');
  assert.equal(coverageCheck.passed, true);
  assert.equal(coverageCheck.points, 15);
});

test('codeQuality.js - cas 4 : sans linter', () => {
  const result = computeCodeQualityPillar({
    rootContents: [{ name: 'tests' }, { name: 'jest.config.js' }],
    workflows: []
  });

  const linterCheck = result.checks.find((check) => check.id === 'quality_linter');
  assert.equal(linterCheck.passed, false);
});

test('codeQuality.js - cas 5 : linter + formatter présents', () => {
  const result = computeCodeQualityPillar({
    rootContents: [
      { name: 'tests' },
      { name: 'jest.config.js' },
      { name: '.eslintrc.js' },
      { name: '.prettierrc' }
    ],
    workflows: []
  });

  assert.equal(result.checks.find((check) => check.id === 'quality_linter').passed, true);
  assert.equal(result.checks.find((check) => check.id === 'quality_formatter').passed, true);
});

test('codeQuality.js - cas 6 : structure plate sans organisation claire', () => {
  const result = computeCodeQualityPillar({
    rootContents: [{ name: 'README.md' }, { name: 'LICENSE' }, { name: 'index.js' }],
    workflows: []
  });

  const structureCheck = result.checks.find((check) => check.id === 'quality_structure');
  assert.equal(structureCheck.passed, false);
});

test('codeQuality.js - cas 7 : structure claire détectée', () => {
  const result = computeCodeQualityPillar({
    rootContents: [{ name: 'src' }, { name: 'app' }, { name: 'tests' }],
    workflows: []
  });

  const structureCheck = result.checks.find((check) => check.id === 'quality_structure');
  assert.equal(structureCheck.passed, true);
  assert.equal(structureCheck.points, 10);
});

test('codeQuality.js - cas 8 : typage détecté', () => {
  const result = computeCodeQualityPillar({
    rootContents: [{ name: 'tsconfig.json' }],
    workflows: []
  });

  const typesCheck = result.checks.find((check) => check.id === 'quality_types');
  assert.equal(typesCheck.passed, true);
  assert.equal(typesCheck.points, 10);
});

test('codeQuality.js - détecte node --test dans le script test', () => {
  const result = computeCodeQualityPillar({
    rootContents: [],
    packageJson: { scripts: { test: 'node --test' } }
  });

  const check = result.checks.find((item) => item.id === 'quality_test_config');
  assert.equal(check.passed, true);
  assert.equal(check.points, 15);
});

test('codeQuality.js - détecte node --test avec un chemin et options', () => {
  for (const script of ['node --test tests/', 'node --test --test-reporter=spec tests/']) {
    const result = computeCodeQualityPillar({
      rootContents: [],
      packageJson: { scripts: { test: script } }
    });
    assert.equal(result.checks.find((item) => item.id === 'quality_test_config').passed, true);
  }
});

test('codeQuality.js - détecte node --test dans un script npm alternatif', () => {
  const result = computeCodeQualityPillar({
    rootContents: [],
    packageJson: { scripts: { 'test:unit': 'node --test' } }
  });

  assert.equal(result.checks.find((item) => item.id === 'quality_test_config').passed, true);
});

test('codeQuality.js - détecte les imports node:test dans les fichiers de test pris en charge', () => {
  for (const file of [
    { path: 'tests/example.test.js', content: "import test from 'node:test';" },
    { path: 'test/example.test.mjs', content: "import { test } from 'node:test';" },
    { path: '__tests__/example.test.cjs', content: "const test = require('node:test');" }
  ]) {
    const result = computeCodeQualityPillar({ rootContents: [], testFiles: [file] });
    assert.equal(result.checks.find((item) => item.id === 'quality_test_config').passed, true);
  }
});

test('codeQuality.js - Jest reste détecté sans régression', () => {
  const result = computeCodeQualityPillar({
    rootContents: [{ name: 'jest.config.js' }]
  });

  assert.equal(result.checks.find((item) => item.id === 'quality_test_config').points, 15);
});

test('codeQuality.js - sans framework, le score reste inchangé', () => {
  const result = computeCodeQualityPillar({
    rootContents: [{ name: 'tests' }],
    packageJson: { scripts: { test: 'node app.js' } },
    testFiles: [{ path: 'tests/example.test.js', content: 'assert.equal(1, 1);' }]
  });

  assert.equal(result.score, 25);
  assert.equal(result.checks.find((item) => item.id === 'quality_test_config').points, 0);
});
