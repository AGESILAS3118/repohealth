import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE_VERSION } from '../src/scoring/version.js';

const resultsContainer = { innerHTML: '', hidden: true };
globalThis.document = {
  readyState: 'loading',
  addEventListener() {},
  getElementById(id) {
    return id === 'results-section' ? resultsContainer : null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  createElement() {
    return {
      set textContent(value) {
        this.text = String(value);
      },
      get innerHTML() {
        return this.text
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }
    };
  }
};
globalThis.window = {
  location: {
    pathname: '/repohealth/',
    origin: 'https://example.com',
    hash: ''
  }
};

const { renderScoreReport } = await import('../src/main.js');

test('main UI - affiche les statuts indisponibles sans score nul ni barre de progression', () => {
  renderScoreReport({}, {
    score: null,
    grade: null,
    engineVersion: ENGINE_VERSION,
    computedAt: '2026-10-13T09:00:00.000Z',
    pillars: [{
      id: 'community',
      labelKey: 'report_pillar_community',
      weight: 10,
      score: null,
      status: 'insufficient_data',
      recommendations: []
    }]
  });

  assert.match(resultsContainer.innerHTML, /report_analysis_unavailable/);
  assert.match(resultsContainer.innerHTML, /report_insufficient_data/);
  assert.match(resultsContainer.innerHTML, /role="status"/);
  assert.match(resultsContainer.innerHTML, /security-warning/);
  assert.match(resultsContainer.innerHTML, /v1\.0\.0/);
  assert.doesNotMatch(resultsContainer.innerHTML, /role="progressbar"/);
  assert.doesNotMatch(resultsContainer.innerHTML, /0 \/ 100/);
  assert.equal(resultsContainer.hidden, false);
});

test('main UI - garde la barre de progression des piliers évalués', () => {
  renderScoreReport({
    repo: { owner: { login: 'octocat' }, name: 'hello-world' }
  }, {
    score: 85,
    grade: 'A',
    engineVersion: ENGINE_VERSION,
    computedAt: '2026-10-13T09:00:00.000Z',
    pillars: [{
      id: 'documentation',
      labelKey: 'report_pillar_documentation',
      weight: 20,
      score: 85,
      status: 'scored',
      recommendations: []
    }]
  });

  assert.match(resultsContainer.innerHTML, /role="progressbar" aria-valuenow="85\.0"/);
  assert.match(resultsContainer.innerHTML, /85\.0 \/ 100/);
  assert.match(resultsContainer.innerHTML, /badge-share/);
  assert.match(resultsContainer.innerHTML, /data-report-export/);
  assert.match(resultsContainer.innerHTML, /report-export-status" role="status"/);
  assert.match(resultsContainer.innerHTML, /\[!\[RepoHealth\]\(data:image\/svg\+xml;base64,/);
  assert.match(resultsContainer.innerHTML, /https:\/\/example\.com\/repohealth\/\?repo=octocat%2Fhello-world/);
  assert.match(resultsContainer.innerHTML, /\[!\[RepoHealth\]\(\.\/repohealth-badge\.svg\)\]/);
});

test('main UI - affiche les scores global et des piliers avec une décimale', () => {
  renderScoreReport({
    repo: { owner: { login: 'octocat' }, name: 'hello-world' }
  }, {
    score: 55.00000000000001,
    grade: 'C',
    engineVersion: ENGINE_VERSION,
    computedAt: '2026-10-13T09:00:00.000Z',
    pillars: [{
      id: 'activity',
      labelKey: 'report_pillar_activity',
      weight: 15,
      score: 55.00000000000001,
      status: 'scored',
      recommendations: []
    }]
  });

  assert.match(resultsContainer.innerHTML, /55\.0<\/span>/);
  assert.match(resultsContainer.innerHTML, /55\.0 \/ 100/);
  assert.doesNotMatch(resultsContainer.innerHTML, /(?:score-value|pillar-score)[^>]*>55\.00000000000001/);
});

test('main UI - affiche un emoji distinct et centralisé pour chaque pilier', () => {
  const pillarIds = ['documentation', 'cicd', 'security', 'activity', 'community', 'codeQuality', 'hygiene'];
  renderScoreReport({
    repo: { owner: { login: 'octocat' }, name: 'hello-world' }
  }, {
    score: 80,
    grade: 'A',
    engineVersion: ENGINE_VERSION,
    computedAt: '2026-10-13T09:00:00.000Z',
    pillars: pillarIds.map((id) => ({
      id,
      labelKey: `report_pillar_${id}`,
      weight: 10,
      score: 80,
      status: 'scored',
      recommendations: []
    }))
  });

  for (const icon of ['📄', '⚙️', '🔒', '🕒', '👥', '✅', '🧹']) {
    assert.ok(resultsContainer.innerHTML.includes(icon), `Pillar icon ${icon} should be rendered`);
  }
  assert.doesNotMatch(resultsContainer.innerHTML, /📈/);
});

test('main UI - ne propose pas de badge si le score global est indisponible', () => {
  renderScoreReport({}, {
    score: null,
    grade: null,
    engineVersion: ENGINE_VERSION,
    pillars: [],
    unverifiablePillars: []
  });
  assert.doesNotMatch(resultsContainer.innerHTML, /badge-share/);
  assert.doesNotMatch(resultsContainer.innerHTML, /data-report-export/);
});

test('main UI - télécharge le JSON et annonce la confirmation', () => {
  let onClick;
  let createdBlob;
  let clickedLink;
  let revokedUrl;
  const status = { textContent: '' };
  const originalQuerySelector = document.querySelector;
  const originalCreateElement = document.createElement;
  const originalAppend = document.body?.append;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  globalThis.document.body = {
    append(node) {
      if (node.tagName === 'A') clickedLink = node;
    }
  };
  document.querySelector = (selector) => {
    if (selector === '[data-report-export]') {
      return { addEventListener: (event, handler) => { if (event === 'click') onClick = handler; } };
    }
    if (selector === '.report-export-status') return status;
    return null;
  };
  document.createElement = (tagName) => tagName === 'a'
    ? { tagName: 'A', click() { this.wasClicked = true; }, remove() {} }
    : originalCreateElement.call(document, tagName);
  document.body.append = (node) => {
    if (node.tagName === 'A') clickedLink = node;
  };
  URL.createObjectURL = (blob) => {
    createdBlob = blob;
    return 'blob:report';
  };
  URL.revokeObjectURL = (url) => { revokedUrl = url; };
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = (callback) => callback();

  try {
    renderScoreReport({
      repo: { owner: { login: 'octocat' }, name: 'hello-world' },
      fetchedAt: '2026-10-13T10:00:00.000Z'
    }, {
      score: 87,
      grade: 'B',
      engineVersion: ENGINE_VERSION,
      computedAt: '2026-10-13T10:00:00.000Z',
      pillars: [],
      unverifiablePillars: []
    });
    onClick();

    assert.equal(createdBlob.type, 'application/json;charset=utf-8');
    assert.equal(clickedLink.download, 'repochealth-octocat-hello-world-2026-10-13.json');
    assert.equal(clickedLink.wasClicked, true);
    assert.equal(revokedUrl, 'blob:report');
    assert.equal(status.textContent, 'report.export.downloaded');
  } finally {
    document.querySelector = originalQuerySelector;
    document.createElement = originalCreateElement;
    document.body.append = originalAppend;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    window.setTimeout = originalSetTimeout;
  }
});

test('main UI - le paramètre repo valide préremplit, soumet et nettoie l’URL', async () => {
  const { initializeRepoQuery } = await import('../src/main.js');
  const input = { value: '' };
  let submitted = 0;
  let invalid = 0;
  let cleanedUrl = '';

  const handled = initializeRepoQuery({
    search: '?repo=octocat%2Fhello-world&ref=main',
    input,
    requestSubmit: () => { submitted++; },
    onInvalid: () => { invalid++; },
    replaceUrl: (url) => { cleanedUrl = url; }
  });

  assert.equal(handled, true);
  assert.equal(input.value, 'octocat/hello-world');
  assert.equal(submitted, 1);
  assert.equal(invalid, 0);
  assert.equal(cleanedUrl, '/repohealth/?ref=main');
});

test('main UI - le paramètre repo invalide affiche une erreur sans soumettre', async () => {
  const { initializeRepoQuery } = await import('../src/main.js');
  let submitted = 0;
  let invalid = 0;
  let cleanedUrl = '';

  initializeRepoQuery({
    search: '?repo=not-a-repository',
    input: { value: '' },
    requestSubmit: () => { submitted++; },
    onInvalid: () => { invalid++; },
    replaceUrl: (url) => { cleanedUrl = url; }
  });

  assert.equal(submitted, 0);
  assert.equal(invalid, 1);
  assert.equal(cleanedUrl, '/repohealth/');
});

test('main UI - sans paramètre repo, le formulaire n’est pas prérempli ni soumis', async () => {
  const { initializeRepoQuery } = await import('../src/main.js');
  const input = { value: '' };
  let submitted = 0;
  let invalid = 0;
  let cleanedUrl = '';

  const handled = initializeRepoQuery({
    search: '?ref=main',
    input,
    requestSubmit: () => { submitted++; },
    onInvalid: () => { invalid++; },
    replaceUrl: (url) => { cleanedUrl = url; }
  });

  assert.equal(handled, false);
  assert.equal(input.value, '');
  assert.equal(submitted, 0);
  assert.equal(invalid, 0);
  assert.equal(cleanedUrl, '');
});
