import { describe, expect, it } from 'vitest';
import { cacheVersion, precacheList } from '../src/pwa/precache';

describe('precacheList', () => {
  it('normalises, filters, sorts, and de-duplicates file names', () => {
    expect(
      precacheList(
        ['assets/a.js', 'index.html', 'assets/a.js.map'],
        ['icons/x.png', 'sw.js', '.DS_Store', 'icons\\y.png'],
      ),
    ).toEqual(['./', 'assets/a.js', 'icons/x.png', 'icons/y.png', 'index.html']);
  });
});

describe('cacheVersion', () => {
  it('is an eight-character hex hash that is stable and changes with the list', () => {
    const list = ['./', 'assets/a.js', 'index.html'];
    const version = cacheVersion(list);
    expect(version).toBe(cacheVersion([...list]));
    expect(version).not.toBe(cacheVersion(['./', 'assets/b.js', 'index.html']));
    expect(version).toMatch(/^[0-9a-f]{8}$/);
  });
});
