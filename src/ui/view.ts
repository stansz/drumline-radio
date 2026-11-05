import { CATEGORIES } from '../music/song';
import type { Category, Song } from '../music/song';

/** Formats song seconds as `m:ss`, flooring and clamping negatives to zero. */
/** Maps the 0–100 volume slider to a gain, squared so the slider feels even to the ear. */
export function volumeGain(percent: number): number {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (clamped / 100) ** 2;
}

/** Reads a stored volume percentage; anything missing or invalid gives 100. */
export function parseVolume(stored: string | null): number {
  if (stored === null || stored.trim() === '') return 100;
  const value = Number(stored);
  return Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), 100) : 100;
}

/**
 * Where a drag on the score lands: dragging left moves forward in time, at the score's scale
 * (6 s of future across 75% of the width, as drawn in score.ts). Clamped to the song.
 */
export function scrubTarget(start: number, dx: number, width: number, duration: number): number {
  if (width <= 0) return start;
  const pxPerSecond = (width * 0.75) / 6;
  return Math.min(Math.max(start - dx / pxPerSecond, 0), duration);
}

/** How long the screensaver waits without a touch: off, 1 minute, or 5 minutes. */
export type SaverMinutes = 0 | 1 | 5;

export const SAVER_OPTIONS: SaverMinutes[] = [0, 1, 5];

/** Reads a stored screensaver delay; anything missing or unknown gives 5 minutes. */
export function parseSaverMinutes(stored: string | null): SaverMinutes {
  if (stored === '0') return 0;
  if (stored === '1') return 1;
  return 5;
}

/** Whether idle time and the play state say the screensaver should start. */
export function shouldStartSaver(
  idleMs: number,
  minutes: SaverMinutes,
  playing: boolean,
  blocked: boolean,
): boolean {
  return playing && !blocked && minutes > 0 && idleMs >= minutes * 60000;
}

/** Where the drifting screensaver box lands, from two rolls in [0, 1). */
export function driftPosition(
  rx: number,
  ry: number,
  areaW: number,
  areaH: number,
  boxW: number,
  boxH: number,
): { x: number; y: number } {
  return {
    x: Math.round(rx * Math.max(0, areaW - boxW)),
    y: Math.round(ry * Math.max(0, areaH - boxH)),
  };
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** How far and how long a too-long readout line scrolls back and forth. */
export function marqueeTiming(overflowPx: number): { shift: number; seconds: number } {
  return {
    shift: -Math.ceil(overflowPx) - 8,
    seconds: Math.max(6, Math.round(4 + overflowPx / 25)),
  };
}

/** The label/value rows on a song card, in display order. */
export function songFacts(
  meta: { year: string; key: string; tempo: number; time: [number, number] },
  categoryName: string,
  styleName: string,
  durationSec: number,
): [string, string][] {
  return [
    ['Year', meta.year],
    ['Category', categoryName],
    ['Style', styleName],
    ['Key', meta.key],
    ['Tempo', `${Math.round(meta.tempo)} BPM`],
    ['Time', `${meta.time[0]}/${meta.time[1]}`],
    ['Length', formatTime(durationSec)],
  ];
}

const FM_LOW = 88.1;
const FM_HIGH = 107.9;

/**
 * The tuner frequency shown for a station: the stations spread evenly across the real FM band
 * (88.1 to 107.9), each on an odd tenth like a US station.
 */
export function stationLabel(index: number, count: number): string {
  if (count <= 1) return FM_LOW.toFixed(1);
  const steps = Math.round((FM_HIGH - FM_LOW) / 0.2); // 0.2 MHz channels between the ends
  const channel = Math.round((index * steps) / (count - 1));
  return (FM_LOW + channel * 0.2).toFixed(1);
}

export type CategoryFilter = Category | 'all';

export const CATEGORY_FILTERS: CategoryFilter[] = ['all', ...CATEGORIES];

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All',
  carols: 'Carols',
  classics: 'Classics',
  originals: 'Originals',
};

export function categoryLabel(filter: CategoryFilter): string {
  return CATEGORY_LABELS[filter];
}

/** Reads a stored preset; anything missing or unknown gives All. */
export function parseCategory(stored: string | null): CategoryFilter {
  return CATEGORY_FILTERS.includes(stored as CategoryFilter)
    ? (stored as CategoryFilter)
    : 'all';
}

