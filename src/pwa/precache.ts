export const CACHE_PREFIX = 'drumline-radio-';

const encoder = new TextEncoder();

function normalize(name: string): string {
  let file = name.replace(/\\/g, '/');
  while (file.startsWith('./')) file = file.slice(2);
  while (file.startsWith('/')) file = file.slice(1);
  return file;
}

function keep(name: string): boolean {
  return name !== 'sw.js' && !name.endsWith('.map') && !name.startsWith('.');
}

/**
 * The files the service worker caches: the app shell and every built asset.
 * Names are relative to the site root, so './' is the navigation entry point.
 */
export function precacheList(bundleFiles: string[], publicFiles: string[]): string[] {
  const files = new Set<string>();
  for (const raw of [...bundleFiles, ...publicFiles]) {
    const name = normalize(raw);
    if (name && keep(name)) files.add(name);
  }
  return ['./', ...Array.from(files).sort()];
}

function fnv1a(text: string): number {
  let hash = 2166136261;
  for (const byte of encoder.encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** A short hash of the precache list, so a new build gets a new cache. */
export function cacheVersion(list: string[]): string {
  return fnv1a(list.join('\n')).toString(16).padStart(8, '0');
}
