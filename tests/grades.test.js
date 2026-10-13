import test from 'node:test';
import assert from 'node:assert/strict';
import { getGrade, GRADE_THRESHOLDS } from '../src/scoring/grades.js';

test('grades.js - vérifie chaque borne critique de score', () => {
  const cases = [
    { score: 100, expected: 'A+' },
    { score: 95, expected: 'A+' },
    { score: 90, expected: 'A+' },
    { score: 89.9, expected: 'A' },
    { score: 89, expected: 'A' },
    { score: 80, expected: 'A' },
    { score: 79.9, expected: 'B' },
    { score: 79, expected: 'B' },
    { score: 70, expected: 'B' },
    { score: 69.9, expected: 'C' },
    { score: 69, expected: 'C' },
    { score: 60, expected: 'C' },
    { score: 59.9, expected: 'D' },
    { score: 59, expected: 'D' },
    { score: 50, expected: 'D' },
    { score: 49.9, expected: 'F' },
    { score: 49, expected: 'F' },
    { score: 25, expected: 'F' },
    { score: 0, expected: 'F' }
  ];

  for (const { score, expected } of cases) {
    const res = getGrade(score);
    assert.equal(res, expected, `Pour le score ${score}, le grade obtenu était ${res} au lieu de ${expected}`);
  }
});

test('grades.js - valeurs hors limites et types invalides', () => {
  assert.equal(getGrade(-10), 'F');
  assert.equal(getGrade(150), 'A+');
  assert.equal(getGrade(NaN), 'F');
  assert.equal(getGrade(null), 'F');
  assert.equal(getGrade('100'), 'F');
});

test('grades.js - GRADE_THRESHOLDS contient tous les seuils ordonnés', () => {
  assert.equal(GRADE_THRESHOLDS.length, 6);
  assert.equal(GRADE_THRESHOLDS[0].grade, 'A+');
  assert.equal(GRADE_THRESHOLDS[5].grade, 'F');
});
