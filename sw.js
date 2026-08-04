/* ═══════════════════════════════════════════════════
   ROM Player by Coops — Service Worker
═══════════════════════════════════════════════════ */

const CACHE_VERSION = 'rp-20260804014837';

const PRECACHE = [
  '/manifest.json',
  '/icon-180.png?v=20260731020435',
  '/icon-192.png?v=20260731020435',
  '/icon-512.png?v=20260731020435',
  'https://cdn.emulatorjs.org/stable/data/loader.js',
  'https://cdn.emulatorjs.org/stable/data/emulator.js',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
];

// Always hit the network for these — never serve stale
const NETWORK_FIRST = [
  'version.json',
  'index.html',
  '/',
];

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

  const isNetworkFirst =
    event.request.mode === 'navigate' ||
    NETWORK_FIRST.some(name => url.pathname.endsWith(name) || url.pathname === '/');

  if (isNetworkFirst) {
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
    // Offline fallback
    const cached =
      await caches.match(request) ||
      await caches.match('/index.html') ||
      await caches.match('/');
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
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
});
