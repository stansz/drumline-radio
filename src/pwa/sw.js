// Service worker template. The build in vite.config.ts substitutes the two placeholders below
// with the list of every built file and a hash of that list.
const PRECACHE = __PRECACHE__;
const CACHE = 'drumline-radio-' + __VERSION__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('drumline-radio-') && name !== CACHE)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./', { cacheName: CACHE, ignoreVary: true }).then((cached) => cached || fetch(request)));
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true, ignoreVary: true }).then((cached) => cached || fetch(request)),
  );
});
