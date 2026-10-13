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

test('analyze.js - orchestre au maximum 9 requêtes et retourne la structure attendue', async () => {
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

  const { runAnalysis } = await import(`../src/api/analyze.js?t=${Date.now()}_1`);
  const result = await runAnalysis('octocat', 'Hello-World');

  assert.equal(result.ok, true);
  assert.ok(result.data);

  // Vérifier le plafond strict de 9 requêtes
  assert.ok(calledUrls.length <= 9, `Nombre de requêtes (${calledUrls.length}) supérieur à 9`);
  assert.equal(calledUrls.length, 9, 'Toutes les 9 requêtes prévues ont été orchestrées');

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

  const cachedResult = await runAnalysis('octocat', 'Hello-World');
  assert.equal(cachedResult.ok, true);
  assert.equal(cachedResult.data.cache.fromCache, true);
  assert.equal(calledUrls.length, 10, 'La seconde analyse réutilise les réponses en cache');

  const refreshedResult = await runAnalysis('octocat', 'Hello-World', { forceRefresh: true });
  assert.equal(refreshedResult.ok, true);
  assert.equal(refreshedResult.data.cache.fromCache, false);
  assert.equal(calledUrls.length, 19, 'forceRefresh renouvelle les 9 endpoints');

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
