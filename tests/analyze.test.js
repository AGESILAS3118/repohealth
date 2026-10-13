import test from 'node:test';
import assert from 'node:assert/strict';

function createMockStorage() {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; }
  };
}

function createSuccessfulFetch(packageScripts, rootContents = []) {
  return async (url) => {
    let payload = {};
    if (url.endsWith('/repos/octocat/script-test')) {
      payload = { name: 'script-test' };
    } else if (url.endsWith('/contents/package.json')) {
      payload = {
        type: 'file',
        encoding: 'base64',
        content: Buffer.from(JSON.stringify({ scripts: packageScripts })).toString('base64')
      };
    } else if (url.endsWith('/contents')) {
      payload = rootContents;
    } else if (url.endsWith('/contents/.github')) {
      payload = [];
    } else if (url.endsWith('/readme')) {
      payload = { name: 'README.md' };
    } else if (url.endsWith('/actions/workflows')) {
      payload = { total_count: 0, workflows: [] };
    } else if (url.includes('/releases') || url.includes('/contributors') ||
      url.includes('/issues') || url.includes('/commits')) {
      payload = [];
    }
    return new Response(JSON.stringify(payload), {
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 3600000) / 1000))
      }
    });
  };
}

test('analyze.js - orchestre les endpoints principaux et package.json', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;

  const calledUrls = [];

  globalThis.fetch = async (url) => {
    calledUrls.push(url);

    // Réponse fictive selon l'endpoint
    let payload = {};
    let status = 200;

    if (url.endsWith('/repos/octocat/Hello-World')) {
      payload = { name: 'Hello-World', stargazers_count: 42, language: 'C' };
    } else if (url.endsWith('/contents/package.json')) {
      payload = {
        name: 'package.json',
        type: 'file',
        encoding: 'base64',
        content: Buffer.from(JSON.stringify({ scripts: { test: 'node --test' } })).toString('base64')
      };
    } else if (url.includes('/readme')) {
      payload = { name: 'README.md', size: 100 };
    } else if (url.includes('/contents/.github')) {
      // Simule un dossier .github absent (404 non bloquant)
      status = 404;
      payload = { message: 'Not Found' };
    } else if (url.includes('/contents')) {
      payload = [{ name: 'index.html', type: 'file' }];
    } else if (url.includes('/actions/workflows')) {
      payload = { total_count: 0, workflows: [] };
    } else if (url.includes('/releases')) {
      payload = [];
    } else if (url.includes('/contributors')) {
      payload = [{ login: 'octocat', contributions: 5 }];
    } else if (url.includes('/issues')) {
      payload = [];
    } else if (url.includes('/commits')) {
      payload = [{ sha: 'abc1234', commit: { message: 'init' } }];
    }

    return new Response(JSON.stringify(payload), {
      status,
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 3600000) / 1000))
      }
    });
  };

  let testDirectoryListings = 0;
  let testFileReads = 0;
  const originalFetchWithTracking = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('/contents/tests')) testDirectoryListings++;
    if (/\/contents\/tests\/.+\.test\./.test(url)) testFileReads++;
    return originalFetchWithTracking(url);
  };

  const { MAX_API_CALLS, runAnalysis } = await import(`../src/api/analyze.js?t=${Date.now()}_1`);
  const result = await runAnalysis('octocat', 'Hello-World');

  assert.equal(result.ok, true);
  assert.ok(result.data);

  assert.equal(MAX_API_CALLS, 12);
  assert.equal(calledUrls.length, 10, 'Les 9 endpoints principaux et package.json sont récupérés');

  // Vérifier la présence de toutes les propriétés du rapport
  assert.equal(result.data.repo.name, 'Hello-World');
  assert.ok(result.data.readme);
  assert.ok(Array.isArray(result.data.rootContents));
  assert.equal(result.data.githubContents, null, 'Le dossier .github 404 doit être null');
  assert.ok(result.data.workflows);
  assert.ok(Array.isArray(result.data.releases));
  assert.ok(Array.isArray(result.data.contributors));
  assert.ok(Array.isArray(result.data.issues));
  assert.ok(Array.isArray(result.data.commits));
  assert.ok(result.data.rateLimit);
  assert.ok(result.data.fetchedAt);
  assert.equal(result.data.apiVersion, '2022-11-28');
  assert.equal(result.data.packageJson.scripts.test, 'node --test');
  assert.equal(testDirectoryListings, 0, 'node:test déclaré dans package.json évite l’inspection des tests');
  assert.equal(testFileReads, 0);

  const cachedResult = await runAnalysis('octocat', 'Hello-World');
  assert.equal(cachedResult.ok, true);
  assert.equal(cachedResult.data.cache.fromCache, true);
  assert.equal(calledUrls.length, 11, 'Les réponses positives sont en cache ; les 404 non bloquants sont redemandées');

  const refreshedResult = await runAnalysis('octocat', 'Hello-World', { forceRefresh: true });
  assert.equal(refreshedResult.ok, true);
  assert.equal(refreshedResult.data.cache.fromCache, false);
  assert.equal(calledUrls.length, 21, 'forceRefresh renouvelle les dix endpoints mis en cache');

  globalThis.fetch = originalFetch;
});

