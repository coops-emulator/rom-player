/* ═══════════════════════════════════════════════════
   ROM Player by Coops — Service Worker
   EmulatorJS is served locally from ./data/
   so everything works fully offline.

   STRATEGY (fixed):
   - index.html + version.json → NETWORK FIRST
     (so deploys show up immediately, falls back to
      cache only when truly offline)
   - Everything else (emulator cores, icons, manifest,
     peerjs, cover art from raw.githubusercontent.com)
     → CACHE FIRST (rarely changes, needed for offline play)
═══════════════════════════════════════════════════ */

const CACHE_VERSION = 'rp-20260728005811';

// App shell — cached immediately on install
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './data/loader.js',
  './data/emulator.js',
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

  const isNetworkFirst =
    event.request.mode === 'navigate' ||
    NETWORK_FIRST.some(name => url.pathname.endsWith(name));

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
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
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
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  // ── GitHub raw update: re-fetch files and cache under Netlify-origin keys ──
  // The page sends { type: 'cacheGitHubFiles', urls: [...] } with a MessageChannel
  // port for the response. We fetch each GitHub raw URL and store it in the cache
  // under the equivalent local key (./index.html, ./sw.js, ./version.json) so
  // the next page load serves the fresh version without a Netlify deploy.
  if (event.data && event.data.type === 'cacheGitHubFiles') {
    const port = event.ports[0];
    const urls = event.data.urls || [];

    // Map GitHub raw URL → local cache key
    // e.g. https://raw.githubusercontent.com/USER/REPO/main/index.html → ./index.html
    const toLocalKey = (rawUrl) => {
      const filename = rawUrl.split('/').pop().split('?')[0];
      return './' + filename;
    };

    caches.open(CACHE_VERSION).then(async (cache) => {
      try {
        await Promise.all(urls.map(async (rawUrl) => {
          const cleanUrl = rawUrl.split('?')[0]; // strip any ?t= param
          const r = await fetch(cleanUrl + '?t=' + Date.now(), {
            cache: 'no-store'
          });
          if (!r.ok) throw new Error('Failed to fetch ' + cleanUrl);
          const localKey = toLocalKey(cleanUrl);
          // Cache under the local key so the next navigate serves fresh content
          await cache.put(localKey, r.clone());
          // Also cache under the full GitHub URL in case anything references it
          await cache.put(cleanUrl, r);
        }));
        if (port) port.postMessage({ ok: true });
      } catch(err) {
        console.warn('[SW] cacheGitHubFiles error:', err);
        if (port) port.postMessage({ ok: false, error: err.message });
      }
    }).catch(err => {
      console.warn('[SW] caches.open error:', err);
      if (port) port.postMessage({ ok: false, error: err.message });
    });
  }
});
