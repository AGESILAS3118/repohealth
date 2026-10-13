import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScoreReport, ENGINE_VERSION, normalizePillarResult } from '../src/scoring/engine.js';
import { computeSecurityPillar } from '../src/scoring/pillars/security.js';
import { computeCommunityPillar } from '../src/scoring/pillars/community.js';
import { computeCodeQualityPillar } from '../src/scoring/pillars/codeQuality.js';
import { computeHygienePillar } from '../src/scoring/pillars/hygiene.js';

test('engine.js - expose la version moteur officielle 1.0.0', () => {
  assert.equal(ENGINE_VERSION, '1.0.0');
});

test('engine.js - structure conforme et rapport explicitement non évaluable sans données', () => {
  const report = computeScoreReport({});

  assert.equal(report.score, null);
  assert.equal(report.grade, null);
  assert.match(report.message, /Aucun pilier n’a pu être évalué/);
  assert.ok(Array.isArray(report.pillars));
  assert.equal(report.pillars.length, 7, 'Les sept piliers sont enregistrés');
  assert.equal(report.unverifiablePillars.length, 7);
  assert.ok(report.pillars.every((pillar) => pillar.score === null));
  assert.equal(ENGINE_VERSION, '1.0.0');
  assert.equal(report.engineVersion, '1.0.0');
  assert.equal(report.engineVersion, ENGINE_VERSION);
  assert.ok(typeof report.computedAt === 'string');

  const [doc, cicd, sec, act, community, quality, hygiene] = report.pillars;
  assert.equal(doc.id, 'documentation');
  assert.equal(doc.weight, 20);
  assert.equal(cicd.id, 'cicd');
  assert.equal(cicd.weight, 15);
  assert.equal(sec.id, 'security');
  assert.equal(sec.weight, 20);
  assert.equal(act.id, 'activity');
  assert.equal(act.weight, 15);
  assert.equal(community.id, 'community');
  assert.equal(community.weight, 10);
  assert.equal(quality.id, 'codeQuality');
  assert.equal(quality.weight, 10);
  assert.equal(hygiene.id, 'hygiene');
  assert.equal(hygiene.weight, 10);

  const totalWeight = report.pillars.reduce((sum, pillar) => sum + pillar.weight, 0);
  assert.equal(totalWeight, 100);
});

test('engine.js - moyenne pondérée : tous les piliers à 100 -> score global 100', () => {
  const perfectReadme = `# Project\n## Security Guidelines\n\`\`\`bash\nnpm test\n\`\`\`\n` + 'Description '.repeat(80);
  const now = Date.now();
  const commits = [];
  for (let i = 0; i < 15; i++) {
    commits.push({ commit: { author: { date: new Date(now - i * 86400000).toISOString() } } });
  }

  const perfectReport = computeScoreReport({
    repo: {
      license: { key: 'mit', spdx_id: 'MIT' },
      archived: false,
      description: 'A well described project with clear purpose and activity.',
      topics: ['js', 'web', 'tool'],
      size: 1200,
      homepage: 'https://example.com',
      fork: false,
      owner: { login: 'octocat' }
    },
    readme: { content: Buffer.from(perfectReadme).toString('base64') },
    rootContents: [
      { name: 'LICENSE' },
      { name: 'CONTRIBUTING.md' },
      { name: 'CODE_OF_CONDUCT.md' },
      { name: 'SUPPORT.md' },
      { name: 'CHANGELOG.md' },
      { name: 'SECURITY.md' },
      { name: 'renovate.json' },
      { name: '.gitignore' },
      { name: '.eslintrc.js' },
      { name: '.prettierrc' },
      { name: 'tsconfig.json' },
      { name: 'src' },
      { name: 'app' },
      { name: 'tests' },
      { name: 'jest.config.js' },
      { name: 'coverage' },
      { name: 'ISSUE_TEMPLATE.md' },
      { name: 'PULL_REQUEST_TEMPLATE.md' },
      { name: 'dependabot.yml' }
    ],
    githubContents: [
      { name: 'dependabot.yml' },
      { name: 'ISSUE_TEMPLATE.md' },
      { name: 'PULL_REQUEST_TEMPLATE.md' }
    ],
    workflows: [
      { id: 1, name: 'CI test', path: '.github/workflows/ci.yml' },
      { id: 2, name: 'Lint', path: '.github/workflows/lint.yml' },
      { id: 3, name: 'Release', path: '.github/workflows/release.yml' },
      { id: 4, name: 'Coverage Upload', path: '.github/workflows/coverage.yml' }
    ],
    contributors: [
      { login: 'alice', contributions: 40 },
      { login: 'bob', contributions: 30 },
      { login: 'charlie', contributions: 20 },
      { login: 'diana', contributions: 15 },
      { login: 'erin', contributions: 10 }
    ],
    commits: Array.from({ length: 15 }, (_, index) => ({
      commit: { author: { date: new Date(now - index * 86400000).toISOString() } }
    })),
    releases: [{ published_at: new Date(now - 10 * 86400000).toISOString() }],
    issues: [
      { state: 'closed', created_at: new Date(now - 10 * 86400000).toISOString(), closed_at: new Date(now - 8 * 86400000).toISOString(), user: { login: 'alice' } },
      { state: 'closed', created_at: new Date(now - 20 * 86400000).toISOString(), closed_at: new Date(now - 7 * 86400000).toISOString(), user: { login: 'bob' } },
      { state: 'open', user: { login: 'octocat' } }
    ]
  });

  assert.equal(perfectReport.pillars[0].score, 100);
  assert.equal(perfectReport.pillars[1].score, 100);
  assert.equal(perfectReport.pillars[2].score, 100);
  assert.equal(perfectReport.pillars[3].score, 100);
  assert.equal(perfectReport.pillars[4].score, 100);
  assert.equal(perfectReport.pillars[5].score, 100);
  assert.equal(perfectReport.pillars[6].score, 100);

  assert.equal(perfectReport.score, 100);
  assert.equal(perfectReport.grade, 'A+');
});

