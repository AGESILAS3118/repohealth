import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDocumentation, decodeBase64Content } from '../src/scoring/pillars/documentation.js';

function toBase64(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

test('documentation.js - cas 1 : Dépôt complètement vide (score 0, 9 recommandations)', () => {
  const result = evaluateDocumentation({
    readme: null,
    rootContents: [],
    githubContents: []
  });

  assert.equal(result.score, 0);
  assert.equal(result.maxScore, 100);
  assert.equal(result.checks.length, 9);
  assert.equal(result.checks.filter(c => c.passed).length, 0);
  assert.equal(result.recommendations.length, 9);

  // Vérifier le tri décroissant par points
  for (let i = 0; i < result.recommendations.length - 1; i++) {
    assert.ok(result.recommendations[i].points >= result.recommendations[i + 1].points);
  }
});

test('documentation.js - cas 2 : Dépôt parfait (score 100, 0 recommandation)', () => {
  const fullReadme = `# Mon Projet\n\nBienvenue dans ce projet super documenté.\n\n## Installation\n\nExécutez ceci :\n\`\`\`bash\nnpm install mon-projet\n\`\`\`\n\n## Utilisation\n\n` + 'Texte informatif '.repeat(60);

  const result = evaluateDocumentation({
    readme: {
      name: 'README.md',
      content: toBase64(fullReadme)
    },
    rootContents: [
      { name: 'LICENSE' },
      { name: 'CONTRIBUTING.md' },
      { name: 'CODE_OF_CONDUCT.md' },
      { name: 'SUPPORT.md' },
      { name: 'CHANGELOG.md' }
    ],
    githubContents: []
  });

  assert.equal(result.score, 100);
  assert.equal(result.checks.filter(c => c.passed).length, 9);
  assert.equal(result.recommendations.length, 0);
});

test('documentation.js - cas 3 : README seul mais non substantiel (<800 carac, pas de code ni titres)', () => {
  const tinyReadme = 'Ceci est un tout petit projet sans instructions.';

  const result = evaluateDocumentation({
    readme: {
      name: 'README.md',
      content: toBase64(tinyReadme)
    },
    rootContents: [],
    githubContents: []
  });

  // Seul le check readme_present (15 pts) passe
  assert.equal(result.score, 15);
  const passedChecks = result.checks.filter(c => c.passed);
  assert.equal(passedChecks.length, 1);
  assert.equal(passedChecks[0].id, 'readme_present');
  assert.equal(result.recommendations.length, 8);
});

test('documentation.js - cas 4 : LICENSE seule', () => {
  const result = evaluateDocumentation({
    readme: null,
    rootContents: [{ name: 'LICENSE.txt' }],
    githubContents: []
  });

  // Seul le check license (15 pts) passe
  assert.equal(result.score, 15);
  const passedChecks = result.checks.filter(c => c.passed);
  assert.equal(passedChecks.length, 1);
  assert.equal(passedChecks[0].id, 'license');
});

test('documentation.js - cas 5 : README basique + LICENSE + CONTRIBUTING (dans .github)', () => {
  const simpleReadme = `# Titre\n## Sous-titre\nCourt texte.`;

  const result = evaluateDocumentation({
    readme: {
      name: 'README.md',
      content: toBase64(simpleReadme)
    },
    rootContents: [
      { name: 'COPYING' }
    ],
    githubContents: [
      { name: 'CONTRIBUTING.md' }
    ]
  });

  // Passent : readme_present (15), readme_structured (10), license (15), contributing (10) = 50 pts
  assert.equal(result.score, 50);
  const passedIds = result.checks.filter(c => c.passed).map(c => c.id).sort();
  assert.deepEqual(passedIds, ['contributing', 'license', 'readme_present', 'readme_structured']);
});

test('documentation.js - cas 6 : Priorité correcte des recommandations', () => {
  const result = evaluateDocumentation({
    readme: null,
    rootContents: [],
    githubContents: []
  });

  // Vérifier les priorités assignées selon les points
  const highPriority = result.recommendations.filter(r => r.priority === 'high');
  const mediumPriority = result.recommendations.filter(r => r.priority === 'medium');
  const lowPriority = result.recommendations.filter(r => r.priority === 'low');

  // >= 15 pts : readme_present (15), readme_substantial (15), license (15) -> 3 high
  assert.equal(highPriority.length, 3);
  highPriority.forEach(r => assert.ok(r.points >= 15));

  // 10 pts : readme_structured (10), readme_examples (10), contributing (10), code_of_conduct (10), changelog (10) -> 5 medium
  assert.equal(mediumPriority.length, 5);
  mediumPriority.forEach(r => assert.equal(r.points, 10));

  // < 10 pts : support (5) -> 1 low
  assert.equal(lowPriority.length, 1);
  assert.equal(lowPriority[0].id, 'rec_support');
  assert.equal(lowPriority[0].points, 5);
});
