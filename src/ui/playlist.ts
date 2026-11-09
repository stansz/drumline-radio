import { STYLES } from '../music/roles';
import type { StyleId } from '../music/roles';

/** One entry in the playlist: a library song id and the style to play it in. */
export interface PlaylistEntry {
  song: string;
  style: StyleId;
}

export const PLAYLIST_MAX = 200;

export type AppView = 'radio' | 'jukebox' | 'playlist';

export const VIEWS: readonly AppView[] = ['radio', 'jukebox', 'playlist'];

const KNOWN_STYLES: readonly string[] = STYLES;

/** Reads a saved playlist, dropping anything unknown or malformed. Never throws. */
export function parsePlaylist(stored: string | null, ids: string[]): PlaylistEntry[] {
  if (stored === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const knownIds = new Set(ids);
  const list: PlaylistEntry[] = [];
  for (const item of parsed) {
    if (list.length >= PLAYLIST_MAX) break;
    if (typeof item !== 'object' || item === null) continue;
    const { song, style } = item as { song?: unknown; style?: unknown };
    if (typeof song !== 'string' || !knownIds.has(song)) continue;
    if (typeof style !== 'string' || !KNOWN_STYLES.includes(style)) continue;
    list.push({ song, style: style as StyleId });
  }
  return list;
}

/** Saves just the song and style of every entry. */
export function serializePlaylist(list: PlaylistEntry[]): string {
  return JSON.stringify(list.map((entry) => ({ song: entry.song, style: entry.style })));
}

/** Appends an entry, or returns the same list once it is full. */
export function addEntry(list: PlaylistEntry[], entry: PlaylistEntry): PlaylistEntry[] {
  if (list.length >= PLAYLIST_MAX) return list;
  return [...list, entry];
}

/** Swaps an entry with its neighbour. The playing index follows the swap when it is involved. */
export function moveEntry(
  list: PlaylistEntry[],
  at: number | null,
  index: number,
  delta: -1 | 1,
): { list: PlaylistEntry[]; at: number | null } {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return { list, at };
  }
  const next = [...list];
  next[index] = list[target];
  next[target] = list[index];
  let nextAt = at;
  if (at === index) nextAt = target;
  else if (at === target) nextAt = index;
  return { list: next, at: nextAt };
}

/** Removes an entry, keeping the playing index pointing at the same entry when it survives. */
export function removeEntry(
  list: PlaylistEntry[],
  at: number | null,
  index: number,
): { list: PlaylistEntry[]; at: number | null } {
  if (index < 0 || index >= list.length) return { list, at };
  const next = list.filter((_, i) => i !== index);
  let nextAt = at;
  if (at === index) nextAt = null;
  else if (at !== null && at > index) nextAt = at - 1;
  return { list: next, at: nextAt };
}

/** The entry that follows `at`: itself when repeating one, else the next, looped or stopped. */
export function nextInPlaylist(
  at: number,
  length: number,
  repeatOne: boolean,
  loop: boolean,
): number {
  if (length === 0) return -1;
  if (repeatOne) return at;
  if (at + 1 < length) return at + 1;
  if (loop) return 0;
  return -1;
}

/** The entry before `at`, wrapping around to the end. */
export function prevInPlaylist(at: number, length: number): number {
  if (length === 0) return -1;
  return (at - 1 + length) % length;
}

/** Reads the saved view; anything other than the exact word means the radio screen. */
export function parseView(stored: string | null): AppView {
  return stored === 'jukebox' || stored === 'playlist' ? stored : 'radio';
}

/** The view `delta` steps along VIEWS from `view`, wrapping. */
export function nextView(view: AppView, delta: 1 | -1): AppView {
  const at = VIEWS.indexOf(view);
  return VIEWS[(at + delta + VIEWS.length) % VIEWS.length];
}
