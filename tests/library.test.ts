import { describe, expect, it } from 'vitest';
import { HIDDEN_IDS, LIBRARY, LIBRARY_ERRORS } from '../src/music/library';
import { STYLES } from '../src/music/roles';
import { CATEGORIES } from '../src/music/song';

describe('library', () => {
  it('parses every song', () => {
    expect(LIBRARY_ERRORS).toEqual([]);
    expect(LIBRARY.length).toBeGreaterThan(0);
    expect(HIDDEN_IDS).toEqual([
      'can-can',
      'eine-kleine-nachtmusik',
      'ivory-and-ash-128',
      'ode-to-joy',
      'starlight-drive',
      'when-the-saints',
    ]);
  });

  // A rule rather than a list, so adding a song needs no edit here.
  it('orders by category, then home style, then title', () => {
    const key = (entry: (typeof LIBRARY)[number]) => [
      CATEGORIES.indexOf(entry.song.meta.category),
      STYLES.indexOf(entry.song.meta.style),
    ];
    for (const entry of LIBRARY) expect(key(entry), entry.id).not.toContain(-1);
    for (let i = 1; i < LIBRARY.length; i++) {
      const [a, b] = [LIBRARY[i - 1], LIBRARY[i]];
      const [ka, kb] = [key(a), key(b)];
      const order = ka[0] - kb[0] || ka[1] - kb[1] || a.song.meta.title.localeCompare(b.song.meta.title);
      expect(order, `${a.id} before ${b.id}`).toBeLessThan(0);
    }
  });

  it('parses the time signatures in Greensleeves', () => {
    const greensleeves = LIBRARY.find((entry) => entry.id === 'greensleeves');
    expect(greensleeves?.song.bars.every((bar) => bar.time[0] === 6 && bar.time[1] === 8)).toBe(true);
  });

  it('puts the Valkyries in real 9/8', () => {
    const valkyries = LIBRARY.find((entry) => entry.id === 'valkyries');
    expect(valkyries?.song.meta.source).toBe('public-domain');
    expect(valkyries?.song.bars.every((bar) => bar.time[0] === 9 && bar.time[1] === 8)).toBe(true);
  });

  it('gives every public-domain song an about story', () => {
    const publicDomain = LIBRARY.filter((entry) => entry.song.meta.source === 'public-domain');
    expect(publicDomain.length).toBeGreaterThan(0);
    expect(publicDomain.every((entry) => entry.song.meta.about !== null)).toBe(true);
  });

  it('gives Fur Elise an eighth-note pickup and 3/8 bars', () => {
    const furElise = LIBRARY.find((entry) => entry.id === 'fur-elise');
    expect(furElise?.song.meta.pickupTicks).toBe(480);
    const afterFirst = furElise?.song.bars.slice(1) ?? [];
    expect(afterFirst.every((bar) => bar.time[0] === 3 && bar.time[1] === 8)).toBe(true);
  });
});
