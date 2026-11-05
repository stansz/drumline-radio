// Song checker: parses every .song file in a folder and reports its length and any long melody
// notes a semitone away from the pad or bass under them (a minor 2nd or 9th). Clashes are a report,
// not a failure: some are intended (passing notes, a maj7 against its root). Parse errors fail.
//   npm run check:songs                      (checks src/songs)
//   CHECK_DIR=out npm run check:songs        (checks another folder, e.g. arranger output)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { parseSong } from '../../src/music/song';
import { buildTimeline } from '../../src/music/timing';

const DIR = process.env.CHECK_DIR ?? 'src/songs';
const MIN_SECONDS = 0.3;
// CHECK_DETAIL=1 lists every clash: time, melody note, its length, and the pad or bass note under it.
const DETAIL = Boolean(process.env.CHECK_DETAIL);
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (n: number) => `${NAMES[n % 12]}${Math.floor(n / 12) - 1}`;

it(`songs in ${DIR} parse; clash report`, () => {
  const lines: string[] = [];
  let failed = 0;
  for (const file of readdirSync(DIR).filter((f) => f.endsWith('.song')).sort()) {
    const result = parseSong(readFileSync(join(DIR, file), 'utf8'));
    if (!result.ok) {
      failed += 1;
      lines.push(`${file}: PARSE ERROR ${result.errors.slice(0, 3).join('; ')}`);
      continue;
    }
    const song = result.song;
    const timeline = buildTimeline(song);
    // Every melody-carrying track: the `melody` track, or any lead or lead2 role.
    const melody = new Set(
      song.tracks.flatMap((t, i) => (t.id === 'melody' || t.role === 'lead' || t.role === 'lead2' ? [i] : [])),
    );
    const under = new Set(
      song.tracks.flatMap((t, i) => (t.role === 'pad' || t.role === 'bass' ? [i] : [])),
    );
    const where: string[] = [];
    const details: string[] = [];
    let clashes = 0;
    for (const note of timeline.notes) {
      if (!melody.has(note.track) || note.duration < MIN_SECONDS) continue;
      for (const other of timeline.notes) {
        if (!under.has(other.track)) continue;
        if (other.start > note.start + 1e-6 || other.start + other.duration <= note.start + 1e-6) continue;
        for (const a of note.pitches) {
          for (const b of other.pitches) {
            if ((((a - b) % 12) + 12) % 12 !== 1) continue;
            clashes += 1;
            if (where.length < 3) where.push(`${note.start.toFixed(1)}s`);
            if (DETAIL) {
              details.push(
                `  ${note.start.toFixed(1)}s ${noteName(a)} (${note.duration.toFixed(2)}s) over ${song.tracks[other.track].id} ${noteName(b)}`,
              );
            }
          }
        }
      }
    }
    const total = Math.round(timeline.duration);
    const mins = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    lines.push(`${file.padEnd(30)} ${mins.padStart(5)}  ${clashes} clashes${where.length ? ` (at ${where.join(', ')})` : ''}`);
    lines.push(...details);
  }
  console.log(lines.join('\n'));
  expect(failed).toBe(0);
});