/** The library indices a preset shows, in library order. */
export function stationsIn(categories: Category[], filter: CategoryFilter): number[] {
  const indices: number[] = [];
  for (let index = 0; index < categories.length; index += 1) {
    if (filter === 'all' || categories[index] === filter) indices.push(index);
  }
  return indices;
}

/** The station `delta` places from `current` among the visible stations, wrapping around. */
export function stepStation(visible: number[], current: number, delta: number): number {
  if (visible.length === 0) return current;
  const at = visible.indexOf(current);
  if (at < 0) return visible[0];
  return visible[(at + delta + visible.length) % visible.length];
}

/** Previous either restarts a song that is under way or moves to the previous station. */
export function prevAction(position: number): 'restart' | 'previous' {
  return position > 3 ? 'restart' : 'previous';
}

/** What to play when a song ends: the same song when repeating, otherwise the next visible one. */
export function nextAfterEnd(current: number, visible: number[], repeatOne: boolean): number {
  if (repeatOne) return current;
  return stepStation(visible, current, 1);
}

export interface Lane {
  track: number;
  top: number;
  height: number;
  low: number;
  high: number;
  rows: number[] | null;
}

/** Stacks one lane per track, ordered top to bottom in track order. */
export function laneLayout(song: Song, height: number): Lane[] {
  const count = song.tracks.length;
  return song.tracks.map((track, index) => {
    const laneHeight = count > 0 ? height / count : height;
    const top = (index * height) / Math.max(1, count);
    const lanebase = { track: index, top, height: laneHeight };

    if (track.role === 'drums') {
      const pitches = new Set<number>();
      for (const note of track.notes) for (const pitch of note.pitches) pitches.add(pitch);
      const rows = Array.from(pitches).sort((a, b) => b - a);
      const low = rows.length > 0 ? rows[rows.length - 1] : 0;
      const high = rows.length > 0 ? rows[0] : 0;
      return { ...lanebase, low, high, rows };
    }

    let low = 58;
    let high = 62;
    if (track.notes.length > 0) {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (const note of track.notes) {
        for (const pitch of note.pitches) {
          if (pitch < min) min = pitch;
          if (pitch > max) max = pitch;
        }
      }
      low = min - 2;
      high = max + 2;
    }
    return { ...lanebase, low, high, rows: null };
  });
}

/** Lane labels: the instrument name, plus the track id when several lanes share that instrument. */
export function laneLabels(names: string[], ids: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return names.map((name, i) => ((counts.get(name) ?? 0) > 1 ? `${name} · ${ids[i]}` : name));
}

export function noteHeight(lane: Lane): number {
  if (lane.rows !== null) {
    if (lane.rows.length === 0) return 3;
    return Math.max(3, (lane.height - 8) / lane.rows.length - 2);
  }
  return Math.max(3, Math.min(10, (lane.height - 8) / (lane.high - lane.low + 1)));
}

/** The y of the top of a note bar for a pitch inside its lane. */
export function noteY(lane: Lane, pitch: number): number {
  if (lane.rows !== null) {
    if (lane.rows.length === 0) return lane.top + 4;
    const row = Math.max(0, lane.rows.indexOf(pitch));
    return lane.top + 4 + (row * (lane.height - 8)) / lane.rows.length;
  }
  const barHeight = noteHeight(lane);
  const top = lane.top + 4;
  const bottom = lane.top + lane.height - 4 - barHeight;
  const range = lane.high - lane.low;
  if (range <= 0) return top;
  return top + ((lane.high - pitch) * (bottom - top)) / range;
}

// The Techno beat flash stays inside the WCAG flash limits: at most 3 flashes a second, a peak well
// under a 10% change in brightness, and a fade instead of a hard on/off.
export const FLASH_PEAK = 0.06;
export const FLASH_FADE = 0.25;
export const FLASH_MIN_GAP = 1 / 3;

/** Advances the beat flash: a kick starts a new flash only after the minimum gap. Times in seconds. */
export function flashStep(lastStart: number, now: number, kick: boolean): { start: number; level: number } {
  const start = kick && now - lastStart >= FLASH_MIN_GAP ? now : lastStart;
  const level = FLASH_PEAK * Math.max(0, Math.min(1, 1 - (now - start) / FLASH_FADE));
  return { start, level };
}

/** Index of the centre closest to x; ties go to the lower index, empty is -1. */
export function nearestStation(centers: number[], x: number): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < centers.length; i += 1) {
    const distance = Math.abs(centers[i] - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
