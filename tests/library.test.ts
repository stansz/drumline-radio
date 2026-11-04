import { describe, expect, it } from 'vitest';
import { LIBRARY, LIBRARY_ERRORS } from '../src/music/library';

describe('library', () => {
  it('parses every song', () => {
    expect(LIBRARY_ERRORS).toEqual([]);
    expect(LIBRARY.length).toBe(24);
  });

  it('orders by category then title', () => {
    expect(LIBRARY.map((entry) => entry.id)).toEqual([
      'deck-the-halls',
      'god-rest-ye',
      'good-king-wenceslas',
      'hark-the-herald',
      'jingle-bells',
      'joy-to-the-world',
      'o-christmas-tree',
      'silent-night',
      'we-wish-you',
      'can-can',
      'canon-in-d',
      'eine-kleine-nachtmusik',
      'fur-elise',
      'greensleeves',
      'mountain-king',
      'korobeiniki',
      'ode-to-joy',
      'valkyries',
      'swan-lake',
      'when-the-saints',
      'late-bus-home',
      'midnight-arcade',
      'night-shift',
      'save-point',
    ]);
  });

  it('counts the songs in each category', () => {
    const count = (category: string) =>
      LIBRARY.filter((entry) => entry.song.meta.category === category).length;
    expect(count('carols')).toBe(9);
    expect(count('classics')).toBe(11);
    expect(count('originals')).toBe(4);
  });

  it('keeps each song in its own style', () => {
    expect(LIBRARY.map((entry) => entry.song.meta.style)).toEqual([
      'synthwave',
      'techno',
      'chiptune',
      'orchestral',
      'chiptune',
      'orchestral',
      'orchestral',
      'synthwave',
      'synthwave',
      'chiptune',
      'orchestral',
      'techno',
      'synthwave',
      'orchestral',
      'chiptune',
      'chiptune',
      'orchestral',
      'orchestral',
      'orchestral',
      'synthwave',
      'lofi',
      'synthwave',
      'techno',
      'chiptune',
    ]);
  });

  it('parses the time signatures in Greensleeves', () => {
    const greensleeves = LIBRARY.find((entry) => entry.id === 'greensleeves');
    expect(greensleeves?.song.bars.every((bar) => bar.time[0] === 3 && bar.time[1] === 4)).toBe(true);
  });

  it('puts the Valkyries in real 9/8', () => {
    const valkyries = LIBRARY.find((entry) => entry.id === 'valkyries');
    expect(valkyries?.song.meta.source).toBe('public-domain');
    expect(valkyries?.song.bars.every((bar) => bar.time[0] === 9 && bar.time[1] === 8)).toBe(true);
  });

  it('gives Fur Elise an eighth-note pickup and 3/8 bars', () => {
    const furElise = LIBRARY.find((entry) => entry.id === 'fur-elise');
    expect(furElise?.song.meta.pickupTicks).toBe(480);
    const afterFirst = furElise?.song.bars.slice(1) ?? [];
    expect(afterFirst.every((bar) => bar.time[0] === 3 && bar.time[1] === 8)).toBe(true);
  });
});
