import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/music/library';
import { buildTimeline } from '../src/music/timing';
import type { Note } from '../src/music/song';

const song = LIBRARY.find((entry) => entry.id === 'signal-fire')!.song;
const text = readFileSync(new URL('../src/songs/signal-fire.song', import.meta.url), 'utf8');
const form = [...text.matchAll(/^# Form (\d+)-(\d+): (\w+)/gm)].map((match) => ({
  first: Number(match[1]),
  last: Number(match[2]),
  section: match[3],
}));
// One chord a bar: F# minor, D, A, E.
const chords = ['F#m', 'D', 'A', 'E'];
const chordTones: Record<string, number[]> = {
  'F#m': [6, 9, 1],
  D: [2, 6, 9],
  A: [9, 1, 4],
  E: [4, 8, 11],
};
const chordOfBar = (number: number) => chords[(number - 1) % 4];

const track = (id: string) => song.tracks.find((part) => part.id === id)!;
const inBars = (id: string, first: number, last: number): Note[] => {
  const start = song.bars[first - 1].startTick;
  const end = song.bars[last - 1].startTick + song.bars[last - 1].ticks;
  return track(id).notes.filter((note) => note.tick >= start && note.tick < end);
};
const kicks = (first: number, last: number) =>
  inBars('drums', first, last).filter((note) => note.pitches.includes(36));

