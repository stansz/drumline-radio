import { describe, expect, it } from 'vitest';
import fixture from './fixtures/features.song?raw';
import { parseSong } from '../src/song';
import type { Song } from '../src/song';
import { formatTime, laneLayout, nearestStation, noteY, prevAction, stationLabel } from '../src/view';

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
  it('walks the tuner frequency', () => {
    expect(stationLabel(0)).toBe('88.1');
    expect(stationLabel(3)).toBe('94.7');
  });
});

describe('prevAction', () => {
  it('restarts once the song is under way', () => {
    expect(prevAction(4)).toBe('restart');
    expect(prevAction(3)).toBe('previous');
    expect(prevAction(0)).toBe('previous');
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
