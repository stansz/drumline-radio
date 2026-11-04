import { describe, expect, it } from 'vitest';
import { LIBRARY, LIBRARY_ERRORS } from '../src/library';

describe('library', () => {
  it('parses every song', () => {
    expect(LIBRARY_ERRORS).toEqual([]);
    expect(LIBRARY.length).toBe(10);
  });

  it('orders by source then title', () => {
    expect(LIBRARY.map((entry) => entry.id)).toEqual([
      'greensleeves',
      'mountain-king',
      'valkyries',
      'acid-test',
      'midnight-arcade',
      'neon-test-pattern',
      'night-shift',
      'ninefold',
      'pixel-postcard',
      'save-point',
    ]);
  });

  it('keeps each song in its own style', () => {
    expect(LIBRARY.map((entry) => entry.song.meta.style)).toEqual([
      'orchestral',
      'chiptune',
      'orchestral',
      'techno',
      'synthwave',
      'synthwave',
      'techno',
      'orchestral',
      'chiptune',
      'chiptune',
    ]);
  });

  it('parses the time signatures in ninefold', () => {
    const ninefold = LIBRARY.find((entry) => entry.id === 'ninefold');
    expect(ninefold).toBeDefined();
    expect(ninefold?.song.bars[0].time).toEqual([9, 8]);
    const bar9 = ninefold?.song.bars.find((bar) => bar.number === 9);
    expect(bar9?.time).toEqual([6, 8]);
  });

  it('puts the Valkyries in real 9/8', () => {
    const valkyries = LIBRARY.find((entry) => entry.id === 'valkyries');
    expect(valkyries?.song.meta.source).toBe('public-domain');
    expect(valkyries?.song.bars.every((bar) => bar.time[0] === 9 && bar.time[1] === 8)).toBe(true);
  });
});
