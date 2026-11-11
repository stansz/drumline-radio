import { describe, expect, it } from 'vitest';
import fixture from './fixtures/features.song?raw';
import { parseSong } from '../src/music/song';
import type { Song } from '../src/music/song';
import { barAt, buildTimeline, notesBetween, secondsToTick, tickToSeconds, VOLUME_GLIDE, volumeAt, volumeCurve } from '../src/music/timing';

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

describe('micro-timing offsets', () => {
  const HEADER = [
    'title: T',
    'composer: original',
    'year: 2026',
    'source: original',
    'category: originals',
    'style: chiptune',
    'key: C major',
    'tempo: 60',
    'time: 4/4',
  ].join('\n');

  function timelineFor(body: string) {
    const result = parseSong(`${HEADER}\n${body}`);
    if (!result.ok) throw new Error(`failed to parse: ${result.errors.join('; ')}`);
    return buildTimeline(result.song);
  }

  // At 60 BPM one quarter is 1 s and one tick is 1/960 s.
  it('pushes a start later and shortens the note', () => {
    const timeline = timelineFor('track a role=lead\n| C4/4 C4/4+96 r/2 |');
    const shifted = timeline.notes.filter((note) => note.pitches[0] === 60)[1];
    expect(shifted.start).toBeCloseTo(1.1, 6);
    expect(shifted.duration).toBeCloseTo(0.9, 6);
  });

  it('pulls a start earlier and lengthens the note', () => {
    const timeline = timelineFor('track a role=lead\n| C4/4 C4/4-96 r/2 |');
    const shifted = timeline.notes.filter((note) => note.pitches[0] === 60)[1];
    expect(shifted.start).toBeCloseTo(0.9, 6);
    expect(shifted.duration).toBeCloseTo(1.1, 6);
  });

  it('halves the remaining length when staccato', () => {
    const timeline = timelineFor("track a role=lead\n| C4/4 C4/4'+96 r/2 |");
    const shifted = timeline.notes.filter((note) => note.pitches[0] === 60)[1];
    expect(shifted.duration).toBeCloseTo(0.45, 6);
  });

  it('never sounds for less than the minimum length', () => {
    const timeline = timelineFor('track a role=lead\n| C4/4 C4/32+120 r/2 r/8 r/16 r/32 |');
    const shifted = timeline.notes.filter((note) => note.pitches[0] === 60)[1];
    expect(shifted.duration).toBeCloseTo(0.01, 6);
  });

  it('clamps a start before zero', () => {
    const timeline = timelineFor('track a role=lead\n| C4/4-96 r/4 C4/2 |');
    const first = timeline.notes.find((note) => note.start === 0);
    expect(first).toBeDefined();
    expect(first?.start).toBe(0);
  });

  it('measures a bend from the shifted start', () => {
    const timeline = timelineFor('track a role=lead\n| G4/4+96^ A4/4 r/2 |');
    const bent = timeline.notes.find((note) => note.track === 0);
    expect(bent?.bends).toEqual([{ time: 0.9, pitch: 69 }]);
  });

  it('lets notesBetween find an early note', () => {
    const timeline = timelineFor('track a role=lead\n| C4/4 C4/4-96 r/2 |');
    const found = notesBetween(timeline, 0.85, 0.95);
    expect(found.some((note) => note.pitches[0] === 60)).toBe(true);
  });

  it('keeps the timeline sorted by start across tracks', () => {
    const timeline = timelineFor(
      'track a role=lead\n| r/2 C4/2 |\ntrack b role=lead\n| r/2 C4/2-96 |',
    );
    const starts = timeline.notes.map((note) => note.start);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(starts[0]).toBeCloseTo(1.9, 6);
    expect(starts[1]).toBeCloseTo(2, 6);
  });
});

