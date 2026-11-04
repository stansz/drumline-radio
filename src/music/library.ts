import { CATEGORIES, parseSong } from './song';
import type { Song } from './song';

const FILES = import.meta.glob('../songs/*.song', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface LibraryEntry {
  id: string;
  song: Song;
}

function idFor(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.song$/, '');
}

function sortedEntries(entries: LibraryEntry[]): LibraryEntry[] {
  const rank = (entry: LibraryEntry) => CATEGORIES.indexOf(entry.song.meta.category);
  return entries.sort((a, b) => rank(a) - rank(b) || a.song.meta.title.localeCompare(b.song.meta.title));
}

const entries: LibraryEntry[] = [];
const errors: string[] = [];

for (const path of Object.keys(FILES).sort()) {
  const id = idFor(path);
  const result = parseSong(FILES[path]);
  if (result.ok) {
    entries.push({ id, song: result.song });
  } else {
    errors.push(`${id}: ${result.errors.join('; ')}`);
  }
}

export const LIBRARY: LibraryEntry[] = sortedEntries(entries);
export const LIBRARY_ERRORS: string[] = errors;
