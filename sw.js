/**
 * Service Worker minimal pour RepoHealth (PWA hors-ligne de base).
 * Version de cache à incrémenter manuellement à chaque mise à jour des ressources.
 */
const CACHE_VERSION = 'repohealth-v1.8.1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './screenshots/desktop.png',
  './screenshots/mobile.png',
  './src/main.js',
  './src/badge/generate.js',
  './src/export/json.js',
  './src/utils/url.js',
  './src/api/github.js',
  './src/api/cache.js',
  './src/api/rateLimit.js',
  './src/api/analyze.js',
  './src/scoring/engine.js',
  './src/scoring/grades.js',
  './src/scoring/types.js',
  './src/scoring/pillars/documentation.js',
  './src/scoring/pillars/cicd.js',
  './src/scoring/pillars/security.js',
  './src/scoring/pillars/activity.js',
  './src/scoring/pillars/community.js',
  './src/scoring/pillars/codeQuality.js',
  './src/scoring/pillars/hygiene.js',
  './src/i18n/fr.json',
  './src/i18n/en.json'
];

// Installation : mise en cache initiale des assets critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      const scopedAssets = ASSETS_TO_CACHE.map((asset) =>
        new URL(asset, self.registration.scope).href
      );
      return cache.addAll(scopedAssets);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activation : purge des anciennes versions du cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Interception des requêtes : stratégie Cache-First pour les assets locaux
self.addEventListener('fetch', (event) => {
  // Ne pas cacher les appels réseau vers des APIs externes comme api.github.com
  // L'API GitHub est déjà gérée avec TTL dans localStorage
  const scopeUrl = new URL(self.registration.scope);
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    requestUrl.origin !== scopeUrl.origin ||
    !requestUrl.pathname.startsWith(scopeUrl.pathname)
  ) {
    return;
  }

  const relativePath = requestUrl.pathname.slice(scopeUrl.pathname.length);
  const scopedUrl = new URL(relativePath, scopeUrl);
  scopedUrl.search = requestUrl.search;
  const scopedRequest = new Request(scopedUrl, event.request);

  event.respondWith(
    caches.match(scopedRequest).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(scopedRequest).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(scopedRequest, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
