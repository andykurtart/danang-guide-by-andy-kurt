// ─── VERSION: меняй эту строку при каждом деплое ────────────────────────────
// Формат: 'danang-YYYY-MM-DD-N' — дата + номер сборки
const CACHE = 'danang-2025-03-16-2';
// ────────────────────────────────────────────────────────────────────────────

const LOCAL_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Install: cache assets, skipWaiting чтобы новый SW сразу стал активным
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(LOCAL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: удаляем ВСЕ старые кэши, берём контроль над всеми вкладками
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API — always network
  if (
    url.hostname.includes('frankfurter.app') ||
    url.hostname.includes('er-api.com') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('nominatim.openstreetmap.org') ||
    url.hostname.includes('openstreetmap.org')
  ) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{}', { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Fonts — network first
  if (url.hostname.includes('fonts.')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // index.html — network first (always get latest), offline fallback
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else — cache first
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

// Получаем команду на применение обновления от баннера
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