describe('Signal Fire', () => {
  it('is a credited Techno original with the intended length, roles and instruments', () => {
    expect(song.meta).toMatchObject({
      title: 'Signal Fire',
      composer: 'MiniMax M3.1 Flash & SZ',
      source: 'original',
      category: 'originals',
      style: 'techno',
      key: 'F# minor',
      tempo: 132,
      hidden: false,
    });
    expect(song.meta.time).toEqual([4, 4]);
    expect(song.bars).toHaveLength(136);
    expect(buildTimeline(song).duration).toBeCloseTo(247.272727, 4);
    expect(song.tracks.map((part) => part.id)).toEqual([
      'hook', 'hookup', 'stabs', 'pad', 'bass', 'riser', 'drums', 'claps',
    ]);
    expect(song.tracks.map((part) => part.role)).toEqual([
      'lead', 'lead2', 'chords', 'pad', 'bass', 'counter', 'drums', 'drums',
    ]);
    // The hook and its octave-up double are the same bank voice in every style.
    expect(track('hook').inst).toBe('bank:vox-lead');
    expect(track('hookup').inst).toBe('bank:vox-lead');
    // Everything else follows the Techno style's own patches.
    expect(['stabs', 'pad', 'bass', 'riser', 'drums', 'claps'].map((id) => track(id).inst)).toEqual(
      [null, null, null, null, null, null],
    );
  });

  it('covers the whole form in order', () => {
    expect(form.map((section) => section.section)).toEqual([
      'intro', 'groove', 'breakdown1', 'build1', 'drop1', 'breakdown2', 'build2', 'drop2', 'outro',
    ]);
    let next = 1;
    for (const section of form) {
      expect(section.first).toBe(next);
      next = section.last + 1;
    }
    expect(next).toBe(song.bars.length + 1);
  });

  it('gives the hook to the breakdowns and the drops, and takes it out of the intro and outro', () => {
    expect(inBars('hook', 1, 32)).toHaveLength(0);
    expect(inBars('hook', 121, 136)).toHaveLength(0);
    for (const [first, last] of [[33, 48], [57, 72], [73, 80], [89, 120]]) {
      expect(inBars('hook', first, last).length).toBeGreaterThan(0);
    }
    // The octave-up double only joins for the last 16 bars of the final drop.
    expect(inBars('hookup', 1, 104)).toHaveLength(0);
    expect(inBars('hookup', 105, 120).length).toBeGreaterThan(0);
    expect(inBars('hookup', 121, 136)).toHaveLength(0);
  });

  it('drops the kick in the breakdowns and keeps it dead on the grid', () => {
    for (const [first, last] of [[33, 48], [73, 80]]) {
      expect(kicks(first, last)).toHaveLength(0);
      expect(inBars('drums', first, last).length).toBeGreaterThan(0);
    }
    for (const [first, last] of [[17, 32], [57, 72], [89, 120], [121, 136]]) {
      expect(kicks(first, last).length).toBeGreaterThan(0);
      expect(kicks(first, last).every((note) => note.offset === undefined)).toBe(true);
    }
  });

  it('keeps every pitched part on its bar chord', () => {
    for (const id of ['hook', 'stabs', 'pad', 'bass']) {
      for (let number = 1; number <= song.bars.length; number += 1) {
        const bar = song.bars[number - 1];
        const tones = chordTones[chordOfBar(number)];
        for (const note of track(id).notes.filter(
          (part) => part.tick >= bar.startTick && part.tick < bar.startTick + bar.ticks,
        )) {
          for (const pitch of note.pitches) {
            expect(tones, `${id}, bar ${number}, MIDI ${pitch}`).toContain(pitch % 12);
          }
        }
      }
    }
  });

  it('puts the sub bass on the roots, off the beat, under the kick', () => {
    for (const [first, last] of [[5, 32], [33, 48], [57, 72], [89, 120], [121, 136]]) {
      for (const note of inBars('bass', first, last)) {
        const bar = song.bars.find((one) => note.tick >= one.startTick && note.tick < one.startTick + one.ticks)!;
        const root = { 'F#m': 6, D: 2, A: 9, E: 4 }[chordOfBar(bar.number)];
        expect(note.pitches[0] % 12).toBe(root);
        // Every bass note is an eighth or a sixteenth, never on the beat itself.
        expect([240, 480].includes(note.ticks)).toBe(true);
        const beat = (note.tick - bar.startTick) % 960;
        expect(beat).not.toBe(0);
      }
    }
  });

  it('puts the claps on 2 and 4 and the hats off the beat, with the micro-timing varied', () => {
    const claps = inBars('claps', 89, 120).filter((note) => note.pitches.includes(39));
    expect(claps.length).toBe(64);
    for (const clap of claps) {
      const bar = song.bars.find((one) => clap.tick >= one.startTick && clap.tick < one.startTick + one.ticks)!;
      const at = clap.tick - bar.startTick;
      expect([960, 2880]).toContain(at);
      // The claps are dragged a little behind the beat.
      expect(clap.offset).toBeGreaterThan(0);
    }
    const hats = inBars('drums', 89, 120).filter((note) => note.pitches.includes(42));
    expect(hats.length).toBeGreaterThan(100);
    expect(hats.every((hat) => hat.offset !== undefined && hat.offset < 0)).toBe(true);
    expect(new Set(hats.map((hat) => hat.velocity)).size).toBeGreaterThan(5);
  });

  it('keeps the hook phrase the same in every drop, and an octave higher in the double', () => {
    const phrase = (id: string, first: number) =>
      inBars(id, first, first + 3).map((note) => ({
        tick: note.tick - song.bars[first - 1].startTick,
        ticks: note.ticks,
        pitches: note.pitches,
      }));
    expect(phrase('hook', 57)).toEqual(phrase('hook', 89));
    expect(phrase('hook', 105)).toEqual(phrase('hook', 57));
    expect(phrase('hookup', 105)).toEqual(
      phrase('hook', 57).map((note) => ({
        ...note,
        pitches: note.pitches.map((pitch) => pitch + 12),
      })),
    );
  });

  it('builds the snare roll faster and louder into each drop', () => {
    for (const [first, last] of [[49, 56], [81, 88]]) {
      const snares = inBars('drums', first, last).filter((note) => note.pitches.includes(38));
      const inBar = (number: number) => snares.filter((note) => {
        const bar = song.bars[number - 1];
        return note.tick >= bar.startTick && note.tick < bar.startTick + bar.ticks;
      });
      expect(inBar(first).length).toBeLessThan(inBar(last).length);
      expect(inBar(last).length).toBe(16);
      const mean = (notes: Note[]) => notes.reduce((sum, note) => sum + note.velocity, 0) / notes.length;
      expect(mean(inBar(last))).toBeGreaterThan(mean(inBar(first)));
    }
    // The riser climbs through both builds.
    expect(inBars('riser', 49, 56).length).toBeGreaterThan(0);
    expect(inBars('riser', 81, 88).length).toBeGreaterThan(0);
    expect(inBars('riser', 49, 56).at(-1)!.pitches[0]).toBeGreaterThan(inBars('riser', 49, 56)[0].pitches[0]);
  });
});
