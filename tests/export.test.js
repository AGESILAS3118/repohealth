import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExportPayload } from '../src/export/json.js';
import { ENGINE_VERSION } from '../src/scoring/version.js';

const meta = {
  owner: 'octocat',
  name: 'hello-world',
  analyzedAt: '2026-10-12T10:15:30.000Z',
  generatedAt: '2026-10-13T11:35:55.000Z',
  pillarNames: { security: 'Security' }
};

const report = {
  engineVersion: ENGINE_VERSION,
  computedAt: meta.analyzedAt,
  score: 87,
  grade: 'B',
  pillars: [{
    id: 'security',
    labelKey: 'report_pillar_security',
    weight: 20,
    score: null,
    status: 'not_verifiable',
    checks: [{ id: 'security_md', status: 'not_verifiable', passed: false, weight: 10, points: 0 }],
    recommendations: [{ id: 'add-security-policy', points: 10, priority: 'medium' }]
  }],
  unverifiablePillars: [{ id: 'security', labelKey: 'report_pillar_security', reason: 'Missing evidence' }]
};

test('export JSON - contient toutes les clés attendues', () => {
  const { json } = buildExportPayload(report, meta);
  const payload = JSON.parse(json);

  assert.deepEqual(Object.keys(payload), [
    'schemaVersion', 'engineVersion', 'generatedAt', 'analyzedAt', 'repository',
    'score', 'grade', 'pillars', 'unverifiablePillars', 'disclaimer'
  ]);
  assert.deepEqual(Object.keys(payload.repository), ['owner', 'name', 'fullName', 'url']);
  assert.deepEqual(Object.keys(payload.pillars[0]), [
    'id', 'name', 'weight', 'score', 'status', 'checks', 'recommendations'
  ]);
});

test('export JSON - versions de schéma et moteur non vides', () => {
  const payload = JSON.parse(buildExportPayload(report, meta).json);
  assert.equal(payload.schemaVersion, '1.0');
  assert.equal(payload.engineVersion, '1.0.0');
  assert.ok(payload.schemaVersion.length > 0);
  assert.ok(payload.engineVersion.length > 0);
});

test('export JSON - date générée et date analysée au format ISO 8601', () => {
  const payload = JSON.parse(buildExportPayload(report, meta).json);
  for (const key of ['generatedAt', 'analyzedAt']) {
    assert.equal(new Date(payload[key]).toISOString(), payload[key]);
  }
});

test('export JSON - round-trip sans perte de données', () => {
  const { json } = buildExportPayload(report, meta);
  assert.deepEqual(JSON.parse(JSON.stringify(JSON.parse(json))), JSON.parse(json));
});

test('export JSON - nom de fichier conforme avec date UTC', () => {
  const { filename } = buildExportPayload(report, meta);
  assert.equal(filename, 'repochealth-octocat-hello-world-2026-10-13.json');
});

test('export JSON - sécurise les segments owner et repo dans le nom', () => {
  const { filename } = buildExportPayload(report, {
    ...meta,
    owner: '../Mon Owner\\',
    name: 'répo / dangereux..'
  });
  assert.equal(filename, 'repochealth-mon-owner-repo-dangereux-2026-10-13.json');
  assert.doesNotMatch(filename, /[\/\\\s]|\.\./);
});

test('export JSON - score et grade null restent valides', () => {
  const { json } = buildExportPayload({ ...report, score: null, grade: null }, meta);
  const payload = JSON.parse(json);
  assert.equal(payload.score, null);
  assert.equal(payload.grade, null);
});

test('export JSON - garde les piliers non vérifiables et leur statut', () => {
  const payload = JSON.parse(buildExportPayload(report, meta).json);
  assert.equal(payload.pillars[0].status, 'not_verifiable');
  assert.equal(payload.pillars[0].checks[0].status, 'not_verifiable');
  assert.equal(payload.unverifiablePillars[0].id, 'security');
});

test('export JSON - avertissement présent en français et en anglais', () => {
  const payload = JSON.parse(buildExportPayload(report, meta).json);
  assert.match(payload.disclaimer.fr, /aide à la décision/);
  assert.match(payload.disclaimer.fr, /audit professionnel de sécurité/);
  assert.match(payload.disclaimer.en, /decision aid/);
  assert.match(payload.disclaimer.en, /professional security audit/);
});

test('export JSON - sérialise uniquement des données sans fonctions', () => {
  const withFunction = {
    ...report,
    pillars: [{
      ...report.pillars[0],
      checks: [{ id: 'check', callback() {} }]
    }]
  };
  const payload = JSON.parse(buildExportPayload(withFunction, meta).json);
  assert.deepEqual(payload.pillars[0].checks, [{ id: 'check' }]);
});

test('export JSON - utilise une date d’analyse explicite si le rapport ne la fournit pas', () => {
  const payload = JSON.parse(buildExportPayload(
    { ...report, computedAt: undefined },
    { ...meta, analyzedAt: '2026-10-11T00:00:00Z' }
  ).json);
  assert.equal(payload.analyzedAt, '2026-10-11T00:00:00.000Z');
});
