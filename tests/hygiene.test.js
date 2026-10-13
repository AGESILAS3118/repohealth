import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHygienePillar } from '../src/scoring/pillars/hygiene.js';

const baseRepo = {
  description: 'A well described project for modern software engineering.',
  topics: ['js', 'tooling', 'web'],
  size: 1200,
  homepage: 'https://example.com',
  fork: false
};

test('hygiene.js - cas 1 : .gitignore absent (score 80)', () => {
  const result = computeHygienePillar({
    repo: { ...baseRepo, description: 'A valid description' },
    rootContents: []
  });

  const gitignoreCheck = result.checks.find((check) => check.id === 'hygiene_gitignore');
  assert.equal(gitignoreCheck.passed, false);
  assert.equal(result.score, 80);
});

test('hygiene.js - cas 2 : description vide', () => {
  const result = computeHygienePillar({
    repo: { ...baseRepo, description: 'short' },
    rootContents: [{ name: '.gitignore' }]
  });

  const descriptionCheck = result.checks.find((check) => check.id === 'hygiene_description');
  assert.equal(descriptionCheck.passed, false);
});

test('hygiene.js - cas 3 : topics manquants', () => {
  const result = computeHygienePillar({
    repo: { ...baseRepo, topics: ['js'] },
    rootContents: [{ name: '.gitignore' }]
  });

  const topicsCheck = result.checks.find((check) => check.id === 'hygiene_topics');
  assert.equal(topicsCheck.passed, false);
});

test('hygiene.js - cas 4 : dépôt trop volumineux', () => {
  const result = computeHygienePillar({
    repo: { ...baseRepo, size: 600000 },
    rootContents: [{ name: '.gitignore' }]
  });

  const sizeCheck = result.checks.find((check) => check.id === 'hygiene_size');
  assert.equal(sizeCheck.passed, false);
});

test('hygiene.js - cas 5 : fichiers binaires détectés', () => {
  const result = computeHygienePillar({
    repo: baseRepo,
    rootContents: [{ name: '.gitignore' }, { name: 'archive.zip' }]
  });

  const binaryCheck = result.checks.find((check) => check.id === 'hygiene_no_binaries');
  assert.equal(binaryCheck.passed, false);
});

test('hygiene.js - cas 6 : homepage absente', () => {
  const result = computeHygienePillar({
    repo: { ...baseRepo, homepage: '' },
    rootContents: [{ name: '.gitignore' }]
  });

  const homepageCheck = result.checks.find((check) => check.id === 'hygiene_homepage');
  assert.equal(homepageCheck.passed, false);
});

test('hygiene.js - cas 7 : dépôt forké', () => {
  const result = computeHygienePillar({
    repo: { ...baseRepo, fork: true },
    rootContents: [{ name: '.gitignore' }]
  });

  const forkCheck = result.checks.find((check) => check.id === 'hygiene_not_fork');
  assert.equal(forkCheck.passed, false);
});

test('hygiene.js - cas 8 : dépôt parfait (score 100)', () => {
  const result = computeHygienePillar({
    repo: baseRepo,
    rootContents: [{ name: '.gitignore' }]
  });

  assert.equal(result.score, 100);
  assert.equal(result.checks.filter((check) => check.passed).length, 7);
  assert.equal(result.recommendations.length, 0);
});