test('analyze.js - un script npm alternatif node --test évite toute lecture de test', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push(url);
    return createSuccessfulFetch({ 'test:unit': 'node --test' })(url, options);
  };

  const { runAnalysis } = await import(`../src/api/analyze.js?t=${Date.now()}_alternate-script`);
  const result = await runAnalysis('octocat', 'script-test');

  assert.equal(result.ok, true);
  assert.equal(result.data.packageJson.scripts['test:unit'], 'node --test');
  assert.equal(requests.filter((url) => /\/contents\/(?:tests|test|__tests__)(?:\/|$)/.test(url)).length, 0);
  assert.equal(requests.length, 10);
  globalThis.fetch = originalFetch;
});

test('analyze.js - journalise le nombre de requêtes en environnement local', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;
  const originalLocation = globalThis.location;
  const originalDebug = console.debug;
  const messages = [];
  globalThis.location = { hostname: 'localhost' };
  console.debug = (message) => messages.push(message);
  globalThis.fetch = createSuccessfulFetch({ test: 'node --test' });

  const { runAnalysis } = await import(`../src/api/analyze.js?t=${Date.now()}_debug-count`);
  const result = await runAnalysis('octocat', 'script-test');

  assert.equal(result.ok, true);
  assert.ok(messages.some((message) => message.includes('10/12')));
  globalThis.fetch = originalFetch;
  console.debug = originalDebug;
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

test('analyze.js - charge un fichier de test pour détecter les imports node:test', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;
  const nodeTestSource = "import test from 'node:test';";
  const rootContents = [
    { name: 'tests', type: 'dir' },
    { name: 'src', type: 'dir' }
  ];

  globalThis.fetch = async (url) => {
    let payload = {};
    let status = 200;

    if (url.endsWith('/contents/package.json')) {
      status = 404;
    } else if (url.endsWith('/contents')) {
      payload = rootContents;
    } else if (url.endsWith('/contents/tests')) {
      payload = [{ name: 'sample.test.js', type: 'file' }];
    } else if (url.endsWith('/contents/tests/sample.test.js')) {
      payload = {
        type: 'file',
        encoding: 'base64',
        content: Buffer.from(nodeTestSource).toString('base64')
      };
    } else if (url.endsWith('/repos/octocat/Hello-World')) {
      payload = { name: 'Hello-World' };
    } else if (url.includes('/contents/.github')) {
      status = 404;
    } else if (url.includes('/readme')) {
      payload = { name: 'README.md' };
    } else if (url.includes('/workflows')) {
      payload = { total_count: 0, workflows: [] };
    } else if (url.includes('/releases') || url.includes('/issues') || url.includes('/commits')) {
      payload = [];
    } else if (url.includes('/contributors')) {
      payload = [{ login: 'octocat' }];
    }

    return new Response(JSON.stringify(payload), {
      status,
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 3600000) / 1000))
      }
    });
  };

  const { runAnalysis } = await import(`../src/api/analyze.js?t=${Date.now()}_imports`);
  const result = await runAnalysis('octocat', 'Hello-World');

  assert.equal(result.ok, true);
  assert.equal(result.data.packageJson, null);
  assert.deepEqual(result.data.testFiles, [{
    path: 'tests/sample.test.js',
    content: nodeTestSource
  }]);

  globalThis.fetch = originalFetch;
});

