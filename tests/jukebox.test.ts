import { describe, expect, it } from 'vitest';
import {
  jukeboxCodes,
  jukeboxGroups,
  parseJukeboxSort,
} from '../src/ui/jukebox';
import type { JukeboxSong } from '../src/ui/jukebox';
import { nextView, parseView } from '../src/ui/playlist';
import { LIBRARY } from '../src/music/library';

// Two originals in synthwave, one in techno (which comes later in STYLES), and a classic.
const SONGS: JukeboxSong[] = [
  { title: 'Zebra', composer: 'Ada', category: 'originals', style: 'techno' },
  { title: 'Beta', composer: 'Bo', category: 'originals', style: 'synthwave' },
  { title: 'Alpha', composer: 'Ada', category: 'originals', style: 'synthwave' },
  { title: 'Old One', composer: 'Clara', category: 'classics', style: 'synthwave' },
];

describe('jukeboxCodes', () => {
  it('letters the styles that have originals in STYLES order and numbers by title', () => {
    const codes = jukeboxCodes(SONGS);
    expect(codes.get(2)).toBe('A1'); // Alpha, the first synthwave title
    expect(codes.get(1)).toBe('A2'); // Beta
    expect(codes.get(0)).toBe('B1'); // Zebra, techno
  });

  it('leaves songs that are not originals without a code', () => {
    const codes = jukeboxCodes(SONGS);
    expect(codes.has(3)).toBe(false);
    expect(codes.size).toBe(3);
  });
});

describe('jukeboxGroups', () => {
  it('groups by home style in STYLES order, slots in title order', () => {
    const groups = jukeboxGroups(SONGS, 'style');
    expect(groups.map((group) => group.key)).toEqual(['synthwave', 'techno']);
    expect(groups[0].style).toBe('synthwave');
    expect(groups[0].slots).toEqual([
      { index: 2, code: 'A1' },
      { index: 1, code: 'A2' },
    ]);
    expect(groups[1].slots).toEqual([{ index: 0, code: 'B1' }]);
  });

  it('groups by composer in composer order, slots in title order', () => {
    const groups = jukeboxGroups(SONGS, 'composer');
    expect(groups.map((group) => group.key)).toEqual(['Ada', 'Bo']);
    expect(groups.every((group) => group.style === null)).toBe(true);
    expect(groups[0].slots).toEqual([
      { index: 2, code: 'A1' },
      { index: 0, code: 'B1' },
    ]);
    expect(groups[1].slots).toEqual([{ index: 1, code: 'A2' }]);
  });

  it('gives the same codes in both sorts', () => {
    const styleCodes = new Map(
      jukeboxGroups(SONGS, 'style')
        .flatMap((group) => group.slots)
        .map((slot) => [slot.index, slot.code]),
    );
    const composerCodes = new Map(
      jukeboxGroups(SONGS, 'composer')
        .flatMap((group) => group.slots)
        .map((slot) => [slot.index, slot.code]),
    );
    expect(composerCodes).toEqual(styleCodes);
  });
});

describe('parseJukeboxSort', () => {
  it('reads the saved sort, defaulting to style', () => {
    expect(parseJukeboxSort('composer')).toBe('composer');
    expect(parseJukeboxSort('style')).toBe('style');
    expect(parseJukeboxSort(null)).toBe('style');
    expect(parseJukeboxSort('x')).toBe('style');
  });
});

describe('views', () => {
  it('reads the saved view including the jukebox', () => {
    expect(parseView('jukebox')).toBe('jukebox');
    expect(parseView('playlist')).toBe('playlist');
    expect(parseView(null)).toBe('radio');
  });

  it('steps through the views, wrapping', () => {
    expect(nextView('playlist', 1)).toBe('radio');
    expect(nextView('radio', -1)).toBe('playlist');
    expect(nextView('radio', 1)).toBe('jukebox');
  });
});

describe('the real library', () => {
  const meta = LIBRARY.map((entry) => entry.song.meta);
  const codes = jukeboxCodes(meta);

  it('gives every original a code, and only originals one', () => {
    expect(codes.size).toBe(meta.filter((song) => song.category === 'originals').length);
    for (let index = 0; index < meta.length; index += 1) {
      expect(codes.has(index)).toBe(meta[index].category === 'originals');
    }
  });

  it('keeps the codes unique', () => {
    expect(new Set(codes.values()).size).toBe(codes.size);
  });
});
