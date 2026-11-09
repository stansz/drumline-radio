import { describe, expect, it } from 'vitest';
import fixture from './fixtures/features.song?raw';
import { parseSong } from '../src/music/song';
import { LIBRARY } from '../src/music/library';
import type { Category, Song } from '../src/music/song';
import type { StyleId } from '../src/music/roles';
import {
  flashStep,
  FLASH_FADE,
  FLASH_MIN_GAP,
  FLASH_PEAK,
  driftPosition,
  formatTime,
  laneLabels,
  laneLayout,
  marqueeTiming,
  nearestStation,
  nextAfterEnd,
  nextStyleFilter,
  noteY,
  parseCategory,
  parseSaverMinutes,
  parseStyleFilter,
  parseVolume,
  prevAction,
  scrubTarget,
  shouldStartSaver,
  shownComposer,
  songFacts,
  stationLabel,
  stationsIn,
  stepStation,
  stylesIn,
  volumeGain,
} from '../src/ui/view';

function fixtureSong(): Song {
  const result = parseSong(fixture);
  if (!result.ok) throw new Error(`fixture failed to parse: ${result.errors.join('; ')}`);
  return result.song;
}

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(61.9)).toBe('1:01');
    expect(formatTime(600)).toBe('10:00');
    expect(formatTime(-3)).toBe('0:00');
  });
});

describe('stationLabel', () => {
  it('spreads the stations across the FM band on odd tenths', () => {
    expect(stationLabel(0, 27)).toBe('88.1');
    expect(stationLabel(26, 27)).toBe('107.9');
    const labels = Array.from({ length: 27 }, (_, i) => stationLabel(i, 27));
    expect(new Set(labels).size).toBe(27);
    for (const label of labels) expect(Math.round(Number(label) * 10) % 2).toBe(1);
  });

  it('gives a single station the bottom of the band', () => {
    expect(stationLabel(0, 1)).toBe('88.1');
  });
});

describe('prevAction', () => {
  it('restarts once the song is under way', () => {
    expect(prevAction(4)).toBe('restart');
    expect(prevAction(3)).toBe('previous');
    expect(prevAction(0)).toBe('previous');
  });
});

describe('nextAfterEnd', () => {
  it('loops the current song when repeating, otherwise advances through the visible stations', () => {
    expect(nextAfterEnd(2, [0, 1, 2, 3, 4], true)).toBe(2);
    expect(nextAfterEnd(2, [0, 2, 4], false)).toBe(4);
    expect(nextAfterEnd(4, [0, 2, 4], false)).toBe(0);
  });
});

describe('stepStation', () => {
  it('steps forward and backward, wrapping around', () => {
    expect(stepStation([0, 2, 4], 0, 1)).toBe(2);
    expect(stepStation([0, 2, 4], 0, -1)).toBe(4);
    expect(stepStation([0, 1, 2], 2, 1)).toBe(0);
  });

  it('falls back to the first visible station when the current one is hidden', () => {
    expect(stepStation([1, 3], 2, 1)).toBe(1);
  });

  it('keeps the current station when nothing is visible', () => {
    expect(stepStation([], 5, 1)).toBe(5);
  });
});

describe('stationsIn', () => {
  const categories: Category[] = ['carols', 'classics', 'carols', 'originals'];

  it('lists library indices for the chosen preset', () => {
    expect(stationsIn(categories, 'all')).toEqual([0, 1, 2, 3]);
    expect(stationsIn(categories, 'carols')).toEqual([0, 2]);
  });
});

describe('parseCategory', () => {
  it('reads a stored preset and falls back to All', () => {
    expect(parseCategory('carols')).toBe('carols');
    expect(parseCategory(null)).toBe('all');
    expect(parseCategory('jazz')).toBe('all');
  });
});

describe('nearestStation', () => {
  it('finds the closest centre', () => {
    expect(nearestStation([0, 160, 320], 250)).toBe(2);
    expect(nearestStation([0, 160, 320], 80)).toBe(0);
    expect(nearestStation([], 5)).toBe(-1);
  });
});

