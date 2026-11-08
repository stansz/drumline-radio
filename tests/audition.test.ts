import { describe, expect, it } from 'vitest';
import { INSTRUMENTS } from '../src/audio/instruments';
import { STYLES } from '../src/music/roles';
import { parseSong } from '../src/music/song';
import { auditions, auditionSongText, defaultStyle } from '../src/ui/audition';

describe('the instrument page', () => {
  it('lists every bank instrument once', () => {
    const ids = auditions().map((audition) => audition.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(Object.keys(INSTRUMENTS).sort());
  });

  it('gives every instrument an audition song that parses in every style', () => {
    for (const audition of auditions()) {
      for (const style of STYLES) {
        const result = parseSong(auditionSongText(audition, style));
        expect(result.ok, `${audition.id} in ${style}`).toBe(true);
      }
    }
  });

  it('hears an instrument in a style that plays it in a role', () => {
    const harp = auditions().find((audition) => audition.id === 'concert-harp');
    expect(harp && defaultStyle(harp)).toBe('orchestral');
    const unused = auditions().find((audition) => audition.uses.length === 0);
    if (unused) expect(defaultStyle(unused)).toBe('synthwave');
  });
});
