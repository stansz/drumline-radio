/** Keeps the screen awake while wanted, where the browser supports the Screen Wake Lock API. */
export function createWakeLock(): { set(wanted: boolean): void } {
  let wanted = false;
  let held: WakeLockSentinel | null = null;
  let requesting = false;

  const request = (): void => {
    if (!wanted || held || requesting) return;
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
            if (held === sentinel) held = null;
          });
        })
        .catch(() => {
          requesting = false;
        });
    } catch {
      requesting = false;
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
    if (document.visibilityState === 'visible') request();
  });

  return {
    set(next: boolean): void {
      wanted = next;
      if (wanted) request();
      else release();
    },
  };
}
