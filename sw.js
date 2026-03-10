const CACHE = 'danang-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // Cache local assets — skip external fonts if offline during install
      return c.addAll(['./index.html', './manifest.json', './icon-192.png', './icon-512.png'])
        .then(() => {
          // Try fonts separately, don't fail if no network
          return c.add('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap')
            .catch(() => {});
        });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for local, network-first for API (exchange rates)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Exchange rate APIs — always try network, no cache
  if (url.hostname.includes('frankfurter.app') || url.hostname.includes('er-api.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Google Fonts — network first, cache fallback
  if (url.hostname.includes('fonts.')) {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else — cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
    })
  );
});
