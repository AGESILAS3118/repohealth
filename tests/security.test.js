import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSecurityPillar } from '../src/scoring/pillars/security.js';

function toBase64(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

test('security.js - cas 1 : Aucun élément (score 0)', () => {
  const result = computeSecurityPillar({
    repo: { license: null, archived: true },
    rootContents: [{ name: '.env' }], // secret exposé
    githubContents: [],
    readme: null
  });

  assert.equal(result.score, 0);
  assert.equal(result.checks.length, 6);
  assert.equal(result.checks.filter(c => c.passed).length, 0);
  assert.equal(result.recommendations.length, 6);
  assert.equal(result.weight, 20);
});

test('security.js - cas 2 : SECURITY.md seul (20 pts)', () => {
  const result = computeSecurityPillar({
    repo: { license: null, archived: true },
    rootContents: [{ name: 'SECURITY.md' }, { name: 'secrets.json' }], // secrets.json empêche le check no_secrets
    githubContents: []
  });

  assert.equal(result.score, 20);
  const passed = result.checks.filter(c => c.passed);
  assert.equal(passed.length, 1);
  assert.equal(passed[0].id, 'security_md');
});

test('security.js - cas 3 : Secrets exposés à la racine pénalise le check (0 pt pour no_secrets)', () => {
  const forbiddenFiles = ['.env', '.env.local', '.env.production', 'secrets.json', 'credentials.json', 'id_rsa', 'id_rsa.pub'];

  for (const secretFile of forbiddenFiles) {
    const res = computeSecurityPillar({
      repo: { license: null, archived: true },
      rootContents: [{ name: secretFile }]
    });
    const checkNoSecrets = res.checks.find(c => c.id === 'security_no_secrets');
    assert.equal(checkNoSecrets.passed, false, `Le fichier ${secretFile} aurait dû faire échouer le check`);
  }
});

test('security.js - cas 4 : Repo archivé fait échouer le check not_archived', () => {
  const result = computeSecurityPillar({
    repo: { license: null, archived: true },
    rootContents: []
  });

  const checkArchived = result.checks.find(c => c.id === 'security_not_archived');
  assert.equal(checkArchived.passed, false);
});

test('security.js - cas 5 : Licence présente (15 pts)', () => {
  const result = computeSecurityPillar({
    repo: { license: { spdx_id: 'MIT', name: 'MIT License' }, archived: true },
    rootContents: [{ name: '.env' }] // invalide no_secrets
  });

  assert.equal(result.score, 15);
  const checkLic = result.checks.find(c => c.id === 'security_license');
  assert.equal(checkLic.passed, true);
  assert.equal(checkLic.points, 15);
});

test('security.js - cas 6 : README avec section sécurité (15 pts)', () => {
  const readmeWithSecurity = `# Mon Projet\n\n## Sécurité\nPour signaler une faille, écrivez à security@example.com`;
  const result = computeSecurityPillar({
    repo: { license: null, archived: true },
    rootContents: [{ name: '.env' }],
    readme: { content: toBase64(readmeWithSecurity) }
  });

  assert.equal(result.score, 15);
  const checkDoc = result.checks.find(c => c.id === 'security_documented');
  assert.equal(checkDoc.passed, true);
  assert.equal(checkDoc.points, 15);
});

test('security.js - cas 7 : Dependabot configuré dans .github (20 pts)', () => {
  const result = computeSecurityPillar({
    repo: { license: null, archived: true },
    rootContents: [{ name: '.env' }],
    githubContents: [{ name: 'dependabot.yml' }]
  });

  assert.equal(result.score, 20);
  const checkDep = result.checks.find(c => c.id === 'security_dependabot');
  assert.equal(checkDep.passed, true);
  assert.equal(checkDep.points, 20);
});

test('security.js - cas 8 : Dépôt parfait (score 100, 0 recommandation)', () => {
  const perfectReadme = `# Projet\n## Security Guidelines\nPlease contact us privately.`;
  const result = computeSecurityPillar({
    repo: { license: { key: 'mit' }, archived: false },
    rootContents: [{ name: 'SECURITY.md' }, { name: 'index.js' }],
    githubContents: [{ name: 'dependabot.yml' }],
    readme: { content: toBase64(perfectReadme) }
  });

  assert.equal(result.score, 100);
  assert.equal(result.checks.filter(c => c.passed).length, 6);
  assert.equal(result.recommendations.length, 0);
});
