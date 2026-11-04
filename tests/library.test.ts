import { describe, expect, it } from 'vitest';
import { LIBRARY, LIBRARY_ERRORS } from '../src/library';

describe('library', () => {
  it('parses every song', () => {
    expect(LIBRARY_ERRORS).toEqual([]);
    expect(LIBRARY.length).toBe(4);
  });

  it('orders by source then title', () => {
    expect(LIBRARY.map((entry) => entry.id)).toEqual([
      'acid-test',
      'neon-test-pattern',
      'ninefold',
      'pixel-postcard',
    ]);
  });

  it('keeps each song in its own style', () => {
    expect(LIBRARY.map((entry) => entry.song.meta.style)).toEqual([
      'techno',
      'synthwave',
      'orchestral',
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
});
