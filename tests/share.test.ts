import { describe, expect, it } from 'vitest';
import { formatShareTime, hashFullyKnown, parseShareHash, parseShareTime, playlistHash, songHash } from '../src/ui/share';
import type { PlaylistEntry } from '../src/ui/playlist';

const IDS = ['third-rail', 'last-stop'];

function entry(song: string, style: PlaylistEntry['style'] = 'lofi'): PlaylistEntry {
  return { song, style };
}

describe('formatShareTime', () => {
  it('formats floored seconds as m:ss', () => {
    expect(formatShareTime(80)).toBe('1:20');
    expect(formatShareTime(5.9)).toBe('0:05');
    expect(formatShareTime(600)).toBe('10:00');
    expect(formatShareTime(0)).toBe('0:00');
  });

  it('round-trips through parseShareTime', () => {
    for (const seconds of [0, 5, 80, 600, 3599]) {
      expect(parseShareTime(formatShareTime(seconds))).toBe(seconds);
    }
  });
});

describe('parseShareTime', () => {
  it('reads m:ss and plain seconds', () => {
    expect(parseShareTime('1:20')).toBe(80);
    expect(parseShareTime('0:05')).toBe(5);
    expect(parseShareTime('10:00')).toBe(600);
    expect(parseShareTime('80')).toBe(80);
    expect(parseShareTime('0')).toBe(0);
  });

  it('rejects anything else', () => {
    for (const text of ['1:5', '1:60', '-3', 'abc', '', '1:20:30', '3.5', ' 80 ']) {
      expect(parseShareTime(text)).toBeNull();
    }
  });
});

describe('songHash', () => {
  it('builds a song link without a time', () => {
    expect(songHash('third-rail', 'techno', null)).toBe('#song=third-rail&style=techno');
  });

  it('adds the time once the position is at least one second in', () => {
    expect(songHash('third-rail', 'techno', 80)).toBe(
      '#song=third-rail&style=techno&t=1%3A20',
    );
    expect(songHash('third-rail', 'techno', 0.5)).toBe('#song=third-rail&style=techno');
  });
});

describe('playlistHash', () => {
  it('builds a list link', () => {
    expect(playlistHash([entry('third-rail', 'lofi'), entry('last-stop', 'techno')])).toBe(
      '#list=third-rail~lofi,last-stop~techno',
    );
  });

  it('has nothing to say about an empty playlist', () => {
    expect(playlistHash([])).toBe('');
  });

  it('round-trips through parseShareHash', () => {
    const list = [entry('third-rail', 'lofi'), entry('last-stop', 'techno')];
    expect(parseShareHash(playlistHash(list), IDS)).toEqual({ kind: 'list', entries: list });
  });
});

describe('parseShareHash', () => {
  it('reads a valid song link', () => {
    expect(parseShareHash('#song=third-rail&style=techno&t=1:20', IDS)).toEqual({
      kind: 'song',
      song: 'third-rail',
      style: 'techno',
      t: 80,
    });
  });

  it('reads a percent-encoded time and accepts a leading # or not', () => {
    const linked = { kind: 'song', song: 'third-rail', style: 'techno', t: 80 };
    expect(parseShareHash('#song=third-rail&style=techno&t=1%3A20', IDS)).toEqual(linked);
    expect(parseShareHash('song=third-rail&style=techno&t=1%3A20', IDS)).toEqual(linked);
    expect(parseShareHash('song=third-rail&style=techno&t=1:20', IDS)).toEqual(linked);
  });

  it('leaves out a style it does not know', () => {
    expect(parseShareHash('#song=third-rail&style=polka', IDS)).toEqual({
      kind: 'song',
      song: 'third-rail',
      style: null,
      t: null,
    });
  });

  it('leaves out a time it cannot read', () => {
    expect(parseShareHash('#song=third-rail&style=lofi&t=abc', IDS)).toEqual({
      kind: 'song',
      song: 'third-rail',
      style: 'lofi',
      t: null,
    });
  });

  it('ignores unknown songs, empty hashes, and garbage', () => {
    for (const hash of ['#song=unknown&style=techno', '', '#', '#garbage', '#song=']) {
      expect(parseShareHash(hash, IDS)).toBeNull();
    }
  });

  it('reads a playlist link and drops the bad items', () => {
    expect(
      parseShareHash(
        '#list=third-rail~lofi,unknown~techno,last-stop~polka,last-stop~techno',
        IDS,
      ),
    ).toEqual({ kind: 'list', entries: [entry('third-rail', 'lofi'), entry('last-stop', 'techno')] });
  });

  it('rejects a playlist with no valid items', () => {
    expect(parseShareHash('#list=unknown~lofi,third-rail~polka,', IDS)).toBeNull();
  });

  it('lets the list win when both appear', () => {
    expect(parseShareHash('#song=last-stop&list=third-rail~lofi', IDS)).toEqual({
      kind: 'list',
      entries: [entry('third-rail', 'lofi')],
    });
  });
});

describe('hashFullyKnown', () => {
  const ids = ['sunliner', 'riverfront'];
  it('is true when every song and style is known, or there is no link', () => {
    expect(hashFullyKnown('#song=sunliner&style=altrock&t=30', ids)).toBe(true);
    expect(hashFullyKnown('#list=sunliner~techno,riverfront~lofi', ids)).toBe(true);
    expect(hashFullyKnown('', ids)).toBe(true);
  });
  it('is false when a song or style is unknown to this build', () => {
    expect(hashFullyKnown('#song=new-song', ids)).toBe(false);
    expect(hashFullyKnown('#song=sunliner&style=polka', ids)).toBe(false);
    expect(hashFullyKnown('#list=sunliner~techno,new-song~lofi', ids)).toBe(false);
  });
});
