// OpenSlots Service Worker — network-first for API, cache-first for shell
const CACHE = 'openslots-v11';

// Must be cached for offline to work — install fails if any of these fail
const SHELL_CORE = [
  '/courses.html',
  '/courses-manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/calendar.html',
  '/manifest.json',
];

// Nice-to-have (fonts) — failures are silently ignored so install still succeeds
const SHELL_EXTRAS = [
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL_CORE))
      .then(() => caches.open(CACHE).then(c =>
        Promise.allSettled(SHELL_EXTRAS.map(url => c.add(url)))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network-first for API calls — never cache auth or slot data
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Shell assets: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
