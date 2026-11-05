// Registers the service worker and keeps the app up to date. It checks for a new build each time
// the app comes back to the front. When a new build takes over, a page that already had one reloads
// to pick it up: at once if it was just opened or brought back, otherwise the next time it is hidden,
// so music that is playing isn't cut off.
const FRESH_MS = 8000;

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const hadController = sw.controller !== null;
  let shownAt = performance.now();
  let reloadWhenHidden = false;

  sw.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (performance.now() - shownAt < FRESH_MS) window.location.reload();
    else reloadWhenHidden = true;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (reloadWhenHidden) window.location.reload();
      return;
    }
    shownAt = performance.now();
    void sw.getRegistration().then((registration) => registration?.update()).catch(() => {});
  });
  window.addEventListener('load', () => {
    sw.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).catch(() => {});
  });
}