test('engine.js - moyenne pondérée : tous les piliers à 0 -> score global 0', () => {
  const emptyReport = computeScoreReport({
    repo: { license: null, archived: true },
    readme: null,
    rootContents: [{ name: '.env' }], // secret exposé
    githubContents: [],
    workflows: [],
    releases: [],
    commits: [],
    issues: []
  });

  assert.equal(emptyReport.pillars[0].score, 0);
  assert.equal(emptyReport.pillars[1].score, 0);
  assert.equal(emptyReport.pillars[2].score, 0);
  assert.equal(emptyReport.pillars[3].score, 0);

  assert.equal(emptyReport.score, 0);
  assert.equal(emptyReport.grade, 'F');
});

test('engine.js - moyenne pondérée : Documentation à 100 et autres à 0', () => {
  // Poids : doc=20, cicd=15, sec=20, act=15, community=10, quality=10, hygiene=10.
  // Total poids = 100. Score courant = 20 / 100 * 100 = 20.
  const fullReadme = `# Intro\n## Suite\n\`\`\`code\`\`\`\n` + 'A'.repeat(850);
  const docOnlyReport = computeScoreReport({
    repo: { license: null, archived: true, description: '', topics: [], size: 600000, fork: true },
    readme: { content: Buffer.from(fullReadme).toString('base64') },
    rootContents: [
      { name: 'LICENSE' },
      { name: 'CONTRIBUTING.md' },
      { name: 'CODE_OF_CONDUCT.md' },
      { name: 'SUPPORT.md' },
      { name: 'CHANGELOG.md' },
      { name: '.env' }
    ],
    githubContents: [],
    workflows: [],
    releases: [],
    commits: [],
    contributors: [],
    issues: []
  });

  assert.equal(docOnlyReport.pillars[0].score, 100);
  assert.equal(docOnlyReport.pillars[4].score, null);
  assert.equal(docOnlyReport.pillars[4].status, 'insufficient_data');
  const scoredPillars = docOnlyReport.pillars.filter((pillar) => pillar.score !== null);
  const expectedScore = scoredPillars.reduce((sum, pillar) => sum + pillar.score * pillar.weight, 0) /
    scoredPillars.reduce((sum, pillar) => sum + pillar.weight, 0);
  assert.equal(docOnlyReport.score, Math.round(expectedScore * 10) / 10);
  assert.equal(docOnlyReport.grade, 'F');
});

