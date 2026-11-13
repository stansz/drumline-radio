import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/music/library';
import { buildTimeline } from '../src/music/timing';
import type { Note } from '../src/music/song';

// Only this song: its header, its form, and its notes. Nothing here asserts anything about the
// Orchestral style, the instrument bank, or the arranger, so changes elsewhere never fail it.
const song = LIBRARY.find((entry) => entry.id === 'the-black-coach')!.song;
const track = (id: string) => song.tracks.find((part) => part.id === id)!;

/** The notes of a track in bars `first` to `last`, both counted from 1. */
function inBars(id: string, first: number, last: number): Note[] {
  const from = song.bars[first - 1].startTick;
  const to = song.bars[last - 1].startTick + song.bars[last - 1].ticks;
  return track(id).notes.filter((note) => note.tick >= from && note.tick < to);
}

/** How many bars of a span a track sounds in. */
function barsSounded(id: string, first: number, last: number): number {
  const from = song.bars[first - 1].startTick;
  return new Set(inBars(id, first, last).map((note) =>
    Math.floor((note.tick - from) / song.bars[first - 1].ticks))).size;
}

describe('The Black Coach', () => {
  it('is a credited G-minor Orchestral original in 3/4 at 144', () => {
    expect(song.meta).toMatchObject({
      title: 'The Black Coach',
      composer: 'Arena Agent & SZ',
      source: 'original',
      category: 'originals',
      style: 'orchestral',
      key: 'G minor to B-flat major',
      tempo: 144,
      time: [3, 4],
      year: '2026',
    });
    expect(song.meta.about).toContain('scherzo');
  });

  it('runs 168 bars of 3/4 and a coda that speeds up', () => {
    expect(song.bars).toHaveLength(168);
    for (const bar of song.bars) expect(bar.time).toEqual([3, 4]);
    expect(song.bars[0].tempo).toBe(144);
    expect(song.bars[152].tempo).toBeGreaterThan(144);
    expect(song.bars[167].tempo).toBe(186);
    const timeline = buildTimeline(song);
    expect(timeline.duration).toBeGreaterThan(200);
    expect(timeline.duration).toBeLessThan(215);
  });

  it('gives each part the role and instrument the form asks for', () => {
    expect(song.tracks.map((part) => [part.id, part.role, part.inst])).toEqual([
      ['violins', 'lead', 'strings'],
      ['horns', 'lead2', 'brass'],
      ['flute', 'counter', null],
      ['pizzicato', 'arp', 'pizzicato'],
      ['harp', 'chords', null],
      ['glockenspiel', 'arp', null],
      ['strings', 'pad', null],
      ['cellos', 'bass', null],
      ['timpani', 'drums', null],
    ]);
  });

  it('opens with timpani and pizzicato alone', () => {
    expect(inBars('pizzicato', 1, 8).length).toBeGreaterThan(30);
    expect(inBars('timpani', 1, 8).length).toBeGreaterThan(15);
    for (const id of ['violins', 'horns', 'flute']) expect(inBars(id, 1, 8)).toHaveLength(0);
  });

  it('drives the scherzo on six pizzicato eighths a bar', () => {
    for (let bar = 9; bar <= 24; bar += 1) {
      const notes = inBars('pizzicato', bar, bar);
      expect(notes).toHaveLength(6);
      expect(new Set(notes.map((note) => note.velocity)).size).toBeGreaterThan(1);
    }
  });

  it('states theme A on the horns, then an octave higher on the violins', () => {
    const horns = inBars('horns', 9, 16).map((note) => note.pitches[0]);
    const violins = inBars('violins', 25, 32).map((note) => note.pitches[0]);
    expect(horns).toHaveLength(36);
    expect(violins).toEqual(horns.map((pitch) => pitch + 12));
    // The violins answer, not double, the horns in the first statement.
    expect(inBars('violins', 9, 11)).toHaveLength(0);
  });

  it('keeps the theme in fragments and leaves bars of silence in the development', () => {
    const violins = inBars('violins', 41, 48);
    expect(violins.length).toBeLessThan(20);
    expect(barsSounded('violins', 41, 48)).toBe(4);
    expect(barsSounded('horns', 41, 48)).toBe(4);
    // The hocket: bar 57 is a single hit, bar 58 belongs to the horns.
    expect(inBars('violins', 57, 57)).toHaveLength(1);
    expect(inBars('horns', 57, 57)).toHaveLength(0);
    expect(inBars('horns', 58, 58).map((note) => note.pitches)).toEqual([[63, 67, 70]]);
  });

  it('stops the ostinato dead for the trio and hands it to the flute', () => {
    expect(inBars('pizzicato', 73, 104)).toHaveLength(0);
    expect(inBars('violins', 73, 88)).toHaveLength(0);
    const flute = inBars('flute', 73, 88);
    expect(flute.length).toBeGreaterThan(50);
    expect(flute[0].tick).toBe(song.bars[72].startTick);
    // The trio turns to the relative major: the flute sits on B-flat's tones.
    expect(flute[0].pitches[0] % 12).toBe(5); // F, the fifth of Bb
    // Soft harp and a sustained pad underneath it.
    expect(barsSounded('harp', 73, 88)).toBe(16);
    // Two rolled chords a bar, four notes the first time and the top voices again the second.
    expect(inBars('harp', 73, 88)).toHaveLength(32);
    expect(barsSounded('strings', 73, 88)).toBe(16);
    expect(inBars('glockenspiel', 73, 104)).toHaveLength(0);
  });

  it('keeps the pad and the lead apart in level and register', () => {
    const pad = inBars('strings', 121, 128).flatMap((note) => note.pitches);
    const lead = inBars('violins', 121, 128).flatMap((note) => note.pitches);
    expect(Math.min(...lead)).toBeGreaterThan(Math.max(...pad));
  });

  it('rolls the timpani into section changes and never swings', () => {
    // A roll is six eighths in one bar; the phrase ends at 16 and 24 have one.
    for (const bar of [8, 16, 24, 32, 40, 48, 64, 72, 120, 152, 167]) {
      expect(inBars('timpani', bar, bar)).toHaveLength(6);
    }
    // Horns lean late on a bar's first beat and sway across the beat inside it.
    const horns = inBars('horns', 9, 24);
    const firsts = horns.filter((note) => note.tick === (Math.floor(note.tick / 2880) * 2880));
    expect(firsts.length).toBeGreaterThan(10);
    for (const note of firsts) expect(note.offset ?? 0).toBeGreaterThan(0);
    expect(horns.some((note) => (note.offset ?? 0) < 0)).toBe(true);
    for (const note of horns) expect(Math.abs(note.offset ?? 0)).toBeLessThanOrEqual(24);
  });

  it('ends on one hit of G minor', () => {
    const last = song.bars[167];
    for (const id of ['violins', 'horns', 'cellos', 'pizzicato', 'timpani']) {
      const notes = track(id).notes.filter((note) => note.tick === last.startTick);
      expect(notes.length, id).toBeGreaterThan(0);
      expect(notes[0].ticks).toBe(last.ticks);
    }
    const violins = track('violins').notes.filter((note) => note.tick === last.startTick)[0];
    expect(violins.pitches.map((pitch) => pitch % 12).sort()).toEqual([2, 7, 7]);
  });
});
