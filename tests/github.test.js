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

test('github.js - en-têtes obligatoires transmis et cache hit/miss', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;

  let interceptedUrl = null;
  let interceptedHeaders = null;

  globalThis.fetch = async (url, options) => {
    interceptedUrl = url;
    interceptedHeaders = options.headers;
    return new Response(JSON.stringify({ name: 'Hello-World', stargazers_count: 10 }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '59',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 3600000) / 1000))
      }
    });
  };

  const { fetchRepo } = await import(`../src/api/github.js?t=${Date.now()}_1`);

  // Premier appel (cache miss)
  const res1 = await fetchRepo('octocat', 'Hello-World');
  assert.equal(res1.ok, true);
  assert.equal(res1.fromCache, false);
  assert.equal(res1.data.name, 'Hello-World');
  assert.equal(interceptedUrl, 'https://api.github.com/repos/octocat/Hello-World');
  assert.equal(interceptedHeaders['Accept'], 'application/vnd.github+json');
  assert.equal(interceptedHeaders['X-GitHub-Api-Version'], '2022-11-28');
  assert.equal(interceptedHeaders['User-Agent'], 'RepoHealth/0.1');

  // Deuxième appel (cache hit -> fetch ne doit pas être appelé)
  interceptedUrl = null;
  const res2 = await fetchRepo('octocat', 'Hello-World');
  assert.equal(res2.ok, true);
  assert.equal(res2.fromCache, true);
  assert.equal(interceptedUrl, null, 'Le fetch réseau ne doit pas avoir été déclenché');

  globalThis.fetch = originalFetch;
});

test('github.js - gestion 404', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ message: 'Not Found' }), {
      status: 404,
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '55',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 3600000) / 1000))
      }
    });
  };

  const { fetchRepo } = await import(`../src/api/github.js?t=${Date.now()}_2`);
  const res = await fetchRepo('inexistant', 'repo-fantome');
  assert.equal(res.ok, false);
  assert.equal(res.error, 'not_found');

  globalThis.fetch = originalFetch;
});

test('github.js - gestion 403 rate limit', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;
  const resetUnix = Math.floor((Date.now() + 1800000) / 1000);

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
      status: 403,
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(resetUnix)
      }
    });
  };

  const { fetchRepo } = await import(`../src/api/github.js?t=${Date.now()}_3`);
  const res = await fetchRepo('octocat', 'Hello-World');
  assert.equal(res.ok, false);
  assert.equal(res.error, 'rate_limit');
  assert.equal(res.resetAt, resetUnix * 1000);

  globalThis.fetch = originalFetch;
});

test('github.js - gestion 403 forbidden classique', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ message: 'Forbidden' }), {
      status: 403,
      headers: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '40',
        'x-ratelimit-reset': String(Math.floor((Date.now() + 3600000) / 1000))
      }
    });
  };

  const { fetchRepo } = await import(`../src/api/github.js?t=${Date.now()}_4`);
  const res = await fetchRepo('octocat', 'secret');
  assert.equal(res.ok, false);
  assert.equal(res.error, 'forbidden');

  globalThis.fetch = originalFetch;
});

test('github.js - gestion erreur réseau (fetch throws)', async () => {
  globalThis.localStorage = createMockStorage();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch (DNS / Offline)');
  };

  const { fetchRepo } = await import(`../src/api/github.js?t=${Date.now()}_5`);
  const res = await fetchRepo('octocat', 'Hello-World');
  assert.equal(res.ok, false);
  assert.equal(res.error, 'network');

  globalThis.fetch = originalFetch;
});
