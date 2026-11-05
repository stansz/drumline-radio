import { describe, expect, it } from 'vitest';
import {
  addEntry,
  moveEntry,
  nextInPlaylist,
  parsePlaylist,
  parseView,
  PLAYLIST_MAX,
  prevInPlaylist,
  removeEntry,
  serializePlaylist,
} from '../src/ui/playlist';
import type { PlaylistEntry } from '../src/ui/playlist';

const IDS = ['a', 'b', 'c'];

function entry(song: string, style: PlaylistEntry['style'] = 'synthwave'): PlaylistEntry {
  return { song, style };
}

describe('parsePlaylist', () => {
  it('reads an empty playlist from nothing at all', () => {
    expect(parsePlaylist(null, IDS)).toEqual([]);
  });

  it('treats invalid JSON and non-arrays as empty', () => {
    expect(parsePlaylist('{not json', IDS)).toEqual([]);
    expect(parsePlaylist('{"song":"a","style":"techno"}', IDS)).toEqual([]);
    expect(parsePlaylist('"a"', IDS)).toEqual([]);
  });

  it('keeps only known songs and styles, and copies just those two fields', () => {
    const stored = JSON.stringify([
      { song: 'a', style: 'techno', extra: true },
      { song: 'unknown', style: 'techno' },
      { song: 'b', style: 'swing' },
      { song: 5, style: 'techno' },
      { song: 'c' },
      null,
      'a',
    ]);
    expect(parsePlaylist(stored, IDS)).toEqual([
      { song: 'a', style: 'techno' },
    ]);
    expect(Object.keys(parsePlaylist(stored, IDS)[0])).toEqual(['song', 'style']);
  });

  it('truncates to the first PLAYLIST_MAX kept entries', () => {
    const stored = JSON.stringify(
      Array.from({ length: PLAYLIST_MAX + 5 }, () => ({ song: 'a', style: 'lofi' })),
    );
    const list = parsePlaylist(stored, IDS);
    expect(list).toHaveLength(PLAYLIST_MAX);
    expect(list[PLAYLIST_MAX - 1]).toEqual({ song: 'a', style: 'lofi' });
  });
});

describe('serializePlaylist', () => {
  it('round-trips through parsePlaylist', () => {
    const list = [entry('a'), entry('b', 'techno'), entry('c', 'cinematic')];
    expect(parsePlaylist(serializePlaylist(list), IDS)).toEqual(list);
  });
});

describe('addEntry', () => {
  it('appends to a new array', () => {
    const list = [entry('a')];
    const added = addEntry(list, entry('b', 'lofi'));
    expect(added).toEqual([entry('a'), entry('b', 'lofi')]);
    expect(list).toEqual([entry('a')]);
  });

  it('leaves a full playlist untouched', () => {
    const full = Array.from({ length: PLAYLIST_MAX }, () => entry('a'));
    expect(addEntry(full, entry('b'))).toBe(full);
  });
});

describe('moveEntry', () => {
  const list = [entry('a'), entry('b'), entry('c')];

  it('swaps an entry with its neighbour', () => {
    expect(moveEntry(list, null, 1, -1).list).toEqual([entry('b'), entry('a'), entry('c')]);
    expect(moveEntry(list, null, 1, 1).list).toEqual([entry('a'), entry('c'), entry('b')]);
  });

  it('moves the playing index with a swap at either end', () => {
    expect(moveEntry(list, 1, 1, -1).at).toBe(0);
    expect(moveEntry(list, 0, 1, -1).at).toBe(1);
    expect(moveEntry(list, 1, 1, 1).at).toBe(2);
    expect(moveEntry(list, 2, 1, 1).at).toBe(1);
  });

  it('leaves the playing index alone when it is not part of the swap', () => {
    expect(moveEntry(list, 0, 2, 1).at).toBe(0);
    expect(moveEntry(list, null, 0, 1)).toEqual({
      list: [entry('b'), entry('a'), entry('c')],
      at: null,
    });
  });

  it('returns the same list for an out-of-range move', () => {
    expect(moveEntry(list, 1, 0, -1)).toEqual({ list, at: 1 });
    expect(moveEntry(list, 1, 2, 1)).toEqual({ list, at: 1 });
    expect(moveEntry(list, 1, -1, 1)).toEqual({ list, at: 1 });
    expect(moveEntry(list, 1, 3, -1)).toEqual({ list, at: 1 });
  });
});

describe('removeEntry', () => {
  const list = [entry('a'), entry('b'), entry('c')];

  it('removes the entry at an index', () => {
    const result = removeEntry(list, 1, 1);
    expect(result.list).toEqual([entry('a'), entry('c')]);
  });

  it('moves the playing index down when an earlier entry goes', () => {
    expect(removeEntry(list, 2, 0)).toEqual({
      list: [entry('b'), entry('c')],
      at: 1,
    });
  });

  it('clears playback when the playing entry is removed', () => {
    expect(removeEntry(list, 1, 1)).toEqual({
      list: [entry('a'), entry('c')],
      at: null,
    });
  });

  it('keeps the playing index when a later entry goes', () => {
    expect(removeEntry(list, 0, 2).at).toBe(0);
    expect(removeEntry(list, null, 1).at).toBeNull();
  });

  it('returns the same list for an out-of-range removal', () => {
    expect(removeEntry(list, 1, -1)).toEqual({ list, at: 1 });
    expect(removeEntry(list, 1, 3)).toEqual({ list, at: 1 });
  });
});

describe('nextInPlaylist', () => {
  it('stops on an empty list', () => {
    expect(nextInPlaylist(0, 0, false, false)).toBe(-1);
    expect(nextInPlaylist(0, 0, true, true)).toBe(-1);
  });

  it('stays on the same entry when repeating one', () => {
    expect(nextInPlaylist(1, 3, true, false)).toBe(1);
  });

  it('moves to the next entry', () => {
    expect(nextInPlaylist(1, 3, false, false)).toBe(2);
  });

  it('wraps or stops at the end, depending on loop', () => {
    expect(nextInPlaylist(2, 3, false, true)).toBe(0);
    expect(nextInPlaylist(2, 3, false, false)).toBe(-1);
  });
});

describe('prevInPlaylist', () => {
  it('steps back and wraps around', () => {
    expect(prevInPlaylist(2, 3)).toBe(1);
    expect(prevInPlaylist(0, 3)).toBe(2);
  });

  it('stops on an empty list', () => {
    expect(prevInPlaylist(0, 0)).toBe(-1);
  });
});

describe('parseView', () => {
  it('reads the saved view, defaulting to radio', () => {
    expect(parseView('playlist')).toBe('playlist');
    expect(parseView('radio')).toBe('radio');
    expect(parseView('Playlist')).toBe('radio');
    expect(parseView(null)).toBe('radio');
  });
});
