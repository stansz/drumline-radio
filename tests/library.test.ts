import { describe, expect, it } from 'vitest';
import { LIBRARY, LIBRARY_ERRORS } from '../src/library';

describe('library', () => {
  it('parses every song', () => {
    expect(LIBRARY_ERRORS).toEqual([]);
    expect(LIBRARY.length).toBe(6);
  });

  it('orders by source then title', () => {
    expect(LIBRARY.map((entry) => entry.id)).toEqual([
      'greensleeves',
      'mountain-king',
      'valkyries',
      'midnight-arcade',
      'night-shift',
      'save-point',
    ]);
  });

  it('keeps each song in its own style', () => {
    expect(LIBRARY.map((entry) => entry.song.meta.style)).toEqual([
      'orchestral',
      'chiptune',
      'orchestral',
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
});
