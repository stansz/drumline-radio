import { CACHE_PREFIX } from './precache';

// Registers the service worker and keeps the app up to date. Each time the app opens or comes back
// to the front it asks the server, past every cache, which build is current. If the cached app is
// older, it updates the worker; if that hasn't taken over within HEAL_MS (a browser holding on to an
// old worker), it unregisters the worker and drops its cache so the next load is fresh. The heal runs
// only if the server still answers then, so a connection lost mid-update never drops the offline copy.
// When a new build takes over, a page that already had one reloads to pick it up: at once if nothing
// is playing (ui.ts marks the page with data-playing), otherwise the next time it is hidden, so music
// isn't cut off. A share link to a song only the new build knows stays in the address for it.
const HEAL_MS = 15000;

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const url = `${import.meta.env.BASE_URL}sw.js`;
  // Other apps can share this origin (GitHub Pages serves every project from one host), so only
  // this app's registration is ever touched.
  const scope = new URL(import.meta.env.BASE_URL, window.location.href).href;
  const hadController = sw.controller !== null;
  let reloadWhenHidden = false;
  let healing = false;

  const reload = (): void => {
    if (document.documentElement.dataset.playing === 'true') reloadWhenHidden = true;
    else window.location.reload();
  };

  // The build the server has now, read from sw.js (its cache name holds the build's hash).
  async function serverCache(): Promise<string | null> {
    const response = await fetch(url, { cache: 'no-store' });
    const match = /'drumline-radio-' \+ "([0-9a-f]+)"/.exec(await response.text());
    return match ? `${CACHE_PREFIX}${match[1]}` : null;
  }

  // A build counts as installed only when its cache holds the app page. A failed install can leave
  // an empty cache behind under the right name.
  async function installed(name: string): Promise<boolean> {
    return (await caches.has(name)) && (await caches.match('./', { cacheName: name, ignoreVary: true })) !== undefined;
  }

  async function checkForUpdate(): Promise<void> {
    if (healing) return;
    try {
      const want = await serverCache();
      if (!want || (await installed(want))) return;
      healing = true;
      // An update that fails (a worker that won't install) still falls through to the heal below.
      await (await sw.getRegistration())?.update().catch(() => undefined);
      window.setTimeout(() => {
        void (async () => {
          // serverCache() throws when offline, which skips the heal and keeps the working cache.
          if (!(await installed(want)) && (await serverCache()) === want) {
            for (const registration of await sw.getRegistrations()) {
              if (registration.scope === scope) await registration.unregister();
            }
            for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX)) await caches.delete(name);
            reload();
          }
          healing = false;
        })().catch(() => { healing = false; });
      }, HEAL_MS);
    } catch {
      healing = false; // offline: try again next time
    }
  }

  sw.addEventListener('controllerchange', () => {
    if (hadController) reload();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (reloadWhenHidden) window.location.reload();
      return;
    }
    void checkForUpdate();
  });
  window.addEventListener('load', () => {
    sw.register(url, { updateViaCache: 'none' })
      .then(() => checkForUpdate())
      .catch(() => {});
  });
}
