/**
 * Oinkly PWA Service Worker
 * - Precaches shell (index, manifest, logo) for offline install
 * - Network-first for all requests; caches same-origin GET for offline
 * - Navigate requests fallback to index.html so SPA works offline
 */
const CACHE_NAME = 'oinkly-v1';

const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (
          request.method === 'GET' &&
          url.origin === self.location.origin &&
          res.ok &&
          !url.pathname.startsWith('/api/')
        ) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
