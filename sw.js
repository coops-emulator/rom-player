/* ═══════════════════════════════════════════════════
   ROM Player by Coops — Service Worker
═══════════════════════════════════════════════════ */

const CACHE_VERSION = 'rp-20260731072142';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-180.png?v=20260731020435',
  '/icon-192.png?v=20260731020435',
  '/icon-512.png?v=20260731020435',
  'https://cdn.emulatorjs.org/stable/data/loader.js',
  'https://cdn.emulatorjs.org/stable/data/emulator.js',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
];

const NETWORK_FIRST = ['version.json'];

const SKIP_CACHE_HOSTS = [
  'api.thegamesdb.net',
  '0.peerjs.com',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return Promise.allSettled(
        PRECACHE.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Precache failed:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (SKIP_CACHE_HOSTS.some(h => url.hostname.includes(h))) return;

  // Navigation requests — always try network first, fall back to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(async () => {
        // Offline — serve index.html from cache
        const cached =
          await caches.match('/index.html') ||
          await caches.match('/') ||
          await caches.match('./index.html');
        return cached || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // version.json — network first
  if (NETWORK_FIRST.some(name => url.pathname.endsWith(name))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Everything else — cache first
  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    throw err;
  }
}

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();

  if (event.data && event.data.type === 'cacheGitHubFiles') {
    const port = event.ports[0];
    const urls = event.data.urls || [];
    const toLocalKey = (rawUrl) => '/' + rawUrl.split('/').pop().split('?')[0];
    caches.open(CACHE_VERSION).then(async (cache) => {
      try {
        await Promise.all(urls.map(async (rawUrl) => {
          const cleanUrl = rawUrl.split('?')[0];
          const r = await fetch(cleanUrl + '?t=' + Date.now(), { cache: 'no-store' });
          if (!r.ok) throw new Error('Failed to fetch ' + cleanUrl);
          await cache.put(toLocalKey(cleanUrl), r.clone());
          await cache.put(cleanUrl, r);
        }));
        if (port) port.postMessage({ ok: true });
      } catch(err) {
        if (port) port.postMessage({ ok: false, error: err.message });
      }
    });
  }
});