describe('bend times', () => {
  const HEADER = [
    'title: T',
    'composer: original',
    'year: 2026',
    'source: original',
    'category: originals',
    'style: chiptune',
    'key: C major',
    'tempo: 120',
    'time: 4/4',
  ].join('\n');

  function timelineFor(body: string) {
    const result = parseSong(`${HEADER}\n${body}`);
    if (!result.ok) throw new Error(`failed to parse: ${result.errors.join('; ')}`);
    return buildTimeline(result.song);
  }

  it('measures a bend from the note start in seconds', () => {
    const timeline = timelineFor('track a role=lead\n| G4/2^ A4/2 |');
    const bent = timeline.notes.find((note) => note.track === 0);
    expect(bent?.bends).toEqual([{ time: 1, pitch: 69 }]);
  });

  it('leaves unbent notes without a bends key', () => {
    const timeline = timelineFor('track a role=lead\n| G4/1 |');
    const plain = timeline.notes.find((note) => note.track === 0);
    expect(plain).toBeDefined();
    expect(plain?.bends).toBeUndefined();
    expect('bends' in (plain as object)).toBe(false);
  });
});

describe('volume curves', () => {
  // 4/4 at 120 BPM with no pickup: every bar is 2 seconds, so bar N starts at 2 * (N - 1).
  function song(volume: string): Song {
    const bars = Array.from({ length: 8 }, () => '| C4/1 |').join('\n');
    const text = `title: T\ncomposer: original\nyear: 2026\nsource: original\ncategory: originals\nstyle: chiptune\nkey: C major\ntempo: 120\ntime: 4/4\ntrack a role=lead ${volume}\n${bars}`;
    const result = parseSong(text);
    if (!result.ok) throw new Error(result.errors.join('; '));
    return result.song;
  }
  const at = (volume: string, seconds: number): number => {
    const s = song(volume);
    return volumeAt(volumeCurve(s, s.tracks[0].volumeChanges), seconds);
  };

  it('is 1 everywhere with no changes', () => {
    expect(volumeCurve(song(''))).toEqual([]);
    expect(at('', 5)).toBe(1);
  });

  it('holds until a step, glides briefly, then holds the new level', () => {
    expect(at('vol@3=0.5', 3.9)).toBe(1);
    expect(at('vol@3=0.5', 4 + VOLUME_GLIDE / 2)).toBeCloseTo(0.75, 6);
    expect(at('vol@3=0.5', 4 + VOLUME_GLIDE)).toBe(0.5);
    expect(at('vol@3=0.5', 15)).toBe(0.5);
  });

  it('ramps from the start of its first bar to the end of its last', () => {
    // vol@3-4 runs from 4 s to 8 s.
    expect(at('vol@3-4=1..0', 4)).toBe(1);
    expect(at('vol@3-4=1..0', 6)).toBeCloseTo(0.5, 6);
    expect(at('vol@3-4=1..0', 8)).toBe(0);
    expect(at('vol@3-4=1..0', 12)).toBe(0);
  });

  it('starts a fade-in from bar 1 silent, with no glide from full volume', () => {
    expect(at('vol@1-2=0..1', 0)).toBe(0);
    expect(at('vol@1-2=0..1', 2)).toBeCloseTo(0.5, 6);
    expect(at('vol@1-2=0..1', 4)).toBe(1);
  });

  it('starts a later ramp at its own bar, not from the point before it', () => {
    // Step to 0.5 at bar 2 (2 s), then ramp 0.5 -> 1 across bars 5-6 (8 s to 12 s).
    expect(at('vol@2=0.5 vol@5-6=0.5..1', 7)).toBe(0.5);
    expect(at('vol@2=0.5 vol@5-6=0.5..1', 8)).toBe(0.5);
    expect(at('vol@2=0.5 vol@5-6=0.5..1', 10)).toBeCloseTo(0.75, 6);
  });

  it('glides into a ramp that starts away from the current level', () => {
    expect(at('vol@3-4=0.2..1', 3.9)).toBe(1);
    expect(at('vol@3-4=0.2..1', 4 + VOLUME_GLIDE)).toBeCloseTo(0.2, 6);
    expect(at('vol@3-4=0.2..1', 8)).toBe(1);
  });
});