test('engine.js - les scores des piliers reflètent leurs checks, sans correction externe', () => {
  const fullReadme = `# Intro\n## Suite\n\`\`\`code\`\`\`\n` + 'A'.repeat(850);
  const premiumPillarsReport = computeScoreReport({
    repo: {
      license: { key: 'mit' },
      archived: false,
      description: 'A valid description for repository health scoring.',
      topics: ['code', 'test', 'security'],
      size: 1000,
      homepage: 'https://example.com',
      fork: false,
      owner: { login: 'octocat' }
    },
    readme: { content: Buffer.from(fullReadme).toString('base64') },
    rootContents: [
      { name: 'LICENSE' },
      { name: 'CONTRIBUTING.md' },
      { name: 'CODE_OF_CONDUCT.md' },
      { name: 'SUPPORT.md' },
      { name: 'CHANGELOG.md' },
      { name: 'SECURITY.md' },
      { name: '.gitignore' },
      { name: 'src' },
      { name: 'tests' }
    ],
    githubContents: [{ name: 'dependabot.yml' }],
    workflows: [
      { id: 1, name: 'CI test', path: '.github/workflows/ci.yml' },
      { id: 2, name: 'Lint', path: '.github/workflows/lint.yml' },
      { id: 3, name: 'Release', path: '.github/workflows/release.yml' }
    ],
    contributors: [],
    issues: [],
    commits: Array.from({ length: 15 }, (_, index) => ({
      commit: { author: { date: new Date(Date.now() - index * 86400000).toISOString() } }
    })),
    releases: [{ published_at: new Date(Date.now() - 10 * 86400000).toISOString() }]
  });

  assert.equal(premiumPillarsReport.pillars[0].score, 100);
  assert.equal(premiumPillarsReport.pillars[1].score, 95);
  assert.equal(
    premiumPillarsReport.pillars[2].score,
    computeSecurityPillar({
      repo: {
        license: { key: 'mit' },
        archived: false,
        description: 'A valid description for repository health scoring.',
        topics: ['code', 'test', 'security'],
        size: 1000,
        homepage: 'https://example.com',
        fork: false,
        owner: { login: 'octocat' }
      },
      readme: { content: Buffer.from(fullReadme).toString('base64') },
      rootContents: [
        { name: 'LICENSE' }, { name: 'CONTRIBUTING.md' }, { name: 'CODE_OF_CONDUCT.md' },
        { name: 'SUPPORT.md' }, { name: 'CHANGELOG.md' }, { name: 'SECURITY.md' },
        { name: '.gitignore' }, { name: 'src' }, { name: 'tests' }
      ],
      githubContents: [{ name: 'dependabot.yml' }]
    }).score
  );
  assert.equal(premiumPillarsReport.pillars[3].score, 100);
  assert.equal(premiumPillarsReport.pillars[4].score, null);
  assert.equal(premiumPillarsReport.pillars[5].score, computeCodeQualityPillar({
    rootContents: [
      { name: 'LICENSE' }, { name: 'CONTRIBUTING.md' }, { name: 'CODE_OF_CONDUCT.md' },
      { name: 'SUPPORT.md' }, { name: 'CHANGELOG.md' }, { name: 'SECURITY.md' },
      { name: '.gitignore' }, { name: 'src' }, { name: 'tests' }
    ],
    workflows: [
      { id: 1, name: 'CI test', path: '.github/workflows/ci.yml' },
      { id: 2, name: 'Lint', path: '.github/workflows/lint.yml' },
      { id: 3, name: 'Release', path: '.github/workflows/release.yml' }
    ]
  }).score);
  assert.equal(premiumPillarsReport.pillars[6].score, computeHygienePillar({
    repo: {
      license: { key: 'mit' }, archived: false,
      description: 'A valid description for repository health scoring.',
      topics: ['code', 'test', 'security'], size: 1000,
      homepage: 'https://example.com', fork: false,
      owner: { login: 'octocat' }
    },
    rootContents: [
      { name: 'LICENSE' }, { name: 'CONTRIBUTING.md' }, { name: 'CODE_OF_CONDUCT.md' },
      { name: 'SUPPORT.md' }, { name: 'CHANGELOG.md' }, { name: 'SECURITY.md' },
      { name: '.gitignore' }, { name: 'src' }, { name: 'tests' }
    ]
  }).score);

  assert.ok(premiumPillarsReport.pillars[5].score > 0);
  assert.ok(premiumPillarsReport.pillars[6].score > 0);
  const scoredPillars = premiumPillarsReport.pillars.filter((pillar) => pillar.score !== null);
  const expectedScore = scoredPillars.reduce((sum, pillar) => sum + pillar.score * pillar.weight, 0) /
    scoredPillars.reduce((sum, pillar) => sum + pillar.weight, 0);
  assert.equal(premiumPillarsReport.score, Math.round(expectedScore * 10) / 10);
});

test('engine.js - le score reste borné entre 0 et 100 en toutes circonstances', () => {
  const arbitraryReport = computeScoreReport(null);
  assert.equal(arbitraryReport.score, null);
  assert.equal(arbitraryReport.grade, null);
});

