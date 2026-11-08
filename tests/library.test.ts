import { describe, expect, it } from 'vitest';
import { HIDDEN_IDS, LIBRARY, LIBRARY_ERRORS } from '../src/music/library';

describe('library', () => {
  it('parses every song', () => {
    expect(LIBRARY_ERRORS).toEqual([]);
    expect(LIBRARY.length).toBe(35);
    expect(HIDDEN_IDS).toEqual([
      'can-can',
      'eine-kleine-nachtmusik',
      'ivory-and-ash-128',
      'ode-to-joy',
      'when-the-saints',
    ]);
  });

  it('orders by category, then home style, then title', () => {
    expect(LIBRARY.map((entry) => entry.id)).toEqual([
      'fur-elise',
      'mountain-king',
      'korobeiniki',
      'canon-in-d',
      'greensleeves',
      'nocturne',
      'valkyries',
      'swan-lake',
      'clair-de-lune',
      'moonlight',
      'midnight-arcade',
      'underpass',
      'save-point',
      'wayfarers-rest',
      'lantern-ward',
      'cartographer',
      'fathom',
      'night-shift',
      'riverfront',
      'last-stop',
      'shortwave',
      'third-rail',
      'ivory-and-ash',
      'the-silent-keep',
      'exit-sign',
      'porch-light',
      'deck-the-halls',
      'silent-night',
      'we-wish-you',
      'good-king-wenceslas',
      'jingle-bells',
      'hark-the-herald',
      'joy-to-the-world',
      'o-christmas-tree',
      'god-rest-ye',
    ]);
  });

  it('counts the songs in each category', () => {
    const count = (category: string) =>
      LIBRARY.filter((entry) => entry.song.meta.category === category).length;
    expect(count('carols')).toBe(9);
    expect(count('classics')).toBe(10);
    expect(count('originals')).toBe(16);
  });

  it('keeps each song in its own style', () => {
    expect(LIBRARY.map((entry) => entry.song.meta.style)).toEqual([
      'synthwave',
      'chiptune',
      'chiptune',
      'orchestral',
      'orchestral',
      'orchestral',
      'orchestral',
      'orchestral',
      'cinematic',
      'cinematic',
      'synthwave',
      'synthwave',
      'chiptune',
      'chiptune',
      'orchestral',
      'orchestral',
      'techno',
      'techno',
      'techno',
      'lofi',
      'lofi',
      'lofi',
      'cinematic',
      'cinematic',
      'altrock',
      'altrock',
      'synthwave',
      'synthwave',
      'synthwave',
      'chiptune',
      'chiptune',
      'orchestral',
      'orchestral',
      'orchestral',
      'techno',
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
