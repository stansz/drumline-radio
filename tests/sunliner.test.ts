import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/music/library';
import { buildTimeline } from '../src/music/timing';
import type { Note } from '../src/music/song';

// Only this song: its header, form, and notes. Nothing here asserts anything about the Synthwave
// style, the instrument bank, or the arranger, so changes elsewhere never fail it.
const song = LIBRARY.find((entry) => entry.id === 'sunliner')!.song;
const track = (id: string) => song.tracks.find((part) => part.id === id)!;
const inBars = (id: string, first: number, last: number): Note[] => {
  const start = song.bars[first - 1].startTick;
  const end = song.bars[last - 1].startTick + song.bars[last - 1].ticks;
  return track(id).notes.filter((note) => note.tick >= start && note.tick < end);
};
const shape = (id: string, first: number, last: number, transpose = 0) => {
  const start = song.bars[first - 1].startTick;
  return inBars(id, first, last).map((note) => ({
    tick: note.tick - start,
    ticks: note.ticks,
    offset: note.offset ?? 0,
    pitches: note.pitches.map((pitch) => pitch + transpose),
  }));
};
const barsPlayed = (id: string, first: number, last: number) => {
  const start = song.bars[first - 1].startTick;
  return new Set(inBars(id, first, last).map((note) => Math.floor((note.tick - start) / 3840)));
};

describe('Sunliner', () => {
  it('is a credited D major Synthwave original of the intended length', () => {
    expect(song.meta).toMatchObject({
      title: 'Sunliner',
      composer: 'Arena Agent & SZ',
      source: 'original',
      category: 'originals',
      style: 'synthwave',
      key: 'D major',
      tempo: 118,
      time: [4, 4],
    });
    expect(song.bars).toHaveLength(120);
    // 120 bars of 4/4 at 118 BPM, a little over four minutes.
    expect(buildTimeline(song).duration).toBeCloseTo((120 * 4 * 60) / 118, 4);
    expect(song.tracks.map((part) => part.id)).toEqual([
      'vox', 'saw', 'aah', 'ooh', 'pad', 'stabs', 'arp', 'bass', 'drums',
    ]);
    // The choirs are pad parts, the wordless lead is the lead, and the saw answers in lead2.
    expect(song.tracks.map((part) => part.role)).toEqual([
      'lead', 'lead2', 'pad', 'pad', 'pad', 'chords', 'arp', 'bass', 'drums',
    ]);
  });

  it("keeps the wordless hook in the vox lead's warm register, A3 to B4", () => {
    const pitches = track('vox').notes.flatMap((note) => note.pitches);
    expect(Math.min(...pitches)).toBeGreaterThanOrEqual(57); // A3
    expect(Math.max(...pitches)).toBeLessThanOrEqual(71); // B4, the peak of the last chorus
    // The chorus hook itself never reaches C5, where the patch starts to sound like a flute.
    const chorus = inBars('vox', 33, 48).flatMap((note) => note.pitches);
    expect(Math.max(...chorus)).toBeLessThanOrEqual(69); // A4
  });

  it('sings the last chorus a whole step above the first, note for note', () => {
    // Same hook, same rests, same microtiming; only the key moves.
    expect(shape('vox', 97, 112, -2)).toEqual(shape('vox', 33, 48));
    // The pad roots move with it, bar for bar.
    const roots = (first: number) =>
      Array.from({ length: 16 }, (_, i) => Math.min(...inBars('pad', first + i, first + i)[0].pitches));
    expect(roots(97)).toEqual(roots(33).map((root) => root + 2));
  });

  it('leaves the saw lead the bars the hook rests in, instead of doubling it', () => {
    for (const [first, last] of [[33, 48], [65, 80]]) {
      const vox = barsPlayed('vox', first, last);
      const saw = barsPlayed('saw', first, last);
      expect(saw.size).toBeGreaterThan(0);
      for (const bar of saw) expect(vox.has(bar), `bar ${first + bar}`).toBe(false);
    }
  });

  it('drops the kick and the bass for the breakdown while the choirs and pad hold', () => {
    // Nothing on the floor until the roll at bars 87-88 lifts back into the last chorus.
    expect(inBars('drums', 81, 86).filter((note) => note.pitches.includes(36))).toHaveLength(0);
    expect(inBars('drums', 87, 88).filter((note) => note.pitches.includes(36)).length).toBeGreaterThan(0);
    expect(inBars('bass', 81, 88)).toHaveLength(0);
    for (const id of ['aah', 'ooh', 'pad']) {
      const notes = inBars(id, 81, 88);
      expect(notes.length, id).toBeGreaterThanOrEqual(8);
      expect(notes.every((note) => note.ticks === 3840), id).toBe(true);
    }
    // The hook is still sung there, at half the pace and quieter than in the choruses.
    const mean = (notes: Note[]) => notes.reduce((sum, note) => sum + note.velocity, 0) / notes.length;
    expect(inBars('vox', 81, 84).length).toBeGreaterThan(0);
    expect(mean(inBars('vox', 81, 88))).toBeLessThan(mean(inBars('vox', 33, 48)));
  });

  it('keeps four on the floor under open hats on the off-beats and claps on two and four', () => {
    for (let number = 33; number <= 39; number += 1) {
      const bar = song.bars[number - 1];
      const at = (pitch: number) =>
        inBars('drums', number, number)
          .filter((note) => note.pitches.includes(pitch))
          .map((note) => note.tick - bar.startTick)
          .sort((a, b) => a - b);
      expect(at(36), `bar ${number} kick`).toEqual([0, 960, 1920, 2880]);
      expect(at(46), `bar ${number} open hat`).toEqual([480, 1440, 2400, 3360]);
      expect(at(39), `bar ${number} clap`).toEqual([960, 2880]);
    }
  });

  it('bounces the bass in octaves on eighths with the off-beats pushed early', () => {
    for (let number = 33; number <= 39; number += 1) {
      const bar = song.bars[number - 1];
      const bass = inBars('bass', number, number).sort((a, b) => a.tick - b.tick);
      expect(bass).toHaveLength(8);
      expect(bass.every((note) => note.ticks === 480)).toBe(true);
      expect(bass.map((note) => note.tick - bar.startTick)).toEqual([0, 480, 960, 1440, 1920, 2400, 2880, 3360]);
      for (let slot = 0; slot < 8; slot += 1) {
        const note = bass[slot];
        // Every note is the bar's root or its octave, and the octaves lean in.
        expect(note.pitches[0] % 12).toBe(bass[0].pitches[0] % 12);
        if (slot % 2 === 1) expect(note.offset, `bar ${number} slot ${slot}`).toBeLessThan(0);
      }
      expect(bass[1].pitches[0] - bass[0].pitches[0]).toBe(12);
    }
  });
});
