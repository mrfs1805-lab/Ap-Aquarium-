const CACHE_NAME = 'ap-aquarium-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Cache the core app shell on install so it can open even with a
// flaky connection. Product/price data always comes fresh from the
// server (or the app's own localStorage cache) — this service worker
// only takes care of the page shell itself.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Remove old cache versions when a new service worker takes over.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for our own pages (so visitors always get the latest
// version when online), falling back to the cached shell when offline.
// Everything else (Google Apps Script API calls, Drive images, CDN
// libraries) is left alone and simply passed through to the network.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
    