test('analyze.js - plafonne à 12 appels même avec 50 fichiers de test', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;
  const requests = [];
  const testFilePaths = [];
  const testFiles = Array.from({ length: 50 }, (_, index) => ({
    name: `suite-${String(index).padStart(2, '0')}.test.js`,
    type: 'file'
  }));

  globalThis.fetch = async (url) => {
    requests.push(url);
    let payload = {};
    let status = 200;
    if (url.endsWith('/contents/package.json')) {
      payload = {
        type: 'file',
        encoding: 'base64',
        content: Buffer.from(JSON.stringify({ scripts: { test: 'node custom-runner.js' } })).toString('base64')
      };
    } else if (url.endsWith('/contents/tests')) {
      payload = testFiles;
    } else if (/\/contents\/tests\/suite-/.test(url)) {
      testFilePaths.push(url);
      payload = {
        type: 'file',
        encoding: 'base64',
        content: Buffer.from('assert.equal(1, 1);').toString('base64')
      };
    } else if (url.endsWith('/repos/octocat/large-tests')) {
      payload = { name: 'large-tests' };
    } else if (url.endsWith('/readme')) {
      payload = { name: 'README.md' };
    } else if (url.endsWith('/contents')) {
      payload = [{ name: 'tests', type: 'dir' }];
    } else if (url.endsWith('/contents/.github')) {
      payload = [];
    } else if (url.endsWith('/actions/workflows')) {
      payload = { total_count: 0, workflows: [] };
    } else if (url.includes('/releases') || url.includes('/issues') || url.includes('/commits')) {
      payload = [];
    } else if (url.includes('/contributors')) {
      payload = [{ login: 'octocat' }];
    }
    return new Response(JSON.stringify(payload), {
      status,
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 3600000) / 1000))
      }
    });
  };

  const { MAX_API_CALLS, runAnalysis } = await import(`../src/api/analyze.js?t=${Date.now()}_cap`);
  const result = await runAnalysis('octocat', 'large-tests');

  assert.equal(result.ok, true);
  assert.equal(requests.length, MAX_API_CALLS);
  assert.ok(requests.length <= 12);
  assert.ok(testFilePaths.length <= 2);
  assert.equal(testFilePaths.length, 1, 'Le listing des tests consomme une requête du budget global');
  assert.match(testFilePaths[0], /suite-00\.test\.js/);
  assert.ok(Array.isArray(result.data.testFiles));
  assert.equal(result.data.testFiles.length, 1);

  globalThis.fetch = originalFetch;
});

test('analyze.js - arrêt propre immédiat en cas d’erreur 404 sur le dépôt principal', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;

  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return new Response(JSON.stringify({ message: 'Not Found' }), {
      status: 404,
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 3600000) / 1000))
      }
    });
  };

  const { runAnalysis } = await import(`../src/api/analyze.js?t=${Date.now()}_2`);
  const res = await runAnalysis('inexistant', 'repo');

  assert.equal(res.ok, false);
  assert.equal(res.error, 'not_found');
  assert.equal(count, 1, 'Ne doit pas continuer les 8 autres requêtes si le repo est introuvable');

  globalThis.fetch = originalFetch;
});

test('analyze.js - arrêt propre en cours de route si rate_limit atteint', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;

  let count = 0;
  const resetUnix = Math.floor((Date.now() + 2000000) / 1000);

  globalThis.fetch = async (url) => {
    count++;
    if (url.includes('/readme')) {
      // Simule un rate limit sur la 2ème requête
      return new Response(JSON.stringify({ message: 'Rate limited' }), {
        status: 403,
        headers: {
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetUnix)
        }
      });
    }

    return new Response(JSON.stringify({ name: 'repo' }), {
      status: 200,
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '1',
        'x-ratelimit-reset': String(resetUnix)
      }
    });
  };

  const { runAnalysis } = await import(`../src/api/analyze.js?t=${Date.now()}_3`);
  const res = await runAnalysis('octocat', 'Hello-World');

  assert.equal(res.ok, false);
  assert.equal(res.error, 'rate_limit');
  assert.equal(count, 2, 'L’orchestration doit s’interrompre dès la détection du rate limit');

  globalThis.fetch = originalFetch;
});
