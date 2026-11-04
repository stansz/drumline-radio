import { describe, expect, it } from 'vitest';
import { LIBRARY, LIBRARY_ERRORS } from '../src/library';

describe('library', () => {
  it('parses every song', () => {
    expect(LIBRARY_ERRORS).toEqual([]);
    expect(LIBRARY.length).toBe(23);
  });

  it('orders by source then title', () => {
    expect(LIBRARY.map((entry) => entry.id)).toEqual([
      'can-can',
      'canon-in-d',
      'deck-the-halls',
      'eine-kleine-nachtmusik',
      'fur-elise',
      'god-rest-ye',
      'good-king-wenceslas',
      'greensleeves',
      'hark-the-herald',
      'mountain-king',
      'jingle-bells',
      'joy-to-the-world',
      'korobeiniki',
      'o-christmas-tree',
      'ode-to-joy',
      'valkyries',
      'silent-night',
      'swan-lake',
      'we-wish-you',
      'when-the-saints',
      'midnight-arcade',
      'night-shift',
      'save-point',
    ]);
  });

  it('keeps each song in its own style', () => {
    expect(LIBRARY.map((entry) => entry.song.meta.style)).toEqual([
      'chiptune',
      'orchestral',
      'synthwave',
      'techno',
      'synthwave',
      'techno',
      'chiptune',
      'orchestral',
      'orchestral',
      'chiptune',
      'chiptune',
      'orchestral',
      'chiptune',
      'orchestral',
      'orchestral',
      'orchestral',
      'synthwave',
      'orchestral',
      'synthwave',
      'synthwave',
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
