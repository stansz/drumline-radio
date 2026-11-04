import { describe, expect, it } from 'vitest';
import fixture from './fixtures/features.song?raw';
import { parseSong } from '../src/song';
import type { Song } from '../src/song';
import { barAt, buildTimeline, notesBetween, secondsToTick, tickToSeconds } from '../src/timing';

function fixtureSong(): Song {
  const result = parseSong(fixture);
  if (!result.ok) throw new Error(`fixture failed to parse: ${result.errors.join('; ')}`);
  return result.song;
}

describe('tickToSeconds', () => {
  it('walks the tempo changes', () => {
    const song = fixtureSong();
    const cases: [number, number][] = [
      [0, 0],
      [960, 0.5],
      [4800, 2.5],
      [8640, 4.9],
      [12480, 6.9],
      [15360, 8.185714],
    ];
    for (const [tick, seconds] of cases) {
      expect(tickToSeconds(song, tick)).toBeCloseTo(seconds, 6);
    }
  });
});

describe('secondsToTick', () => {
  it('inverts the timeline and clamps', () => {
    const song = fixtureSong();
    expect(secondsToTick(song, 0.25)).toBeCloseTo(480, 6);
    expect(secondsToTick(song, 4.9)).toBeCloseTo(8640, 6);
    expect(secondsToTick(song, 100)).toBeCloseTo(15360, 6);
    expect(secondsToTick(song, -1)).toBeCloseTo(0, 6);
  });
});

describe('barAt', () => {
  it('finds the bar that holds a tick', () => {
    const song = fixtureSong();
    expect(barAt(song, 9000).number).toBe(3);
    expect(barAt(song, 99999).number).toBe(4);
  });
});

describe('buildTimeline', () => {
  it('schedules every note', () => {
    const song = fixtureSong();
    const timeline = buildTimeline(song);
    expect(timeline.duration).toBeCloseTo(8.185714, 6);
    expect(timeline.notes.length).toBe(41);
  });
});

describe('notesBetween', () => {
  it('returns the notes starting in the window', () => {
    const song = fixtureSong();
    const timeline = buildTimeline(song);
    const opening = notesBetween(timeline, 0, 0.5);
    expect(opening.length).toBe(2);
    expect(opening.map((note) => note.track)).toEqual([0, 2]);
    expect(opening[0].start).toBeCloseTo(0, 6);
    expect(opening[1].start).toBeCloseTo(0, 6);
    expect(opening[0].duration).toBeCloseTo(0.5, 6);
  });

  it('finds the staccato note', () => {
    const timeline = buildTimeline(fixtureSong());
    const found = notesBetween(timeline, 5.39, 5.41);
    const staccato = found.find((note) => note.track === 0 && note.pitches[0] === 76);
    expect(staccato).toBeDefined();
    expect(staccato?.start).toBeCloseTo(5.4, 6);
    expect(staccato?.duration).toBeCloseTo(0.25, 6);
  });

  it('gives the tied note its cross-tempo length', () => {
    const timeline = buildTimeline(fixtureSong());
    const tied = timeline.notes.find(
      (note) => note.track === 0 && note.pitches.length === 1 && note.pitches[0] === 77,
    );
    expect(tied).toBeDefined();
    expect(tied?.start).toBeCloseTo(5.9, 6);
    expect(tied?.duration).toBeCloseTo(1.428571, 6);
  });

  it('is empty past the end', () => {
    const timeline = buildTimeline(fixtureSong());
    expect(notesBetween(timeline, 8.2, 9)).toEqual([]);
  });
});
