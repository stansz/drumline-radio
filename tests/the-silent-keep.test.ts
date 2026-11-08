import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/music/library';
import { buildTimeline } from '../src/music/timing';
import type { Note } from '../src/music/song';

const song = LIBRARY.find((entry) => entry.id === 'the-silent-keep')!.song;
const track = (id: string) => song.tracks.find((part) => part.id === id)!;
const inBars = (id: string, first: number, last: number): Note[] => {
  const start = song.bars[first - 1].startTick;
  const end = song.bars[last - 1].startTick + song.bars[last - 1].ticks;
  return track(id).notes.filter((note) => note.tick >= start && note.tick < end);
};

describe('The Silent Keep', () => {
  it('is a credited Cinematic original at the intended length', () => {
    expect(song.meta).toMatchObject({
      title: 'The Silent Keep',
      composer: 'DeepSeek V4 Flash & SZ',
      source: 'original',
      category: 'originals',
      style: 'cinematic',
      key: 'E minor',
      tempo: 70,
      hidden: false,
    });
    expect(song.bars).toHaveLength(194);
    const duration = buildTimeline(song).duration;
    expect(duration).toBeGreaterThan(360);
    expect(duration).toBeLessThan(370);
  });

  it('moves from the ballad tempo to the gallop, through 6/8, and back down', () => {
    expect(song.bars[0].tempo).toBe(70);
    expect(song.bars[28].tempo).toBe(152);
    expect(song.bars[84].tempo).toBe(160);
    expect(song.bars.slice(68, 84).every((bar) => bar.time[0] === 6 && bar.time[1] === 8)).toBe(true);
    expect(song.bars.slice(0, 68).every((bar) => bar.time[0] === 4 && bar.time[1] === 4)).toBe(true);
    expect(song.bars.slice(84).every((bar) => bar.time[0] === 4 && bar.time[1] === 4)).toBe(true);
    expect(song.bars[180].tempo).toBe(160);
    expect(song.bars[183].tempo).toBe(70);
    expect(song.bars[193].tempo).toBe(70);
  });

  it('gives the solo 48 bars, a call-and-response, and a bent high E', () => {
    const soloLead = inBars('lead', 101, 148);
    const barsWithLead = new Set(soloLead.map((note) => song.bars.findIndex((bar) => note.tick >= bar.startTick && note.tick < bar.startTick + bar.ticks)));
    expect(barsWithLead.size).toBeGreaterThanOrEqual(32);
    const bends = soloLead.flatMap((note) => note.bends ?? []);
    expect(bends.some((bend) => bend.pitch === 88)).toBe(true);
    expect(inBars('harmony', 119, 120).length).toBeGreaterThan(0);
    expect(inBars('harmony', 123, 124).length).toBeGreaterThan(0);
    expect(inBars('lead', 119, 120)).toHaveLength(0);
    expect(inBars('lead', 123, 124)).toHaveLength(0);
  });

  it('ends on a long E minor chord with the cello', () => {
    const cello = inBars('cello', 193, 194);
    expect(cello).toHaveLength(1);
    expect(cello[0].pitches).toEqual([52]);
    expect(cello[0].ticks).toBe(7680);
    const pitchClasses = new Set(
      ['piano', 'strings', 'cello']
        .flatMap((id) => inBars(id, 193, 194))
        .flatMap((note) => note.pitches)
        .map((pitch) => pitch % 12),
    );
    expect([...pitchClasses].sort((a, b) => a - b)).toEqual([4, 7, 11]);
  });
});
