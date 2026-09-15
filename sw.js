// Symbio Biotech Agribusiness Enterprise Planner — Service Worker
// Cache-first with runtime caching, so the app (and its charts/PDF export)
// keep working offline once it's been opened at least once.

const CACHE_VERSION = 'symbio-planner-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',
  'https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.error('Precache failed', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else pass through normally.
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Serve from cache immediately, and refresh the cache quietly in the
        // background so the next offline session has the latest version.
        event.waitUntil(
          fetch(req).then((fresh) => {
            if (fresh && fresh.status === 200) {
              caches.open(CACHE_VERSION).then((cache) => cache.put(req, fresh));
            }
          }).catch(() => { /* offline — cached copy already served */ })
        );
        return cached;
      }

      return fetch(req).then((fresh) => {
        if (fresh && fresh.status === 200) {
          const copy = fresh.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return fresh;
      }).catch(() => {
        // Nothing cached and no network — fall back to the app shell for
        // page navigations so the app still opens instead of showing an error.
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});
