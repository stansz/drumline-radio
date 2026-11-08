// Song checker: parses every .song file in a folder and reports its length and any long note in a
// pitched part a semitone away from the pad or bass under it (a minor 2nd or 9th). Every pitched
// part except the pad and bass is checked against them. Clashes are a report, not a failure: some
// are intended (passing notes, a maj7 against its root). Parse errors fail.
//   npm run check:songs                      (checks src/songs)
//   CHECK_DIR=out npm run check:songs        (checks another folder, e.g. arranger output)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { parseSong } from '../../src/music/song';
import { buildTimeline } from '../../src/music/timing';

const DIR = process.env.CHECK_DIR ?? 'src/songs';
const MIN_SECONDS = 0.3;
// CHECK_DETAIL=1 lists every clash: time, track, note, its length, and the pad or bass note under it.
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
    // Every pitched part except the pad and bass: any track whose role is not pad, bass, or drums
    // (lead, lead2, counter, arp, chords, and the melody track whatever its role).
    const checked = new Set(
      song.tracks.flatMap((t, i) => (t.role !== 'pad' && t.role !== 'bass' && t.role !== 'drums' ? [i] : [])),
    );
    const under = new Set(
      song.tracks.flatMap((t, i) => (t.role === 'pad' || t.role === 'bass' ? [i] : [])),
    );
    const where: string[] = [];
    const details: string[] = [];
    const perTrack = new Map<number, number>();
    let clashes = 0;
    for (const note of timeline.notes) {
      if (!checked.has(note.track) || note.duration < MIN_SECONDS) continue;
      for (const other of timeline.notes) {
        if (!under.has(other.track)) continue;
        if (other.start > note.start + 1e-6 || other.start + other.duration <= note.start + 1e-6) continue;
        for (const a of note.pitches) {
          for (const b of other.pitches) {
            if ((((a - b) % 12) + 12) % 12 !== 1) continue;
            clashes += 1;
            perTrack.set(note.track, (perTrack.get(note.track) ?? 0) + 1);
            if (where.length < 3) where.push(`${note.start.toFixed(1)}s`);
            if (DETAIL) {
              details.push(
                `  ${note.start.toFixed(1)}s ${song.tracks[note.track].id} ${noteName(a)} (${note.duration.toFixed(2)}s) over ${song.tracks[other.track].id} ${noteName(b)}`,
              );
            }
          }
        }
      }
    }
    const total = Math.round(timeline.duration);
    const mins = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    const breakdown = [...perTrack.entries()]
      .sort(([x], [y]) => x - y)
      .map(([track, count]) => `${song.tracks[track].id} ${count}`);
    const clashText = breakdown.length ? `${clashes} clashes [${breakdown.join(', ')}]` : `${clashes} clashes`;
    lines.push(`${file.padEnd(30)} ${mins.padStart(5)}  ${clashText}${where.length ? ` (at ${where.join(', ')})` : ''}`);
    lines.push(...details);
  }
  console.log(lines.join('\n'));
  expect(failed).toBe(0);
});
