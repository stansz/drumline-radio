// Service worker template. The build in vite.config.ts substitutes the two placeholders below
// with the list of every built file and a hash of that list.
const PRECACHE = __PRECACHE__;
const CACHE = 'drumline-radio-' + __VERSION__;

// A new build takes over as soon as it is cached, instead of waiting for every window to close (an
// installed iPhone app almost never closes). Files are fetched past the browser's HTTP cache, so the
// new cache can't pick up old files.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      // A failed install must not leave a half-filled cache that looks like this build.
      .catch((error) => caches.delete(CACHE).then(() => { throw error; })),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('drumline-radio-') && name !== CACHE)
          .map((name) => caches.delete(name)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // A navigation to the radio gets the cached app shell. Other pages (instruments.html) go to the
  // network, so they aren't answered with the radio.
  if (request.mode === 'navigate') {
    const path = new URL(request.url).pathname;
    if (path.endsWith('/') || path.endsWith('/index.html')) {
      event.respondWith(caches.match('./', { cacheName: CACHE, ignoreVary: true }).then((cached) => cached || fetch(request)));
    }
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true, ignoreVary: true }).then((cached) => cached || fetch(request)),
  );
});
