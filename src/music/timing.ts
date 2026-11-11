import { TICKS_PER_QUARTER } from './song';
import type { BarInfo, Song, VolumeChange } from './song';

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

/** Shortest sounding length in seconds; a large offset can otherwise collapse a note. */
const MIN_DURATION = 0.01;

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
      const offset = note.offset ?? 0;
      const start = tickToSeconds(song, Math.max(0, note.tick + offset));
      const end = tickToSeconds(song, note.tick + note.ticks);
      let duration = end - start;
      if (note.staccato) duration /= 2;
      duration = Math.max(duration, MIN_DURATION);
      const scheduled: ScheduledNote = {
        track: trackIndex,
        pitches: note.pitches,
        velocity: note.velocity,
        start,
        duration,
      };
      if (note.bends && note.bends.length > 0) {
        scheduled.bends = note.bends.map((bend) => ({
          time: Math.max(0, tickToSeconds(song, note.tick + bend.at) - start),
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

/** Seconds a `vol@` step takes to move, so a held note does not click. */
export const VOLUME_GLIDE = 0.02;

/** A point on a track's volume curve: the factor reached at `time` seconds into the song. */
export interface VolumePoint {
  time: number;
  factor: number;
}

/**
 * A track's `vol@` changes as a curve in song seconds. The factor is 1 before the first point,
 * moves in a straight line from each point to the next, and holds after the last.
 */
export function volumeCurve(song: Song, changes: readonly VolumeChange[] = []): VolumePoint[] {
  const points: VolumePoint[] = [];
  let factor = 1;
  const barStart = (number: number): number | null => {
    const bar = song.bars.find((candidate) => candidate.number === number);
    return bar ? tickToSeconds(song, bar.startTick) : null;
  };
  // Holds the current factor up to `time`, then glides to `level`. At the very start of the song
  // there is nothing sounding yet, so it starts at `level` with no glide.
  const jump = (time: number, level: number): void => {
    if (points.length === 0 && time <= 0) {
      points.push({ time: 0, factor: level });
    } else if (level !== factor) {
      points.push({ time, factor }, { time: time + VOLUME_GLIDE, factor: level });
    }
  };

  for (const change of changes) {
    const start = barStart(change.bar);
    if (start === null) continue;
    if (change.endBar === undefined) {
      jump(start, change.to);
    } else {
      const endBar = song.bars.find((candidate) => candidate.number === change.endBar);
      if (!endBar) continue;
      const from = change.from ?? factor;
      jump(start, from);
      // The ramp starts from `from` at its first bar, not from an earlier point.
      const last = points[points.length - 1];
      if (!last || last.time < start) points.push({ time: start, factor: from });
      points.push({ time: tickToSeconds(song, endBar.startTick + endBar.ticks), factor: change.to });
    }
    factor = change.to;
  }
  return points;
}

/** The factor of a volume curve at `seconds` into the song. */
export function volumeAt(points: readonly VolumePoint[], seconds: number): number {
  if (points.length === 0) return 1;
  if (seconds < points[0].time) return 1;
  for (let i = 1; i < points.length; i++) {
    const next = points[i];
    if (seconds < next.time) {
      const prev = points[i - 1];
      return prev.factor + ((next.factor - prev.factor) * (seconds - prev.time)) / (next.time - prev.time);
    }
  }
  return points[points.length - 1].factor;
}
