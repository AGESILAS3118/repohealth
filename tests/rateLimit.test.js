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

test('rateLimit.js - parsing des headers GitHub standard', async () => {
  globalThis.localStorage = createMockStorage();
  const { updateRateLimitFromHeaders, getStoredRateLimit } = await import(`../src/api/rateLimit.js?t=${Date.now()}_1`);

  const mockHeaders = new Headers({
    'x-ratelimit-limit': '60',
    'x-ratelimit-remaining': '45',
    'x-ratelimit-reset': '1700000000'
  });

  const state = updateRateLimitFromHeaders(mockHeaders);
  assert.equal(state.limit, 60);
  assert.equal(state.remaining, 45);
  assert.equal(state.resetAt, 1700000000000);

  const stored = getStoredRateLimit();
  assert.deepEqual(stored, state);
});

test('rateLimit.js - isRateLimited retourne true uniquement si remaining = 0 et reset dans le futur', async () => {
  globalThis.localStorage = createMockStorage();
  const { updateRateLimitFromHeaders, isRateLimited } = await import(`../src/api/rateLimit.js?t=${Date.now()}_2`);

  // Cas 1: Remaining > 0
  updateRateLimitFromHeaders({
    'x-ratelimit-limit': '60',
    'x-ratelimit-remaining': '5',
    'x-ratelimit-reset': String(Math.floor((Date.now() + 60000) / 1000))
  });
  assert.equal(isRateLimited(), false);

  // Cas 2: Remaining = 0, reset dans 60s
  updateRateLimitFromHeaders({
    'x-ratelimit-limit': '60',
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset': String(Math.floor((Date.now() + 60000) / 1000))
  });
  assert.equal(isRateLimited(), true);

  // Cas 3: Remaining = 0, mais reset dans le passé
  updateRateLimitFromHeaders({
    'x-ratelimit-limit': '60',
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset': String(Math.floor((Date.now() - 5000) / 1000))
  });
  assert.equal(isRateLimited(), false);
});

test('rateLimit.js - secondsUntilReset calcule le temps restant', async () => {
  globalThis.localStorage = createMockStorage();
  const { updateRateLimitFromHeaders, secondsUntilReset } = await import(`../src/api/rateLimit.js?t=${Date.now()}_3`);

  const futureSeconds = 120;
  const resetUnix = Math.floor(Date.now() / 1000) + futureSeconds;

  updateRateLimitFromHeaders({
    'x-ratelimit-limit': '60',
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset': String(resetUnix)
  });

  const remainingSecs = secondsUntilReset();
  assert.ok(remainingSecs >= 118 && remainingSecs <= 121);
});
