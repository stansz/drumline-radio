import { describe, expect, it } from 'vitest';
import { chordTones, parseChordMap } from '../src/music/chords';

describe('chordTones', () => {
  it('reads the common qualities', () => {
    expect(chordTones('C')).toEqual([0, 4, 7]);
    expect(chordTones('F#m')).toEqual([1, 6, 9]);
    expect(chordTones('Bb7')).toEqual([2, 5, 8, 10]);
    expect(chordTones('Dm9')).toEqual([0, 2, 4, 5, 9]);
    expect(chordTones('G/B')).toEqual([2, 7, 11]);
  });

  it('reads a no-chord symbol as null', () => {
    expect(chordTones('-')).toBeNull();
    expect(chordTones('N.C.')).toBeNull();
  });

  it('throws on a symbol it cannot read', () => {
    expect(() => chordTones('H')).toThrow();
  });
});

describe('parseChordMap', () => {
  it('returns null when there are no chord lines', () => {
    expect(parseChordMap('no chords here')).toBeNull();
  });

  it('cycles each line until the next start bar', () => {
    const map = parseChordMap('# chords: F#m D A E\n# chords @9: Bm | G\n');
    if (!map) throw new Error('expected a chord map');
    expect(map.chordAt(1)).toBe('F#m');
    expect(map.chordAt(4)).toBe('E');
    expect(map.chordAt(5)).toBe('F#m');
    expect(map.chordAt(8)).toBe('E');
    expect(map.chordAt(9)).toBe('Bm');
    expect(map.chordAt(10)).toBe('G');
    expect(map.chordAt(11)).toBe('Bm');
  });

  it('leaves the bars before the first line with no chord', () => {
    const map = parseChordMap('# chords @5: C\n');
    if (!map) throw new Error('expected a chord map');
    expect(map.chordAt(4)).toBeNull();
    expect(map.chordAt(5)).toBe('C');
  });

  it('rejects a bad symbol', () => {
    expect(() => parseChordMap('# chords: C Xm\n')).toThrow();
  });

  it('rejects lines out of start-bar order', () => {
    expect(() => parseChordMap('# chords @9: C\n# chords @5: D\n')).toThrow();
  });
});