describe('laneLayout', () => {
  it('stacks lanes and works out their pitch ranges', () => {
    const lanes = laneLayout(fixtureSong(), 300);
    expect(lanes.length).toBe(3);
    expect(lanes.map((lane) => lane.top)).toEqual([0, 100, 200]);
    expect(lanes.map((lane) => lane.height)).toEqual([100, 100, 100]);
    expect(lanes[0].low).toBe(58);
    expect(lanes[0].high).toBe(86);
    expect(lanes[0].rows).toBeNull();
    expect(lanes[2].rows).toEqual([49, 42, 38, 36]);
    expect(noteY(lanes[0], 86)).toBeCloseTo(4, 6);
    expect(noteY(lanes[2], 38)).toBeCloseTo(200 + 4 + 2 * (92 / 4), 6);
  });
});

describe('volume', () => {
  it('maps the slider to a squared gain', () => {
    expect(volumeGain(100)).toBe(1);
    expect(volumeGain(50)).toBe(0.25);
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(150)).toBe(1);
    expect(volumeGain(-5)).toBe(0);
  });

  it('reads a stored volume, defaulting to 100', () => {
    expect(parseVolume(null)).toBe(100);
    expect(parseVolume('')).toBe(100);
    expect(parseVolume('abc')).toBe(100);
    expect(parseVolume('40')).toBe(40);
    expect(parseVolume('140')).toBe(100);
    expect(parseVolume('-3')).toBe(0);
  });
});

describe('scrubTarget', () => {
  it('moves forward when dragging left, at the score scale', () => {
    // 800 px wide: 100 px per second.
    expect(scrubTarget(10, -200, 800, 60)).toBe(12);
    expect(scrubTarget(10, 300, 800, 60)).toBe(7);
  });

  it('clamps to the song', () => {
    expect(scrubTarget(1, 500, 800, 60)).toBe(0);
    expect(scrubTarget(59, -500, 800, 60)).toBe(60);
    expect(scrubTarget(5, 100, 0, 60)).toBe(5);
  });
});

describe('parseSaverMinutes', () => {
  it('reads a stored screensaver delay and falls back to 5 minutes', () => {
    expect(parseSaverMinutes('0')).toBe(0);
    expect(parseSaverMinutes('1')).toBe(1);
    expect(parseSaverMinutes('5')).toBe(5);
    expect(parseSaverMinutes(null)).toBe(5);
    expect(parseSaverMinutes('7')).toBe(5);
  });
});

describe('shouldStartSaver', () => {
  it('starts after the chosen idle time while music plays and nothing blocks it', () => {
    expect(shouldStartSaver(60000, 1, true, false)).toBe(true);
    expect(shouldStartSaver(59999, 1, true, false)).toBe(false);
    expect(shouldStartSaver(600000, 0, true, false)).toBe(false);
    expect(shouldStartSaver(600000, 5, false, false)).toBe(false);
    expect(shouldStartSaver(600000, 5, true, true)).toBe(false);
  });
});

describe('driftPosition', () => {
  it('places the box inside the area', () => {
    expect(driftPosition(0.5, 0.5, 400, 800, 100, 200)).toEqual({ x: 150, y: 300 });
    expect(driftPosition(0.9, 0.9, 50, 50, 100, 100)).toEqual({ x: 0, y: 0 });
  });
});

describe('marqueeTiming', () => {
  it('shifts past the overflow with a margin and never runs too fast', () => {
    expect(marqueeTiming(100)).toEqual({ shift: -108, seconds: 8 });
    expect(marqueeTiming(10)).toEqual({ shift: -18, seconds: 6 });
  });
});

describe('songFacts', () => {
  it('lists the card facts in order', () => {
    expect(
      songFacts({ year: '1824', key: 'D major', tempo: 112, time: [4, 4] }, 'Classics', 'Orchestral', 109.4),
    ).toEqual([
      ['Year', '1824'],
      ['Category', 'Classics'],
      ['Style', 'Orchestral'],
      ['Key', 'D major'],
      ['Tempo', '112 BPM'],
      ['Time', '4/4'],
      ['Length', '1:49'],
    ]);
  });
});

