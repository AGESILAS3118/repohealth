import test from 'node:test';
import assert from 'node:assert/strict';

// Mock de localStorage pour environnement Node.js
function createMockStorage() {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
    _dump: () => store
  };
}

test('cache.js - setCached et getCached avec TTL valide', async () => {
  globalThis.localStorage = createMockStorage();
  const { getCached, setCached, clearAll } = await import(`../src/api/cache.js?t=${Date.now()}_1`);

  clearAll();
  const url = 'https://api.github.com/repos/octocat/Hello-World';
  const sampleData = { id: 123, name: 'Hello-World', stars: 42 };

  const success = setCached(url, sampleData, 5000);
  assert.equal(success, true);

  const cached = getCached(url);
  assert.deepEqual(cached, sampleData);
});

test('cache.js - expiration du TTL', async () => {
  globalThis.localStorage = createMockStorage();
  const { getCached, setCached, clearAll } = await import(`../src/api/cache.js?t=${Date.now()}_2`);

  clearAll();
  const url = 'https://api.github.com/repos/expired/repo';
  // TTL négatif pour simuler une date passée
  setCached(url, { foo: 'bar' }, -100);

  const cached = getCached(url);
  assert.equal(cached, null, 'Une entrée expirée doit retourner null et être purgée');
});

test('cache.js - clearExpired nettoie uniquement les entrées périmées', async () => {
  globalThis.localStorage = createMockStorage();
  const { setCached, clearExpired, getCached, clearAll } = await import(`../src/api/cache.js?t=${Date.now()}_3`);

  clearAll();
  setCached('https://api.github.com/valid', { ok: true }, 100000);
  setCached('https://api.github.com/expired1', { ok: false }, -500);
  setCached('https://api.github.com/expired2', { ok: false }, -100);

  const removed = clearExpired();
  assert.equal(removed, 2);
  assert.ok(getCached('https://api.github.com/valid'));
  assert.equal(getCached('https://api.github.com/expired1'), null);
});

test('cache.js - clearAll vide tout le cache de RepoHealth', async () => {
  globalThis.localStorage = createMockStorage();
  const { setCached, clearAll, getCached } = await import(`../src/api/cache.js?t=${Date.now()}_4`);

  setCached('https://api.github.com/1', { a: 1 });
  setCached('https://api.github.com/2', { b: 2 });
  globalThis.localStorage.setItem('other_app_key', 'preserve_me');

  const count = clearAll();
  assert.equal(count, 2);
  assert.equal(getCached('https://api.github.com/1'), null);
  assert.equal(globalThis.localStorage.getItem('other_app_key'), 'preserve_me');
});

test('cache.js - fallback sans crash si localStorage est absent', async () => {
  const originalStorage = globalThis.localStorage;
  delete globalThis.localStorage;

  const { getCached, setCached, clearExpired, clearAll } = await import(`../src/api/cache.js?t=${Date.now()}_5`);

  assert.equal(getCached('https://test.com'), null);
  assert.equal(setCached('https://test.com', { test: 1 }), false);
  assert.equal(clearExpired(), 0);
  assert.equal(clearAll(), 0);

  globalThis.localStorage = originalStorage;
});
