import { TICKS_PER_QUARTER } from './song';
import type { BarInfo, Song } from './song';

export interface ScheduledNote {
  track: number;
  pitches: number[];
  velocity: number;
  start: number;
  duration: number;
  bends?: { time: number; pitch: number }[];
}

export interface Timeline {
  song: Song;
  duration: number;
  notes: ScheduledNote[];
}

function secondsPerTick(bar: BarInfo): number {
  return 60 / (bar.tempo * TICKS_PER_QUARTER);
}

export function tickToSeconds(song: Song, tick: number): number {
  const bars = song.bars;
  if (bars.length === 0 || tick <= 0) return 0;

  let seconds = 0;
  for (const bar of bars) {
    const barEnd = bar.startTick + bar.ticks;
    if (tick < barEnd) return seconds + (tick - bar.startTick) * secondsPerTick(bar);
    seconds += bar.ticks * secondsPerTick(bar);
  }

  const last = bars[bars.length - 1];
  return seconds + (tick - (last.startTick + last.ticks)) * secondsPerTick(last);
}

export function secondsToTick(song: Song, seconds: number): number {
  const bars = song.bars;
  if (bars.length === 0 || seconds <= 0) return 0;

  let elapsed = 0;
  for (const bar of bars) {
    const barSeconds = bar.ticks * secondsPerTick(bar);
    if (seconds < elapsed + barSeconds) {
      const tick = bar.startTick + (seconds - elapsed) / secondsPerTick(bar);
      return Math.min(Math.max(tick, 0), song.totalTicks);
    }
    elapsed += barSeconds;
  }

  return song.totalTicks;
}

export function barAt(song: Song, tick: number): BarInfo {
  const bars = song.bars;
  if (bars.length === 0) {
    return {
      number: 1,
      startTick: 0,
      ticks: 0,
      time: song.meta.time,
      tempo: song.meta.tempo,
    };
  }

  let low = 0;
  let high = bars.length - 1;
  let found = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (bars[middle].startTick <= tick) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return bars[found];
}

export function buildTimeline(song: Song): Timeline {
  const notes: ScheduledNote[] = [];

  for (let trackIndex = 0; trackIndex < song.tracks.length; trackIndex++) {
    for (const note of song.tracks[trackIndex].notes) {
      const start = tickToSeconds(song, note.tick);
      const end = tickToSeconds(song, note.tick + note.ticks);
      let duration = end - start;
      if (note.staccato) duration /= 2;
      const scheduled: ScheduledNote = {
        track: trackIndex,
        pitches: note.pitches,
        velocity: note.velocity,
        start,
        duration,
      };
      if (note.bends && note.bends.length > 0) {
        scheduled.bends = note.bends.map((bend) => ({
          time: tickToSeconds(song, note.tick + bend.at) - start,
          pitch: bend.pitch,
        }));
      }
      notes.push(scheduled);
    }
  }

  notes.sort((a, b) => a.start - b.start || a.track - b.track);

  return {
    song,
    duration: tickToSeconds(song, song.totalTicks),
    notes,
  };
}

export function notesBetween(timeline: Timeline, from: number, to: number): ScheduledNote[] {
  const notes = timeline.notes;
  let low = 0;
  let high = notes.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (notes[middle].start < from) low = middle + 1;
    else high = middle;
  }

  const found: ScheduledNote[] = [];
  for (let index = low; index < notes.length && notes[index].start < to; index++) {
    found.push(notes[index]);
  }
  return found;
}