describe('flashStep', () => {
  it('starts a flash on a kick and fades it out', () => {
    const first = flashStep(Number.NEGATIVE_INFINITY, 10, true);
    expect(first).toEqual({ start: 10, level: FLASH_PEAK });
    expect(flashStep(10, 10 + FLASH_FADE / 2, false).level).toBeCloseTo(FLASH_PEAK / 2);
    expect(flashStep(10, 10 + FLASH_FADE, false).level).toBe(0);
  });

  it('allows at most three flashes a second', () => {
    expect(flashStep(10, 10.2, true).start).toBe(10);
    expect(flashStep(10, 10 + FLASH_MIN_GAP, true).start).toBe(10 + FLASH_MIN_GAP);
    expect(FLASH_MIN_GAP).toBeGreaterThanOrEqual(1 / 3);
  });

  it('stays dim enough to stay under the WCAG flash threshold', () => {
    expect(FLASH_PEAK).toBeLessThanOrEqual(0.06);
    expect(flashStep(Number.NEGATIVE_INFINITY, 5, false).level).toBe(0);
  });
});

describe('laneLabels', () => {
  it('keeps unique instrument names as they are', () => {
    expect(laneLabels(['Acid', 'Sub bass'], ['lead', 'bass'])).toEqual(['Acid', 'Sub bass']);
  });

  it('adds the track id to every lane that shares an instrument', () => {
    expect(laneLabels(['909 kit', 'Acid', '909 kit'], ['drums', 'acid', 'cymbals'])).toEqual([
      '909 kit · drums',
      'Acid',
      '909 kit · cymbals',
    ]);
  });
});

describe('style filter', () => {
  const categories: Category[] = ['classics', 'originals', 'originals', 'originals'];
  const styles: StyleId[] = ['orchestral', 'synthwave', 'lofi', 'lofi'];

  it('narrows a preset to one home style', () => {
    expect(stationsIn(categories, 'originals', styles, 'lofi')).toEqual([2, 3]);
    expect(stationsIn(categories, 'all', styles, 'orchestral')).toEqual([0]);
    expect(stationsIn(categories, 'originals', styles, 'all')).toEqual([1, 2, 3]);
  });

  it('lists the styles a preset has, in style order', () => {
    expect(stylesIn(categories, styles, 'originals')).toEqual(['synthwave', 'lofi']);
    expect(stylesIn(categories, styles, 'all')).toEqual(['synthwave', 'orchestral', 'lofi']);
  });

  it('cycles all, each style, then all again', () => {
    expect(nextStyleFilter('all', ['synthwave', 'lofi'])).toBe('synthwave');
    expect(nextStyleFilter('synthwave', ['synthwave', 'lofi'])).toBe('lofi');
    expect(nextStyleFilter('lofi', ['synthwave', 'lofi'])).toBe('all');
    expect(nextStyleFilter('techno', ['synthwave', 'lofi'])).toBe('all');
    expect(nextStyleFilter('all', [])).toBe('all');
  });

  it('reads a stored style filter', () => {
    expect(parseStyleFilter('lofi')).toBe('lofi');
    expect(parseStyleFilter(null)).toBe('all');
    expect(parseStyleFilter('jazz')).toBe('all');
  });
});

describe('shownComposer', () => {
  const original = (composer: string) => shownComposer({ composer, source: 'original' });

  it('shows model families without versions', () => {
    expect(original('Gemini 3.8 Flash & SZ')).toBe('Gemini & SZ');
    expect(original('Qwen3.8 Flash & SZ')).toBe('Qwen & SZ');
    expect(original('DeepSeek V4 Flash & SZ')).toBe('DeepSeek & SZ');
    expect(original('GPT-6.1-sol & SZ')).toBe('GPT & SZ');
    expect(original('MiMo v2.6 Pro & SZ')).toBe('MiMo & SZ');
    expect(original('MiniMax M3.1 Flash & SZ')).toBe('MiniMax & SZ');
    expect(original('Tencent HY 4, Claude & SZ')).toBe('HY, Claude & SZ');
    expect(original('GLM, Claude & SZ')).toBe('GLM, Claude & SZ');
  });

  it('leaves public-domain composers and unknown names alone', () => {
    expect(shownComposer({ composer: 'Claude Debussy', source: 'public-domain' })).toBe('Claude Debussy');
    expect(original('Someone New 2 & SZ')).toBe('Someone New 2 & SZ');
  });

  it('shows no version numbers on any original in the library', () => {
    for (const { song } of LIBRARY) {
      if (song.meta.source === 'original') expect(shownComposer(song.meta), song.meta.title).not.toMatch(/\d/);
    }
  });
});
