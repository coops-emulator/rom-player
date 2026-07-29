/* ═══════════════════════════════════════════════════
   ROM Player by Coops — Service Worker
   EmulatorJS is served from the official CDN and
   cached on first use — works fully offline after
   each core has been loaded at least once.

   STRATEGY:
   - index.html + version.json → NETWORK FIRST
     (so deploys show up immediately, falls back to
      cache only when truly offline)
   - Everything else (emulator cores, icons, manifest,
     peerjs, cover art) → CACHE FIRST (cached on first
     load, offline forever after)
═══════════════════════════════════════════════════ */

const CACHE_VERSION = 'rp-20260729120704';

// App shell — cached immediately on install
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.emulatorjs.org/stable/data/loader.js',
  'https://cdn.emulatorjs.org/stable/data/emulator.js',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
];

// Always fetch fresh from network first
const NETWORK_FIRST = [
  'index.html',
  'version.json',
];

// Never cache these — always go straight to network
const SKIP_CACHE_HOSTS = [
  'api.thegamesdb.net',
  '0.peerjs.com',                // PeerJS signalling — real-time, must never be cached
  // raw.githubusercontent.com intentionally NOT skipped:
  // cover art from libretro-thumbnails goes through cacheFirst so it works offline.
];

// ── Install ───────────────────────────────────────
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

// ── Activate: remove old caches ──────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // Skip APIs we never cache
  if (SKIP_CACHE_HOSTS.some(h => url.hostname.includes(h))) return;

  // Always networkFirst for page navigations
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  const isNetworkFirst = NETWORK_FIRST.some(name => url.pathname.endsWith(name));
  event.respondWith(isNetworkFirst ? networkFirst(event.request) : cacheFirst(event.request));
});

// Always try the network first so new deploys show up immediately.
// Falls back to cache only when the network is unavailable (offline).
// 4-second timeout prevents a slow connection from blocking the page load
// indefinitely — the cached version will serve instantly instead.
async function networkFirst(request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(request, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    // Try exact match first
    const cached = await caches.match(request);
    if (cached) return cached;
    // For any navigation (page load), serve index.html from cache
    if (request.mode === 'navigate') {
      const fallback =
        await caches.match('./index.html') ||
        await caches.match('./') ||
        await caches.match('/index.html') ||
        await caches.match('/');
      if (fallback) return fallback;
    }
    throw err;
  }
}

// Used only for static assets that rarely change (emulator cores, icons).
// Keeps offline play fast without re-downloading large files every visit.
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
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
