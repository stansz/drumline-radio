import { describe, expect, it } from 'vitest';
import { HIDDEN_IDS, LIBRARY, LIBRARY_ERRORS } from '../src/music/library';

describe('library', () => {
  it('parses every song', () => {
    expect(LIBRARY_ERRORS).toEqual([]);
    expect(LIBRARY.length).toBe(27);
    expect(HIDDEN_IDS).toEqual([
      'can-can',
      'eine-kleine-nachtmusik',
      'ivory-and-ash-128',
      'ode-to-joy',
      'when-the-saints',
    ]);
  });

  it('orders by category then title', () => {
    expect(LIBRARY.map((entry) => entry.id)).toEqual([
      'canon-in-d',
      'clair-de-lune',
      'fur-elise',
      'greensleeves',
      'mountain-king',
      'korobeiniki',
      'moonlight',
      'nocturne',
      'valkyries',
      'swan-lake',
      'ivory-and-ash',
      'last-stop',
      'midnight-arcade',
      'night-shift',
      'save-point',
      'shortwave',
      'third-rail',
      'underpass',
      'deck-the-halls',
      'god-rest-ye',
      'good-king-wenceslas',
      'hark-the-herald',
      'jingle-bells',
      'joy-to-the-world',
      'o-christmas-tree',
      'silent-night',
      'we-wish-you',
    ]);
  });

  it('counts the songs in each category', () => {
    const count = (category: string) =>
      LIBRARY.filter((entry) => entry.song.meta.category === category).length;
    expect(count('carols')).toBe(9);
    expect(count('classics')).toBe(10);
    expect(count('originals')).toBe(8);
  });

  it('keeps each song in its own style', () => {
    expect(LIBRARY.map((entry) => entry.song.meta.style)).toEqual([
      'orchestral',
      'cinematic',
      'synthwave',
      'orchestral',
      'chiptune',
      'chiptune',
      'cinematic',
      'orchestral',
      'orchestral',
      'orchestral',
      'cinematic',
      'lofi',
      'synthwave',
      'techno',
      'chiptune',
      'lofi',
      'lofi',
      'synthwave',
      'synthwave',
      'techno',
      'chiptune',
      'orchestral',
      'chiptune',
      'orchestral',
      'orchestral',
      'synthwave',
      'synthwave',
    ]);
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
