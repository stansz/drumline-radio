import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/music/library';
import { buildTimeline } from '../src/music/timing';
import type { Note } from '../src/music/song';

const song = LIBRARY.find((entry) => entry.id === 'exit-sign')!.song;
const text = readFileSync(new URL('../src/songs/exit-sign.song', import.meta.url), 'utf8');
const progressions = Object.fromEntries(
  [...text.matchAll(/^# Chords (\w+): (.+)$/gm)].map((match) => [match[1], match[2].split(' | ')]),
);
const form = [...text.matchAll(/^# Form (\d+)-(\d+): (\w+) - /gm)].map((match) => ({
  first: Number(match[1]),
  last: Number(match[2]),
  progression: match[3],
}));
const chordTones: Record<string, number[]> = {
  G: [7, 11, 2], C: [0, 4, 7], D: [2, 6, 9], Em: [4, 7, 11], Am: [9, 0, 4],
};
const track = (id: string) => song.tracks.find((part) => part.id === id)!;
const inBars = (id: string, first: number, last: number): Note[] => {
  const start = song.bars[first - 1].startTick;
  const end = song.bars[last - 1].startTick + song.bars[last - 1].ticks;
  return track(id).notes.filter((note) => note.tick >= start && note.tick < end);
};

function signature(id: string, first: number, last: number) {
  const start = song.bars[first - 1].startTick;
  return inBars(id, first, last).map((note) => ({
    tick: note.tick - start,
    ticks: note.ticks,
    pitches: note.pitches,
  }));
}

describe('Exit Sign', () => {
  it('is a credited Alt rock original with the intended length and roles', () => {
    expect(song.meta).toMatchObject({
      title: 'Exit Sign', composer: 'GPT-6.1-sol & SZ', source: 'original',
      category: 'originals', style: 'altrock', key: 'G major', tempo: 152, hidden: false,
    });
    expect(song.bars).toHaveLength(112);
    expect(buildTimeline(song).duration).toBeCloseTo(176.842105, 5);
    expect(song.tracks).toHaveLength(7);
    expect(song.tracks.every((part) => part.inst === null)).toBe(true);
    // Roles only, not patch names, so a change to the Alt rock style doesn't fail this song's test.
    expect(song.tracks.map((part) => part.role)).toEqual([
      'lead', 'chords', 'pad', 'lead2', 'bass', 'drums', 'drums',
    ]);
  });

  it('covers the full form and keeps every pitched part on its annotated chord, including ties', () => {
    expect(form.map((section) => section.progression)).toEqual([
      'intro', 'verse', 'pre', 'chorus', 'verse', 'pre', 'chorus', 'bridge', 'chorus', 'chorus', 'outro',
    ]);
    let next = 1;
    for (const section of form) {
      expect(section.first).toBe(next);
      const chords = progressions[section.progression];
      expect(chords).toHaveLength(section.last - section.first + 1);
      for (let number = section.first; number <= section.last; number += 1) {
        const bar = song.bars[number - 1];
        const tones = chordTones[chords[number - section.first]];
        expect(tones).toBeDefined();
        for (const part of song.tracks.filter((part) => part.role !== 'drums')) {
          const sounding = part.notes.filter((note) => note.tick < bar.startTick + bar.ticks && note.tick + note.ticks > bar.startTick);
          for (const note of sounding) {
            for (const pitch of note.pitches) {
              expect(tones, `${part.id}, bar ${number}, MIDI ${pitch}`).toContain(pitch % 12);
            }
          }
        }
      }
      next = section.last + 1;
    }
    expect(next).toBe(song.bars.length + 1);
  });

  it('preserves the hook through its reprises and gives verse 2 different phrasing', () => {
    const hook = signature('melody', 29, 40);
    expect(signature('melody', 65, 76)).toEqual(hook);
    expect(signature('melody', 85, 96)).toEqual(hook);
    expect(signature('melody', 97, 107)).toEqual(signature('melody', 29, 39));
    expect(signature('melody', 41, 56)).not.toEqual(signature('melody', 5, 20));
  });

  it('leaves the verses sparse, opens the chorus, and really drops out in the bridge', () => {
    for (const [first, last] of [[5, 20], [41, 56]]) {
      expect(inBars('wall', first, last)).toHaveLength(0);
      const chugs = inBars('rhythm', first, last);
      expect(chugs.length).toBeGreaterThan(0);
      expect(chugs.every((note) => note.ticks === 480 && note.staccato)).toBe(true);
      expect(inBars('clean', first, last).length).toBeGreaterThan(0);
    }
    expect(inBars('wall', 29, 40)).toHaveLength(12);
    expect(inBars('wall', 29, 40).every((note) => note.ticks === 3840)).toBe(true);
    const meanVelocity = (notes: Note[]) => notes.reduce((sum, note) => sum + note.velocity, 0) / notes.length;
    expect(meanVelocity(inBars('melody', 29, 40))).toBeGreaterThan(meanVelocity(inBars('melody', 5, 20)) + 25);
    for (const id of ['bass', 'drums', 'cymbals', 'rhythm', 'wall']) {
      expect(inBars(id, 77, 78)).toHaveLength(0);
    }
    // The half-time backbeat is on beat three, not beats two and four.
    for (let number = 79; number <= 83; number += 1) {
      const snares = inBars('drums', number, number).filter((note) => note.pitches.includes(38));
      expect(snares).toHaveLength(1);
      expect(snares[0].tick - song.bars[number - 1].startTick).toBe(1920);
    }
  });

  it('locks bass roots to verse/chorus kicks and fills into every chorus', () => {
    for (const [first, last] of [[5, 20], [29, 39], [41, 56], [65, 75], [85, 95], [97, 107]]) {
      const bass = inBars('bass', first, last);
      expect(bass.every((note) => note.ticks === 480 && !note.offset)).toBe(true);
      for (const kick of inBars('drums', first, last).filter((note) => note.pitches.includes(36))) {
        expect(bass.some((note) => note.tick === kick.tick)).toBe(true);
      }
    }
    for (const number of [28, 64, 84, 96]) {
      const toms = inBars('drums', number, number).flatMap((note) => note.pitches).filter((pitch) => [41, 45, 50].includes(pitch));
      expect(toms.length).toBeGreaterThanOrEqual(3);
    }
    expect(inBars('cymbals', 5, 20).some((note) => note.pitches.includes(42))).toBe(true);
    expect(inBars('cymbals', 49, 56).some((note) => note.pitches.includes(51))).toBe(true);
    for (const first of [29, 65, 85, 97]) {
      expect(inBars('cymbals', first, first).some((note) => note.pitches.includes(49))).toBe(true);
      expect(inBars('cymbals', first, first + 11).some((note) => note.pitches.includes(46))).toBe(true);
    }
  });
});
