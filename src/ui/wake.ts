/** Keeps the screen awake while wanted, where the browser supports the Screen Wake Lock API. */
export function createWakeLock(): { set(wanted: boolean): void } {
  let wanted = false;
  let held: WakeLockSentinel | null = null;
  let requesting = false;
  // After a refusal (battery saver, permissions), wait before asking again instead of asking every
  // frame. Coming back to the page asks again at once.
  const RETRY_MS = 30000;
  let retryAt = 0;

  const request = (): void => {
    if (!wanted || held || requesting || performance.now() < retryAt) return;
    if (!('wakeLock' in navigator)) return;
    if (document.visibilityState !== 'visible') return;
    requesting = true;
    try {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          requesting = false;
          held = sentinel;
          sentinel.addEventListener('release', () => {
            if (held !== sentinel) return;
            held = null;
            // The system can drop the lock mid-song; ask again while it is still wanted.
            request();
          });
        })
        .catch(() => {
          requesting = false;
          retryAt = performance.now() + RETRY_MS;
        });
    } catch {
      requesting = false;
      retryAt = performance.now() + RETRY_MS;
      // The wake lock just isn't available here.
    }
  };

  const release = (): void => {
    const sentinel = held;
    held = null;
    if (!sentinel) return;
    try {
      sentinel.release().catch(() => {});
    } catch {
      // Releasing a lock that is already gone is fine.
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      retryAt = 0;
      request();
    }
  });

  return {
    set(next: boolean): void {
      wanted = next;
      if (wanted) request();
      else release();
    },
  };
}