test('engine.js - les piliers Communauté, Qualité et Hygiène conservent leurs scores calculés', () => {
  const input = {
    repo: {
      description: 'A complete repository description.',
      topics: ['one', 'two', 'three'],
      size: 100,
      homepage: 'https://example.com',
      fork: false,
      archived: false,
      license: { spdx_id: 'MIT' },
      owner: { login: 'octocat' }
    },
    rootContents: [
      { name: '.gitignore' }, { name: 'src' }, { name: 'app' },
      { name: 'tests' }, { name: 'eslint.config.js' }, { name: '.prettierrc' },
      { name: 'tsconfig.json' }, { name: 'ISSUE_TEMPLATE.md' }, { name: 'PULL_REQUEST_TEMPLATE.md' }
    ],
    githubContents: [],
    workflows: [{ name: 'coverage test', path: 'ci.yml' }],
    contributors: [
      { login: 'alice', contributions: 4 },
      { login: 'bob', contributions: 3 }
    ],
    issues: [{
      state: 'closed',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      closed_at: new Date().toISOString(),
      user: { login: 'alice' }
    }],
    commits: [],
    releases: [],
    readme: null
  };
  const report = computeScoreReport(input);

  assert.equal(report.pillars[4].score, computeCommunityPillar(input).score);
  assert.equal(report.pillars[5].score, computeCodeQualityPillar(input).score);
  assert.equal(report.pillars[6].score, computeHygienePillar(input).score);
  assert.ok(report.pillars[4].score > 0);
  assert.ok(report.pillars[5].score > 0);
  assert.ok(report.pillars[6].score > 0);
});

test('engine.js - sans contributeurs ni issues, Communauté est insuffisant plutôt que noté zéro', () => {
  const report = computeScoreReport({
    repo: { archived: false, license: null },
    readme: null,
    rootContents: [],
    githubContents: [],
    workflows: [],
    contributors: [],
    issues: [],
    commits: [],
    releases: []
  });
  const community = report.pillars.find((pillar) => pillar.id === 'community');

  assert.equal(community.score, null);
  assert.equal(community.status, 'insufficient_data');
  assert.ok(community.checks.every((check) => check.status === 'insufficient_data'));
  assert.deepEqual(community.recommendations, []);
});

test('engine.js - le score Sécurité correspond aux checks du module sécurité', () => {
  const input = {
    repo: { license: { spdx_id: 'MIT' }, archived: false },
    rootContents: [{ name: 'SECURITY.md' }, { name: 'LICENSE' }],
    githubContents: [{ name: 'dependabot.yml' }],
    readme: { content: Buffer.from('# Security').toString('base64') },
    workflows: [],
    commits: [],
    releases: [],
    contributors: [{ login: 'alice', contributions: 1 }],
    issues: []
  };
  const expected = computeSecurityPillar(input);
  const actual = computeScoreReport(input).pillars.find((pillar) => pillar.id === 'security');

  assert.equal(actual.score, expected.score);
  assert.equal(actual.score, actual.checks.reduce((sum, check) => sum + check.points, 0));
  assert.equal(actual.recommendations.length, actual.checks.filter((check) => check.status === 'failed').length);
});

test('engine.js - renormalise les poids quand un pilier est non évaluable', () => {
  const report = computeScoreReport({
    repo: { archived: false, license: null },
    readme: null,
    rootContents: [],
    githubContents: [],
    workflows: [],
    contributors: [],
    issues: [],
    commits: [],
    releases: []
  });
  const scoredPillars = report.pillars.filter((pillar) => pillar.score !== null);
  const expected = scoredPillars.reduce((sum, pillar) => sum + pillar.score * pillar.weight, 0) /
    scoredPillars.reduce((sum, pillar) => sum + pillar.weight, 0);

  assert.equal(report.pillars.filter((pillar) => pillar.score === null).length, 1);
  assert.equal(report.score, Math.round(expected * 10) / 10);
  assert.equal(report.unverifiablePillars.length, 1);
});

test('engine.js - un check not_verifiable ne pénalise pas le score du pilier', () => {
  const pillar = normalizePillarResult({
    id: 'example',
    labelKey: 'example',
    weight: 100,
    score: 10,
    maxScore: 100,
    checks: [
      { id: 'hygiene_gitignore', labelKey: 'known', passed: true, status: 'passed', weight: 10, points: 10 },
      { id: 'unknown', labelKey: 'unknown', passed: false, status: 'not_verifiable', weight: 90, points: 0 }
    ],
    recommendations: [{
      id: 'rec_unknown',
      labelKey: 'rec_unknown',
      points: 90,
      priority: 'high'
    }]
  }, { rootContents: [] });

  assert.equal(pillar.score, 100);
  assert.equal(pillar.status, 'scored');
  assert.equal(pillar.checks[1].points, 0);
  assert.deepEqual(pillar.recommendations, []);
});

test('engine.js - une preuve positive dans une source disponible reste vérifiable', () => {
  const pillar = normalizePillarResult({
    id: 'documentation',
    labelKey: 'documentation',
    weight: 20,
    score: 10,
    maxScore: 100,
    checks: [{
      id: 'contributing',
      labelKey: 'contributing',
      passed: true,
      status: 'passed',
      weight: 10,
      points: 10
    }],
    recommendations: []
  }, {
    rootContents: [{ name: 'CONTRIBUTING.md' }],
    githubContents: null
  });

  assert.equal(pillar.checks[0].status, 'passed');
  assert.equal(pillar.score, 100);
});
