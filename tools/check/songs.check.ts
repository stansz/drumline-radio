// Song checker: parses every .song file in a folder and reports its length and any long note in a
// pitched part a semitone away from the pad or bass under it (a minor 2nd or 9th). Every pitched
// part except the pad and bass is checked against them. Clashes are a report, not a failure: some
// are intended (passing notes, a maj7 against its root). Parse errors fail.
// A song may declare its chord progression in `# chords:` comment lines (one symbol per bar,
// cycling, `# chords @N:` to change from bar N); the checker then also counts long on-beat notes
// outside the bar's chord ("off-chord"). That count is a report too, not a failure.
// A song can explain a deliberate clash or off-chord note with a `# ok @<bar> <track> <note>: <reason>`
// comment line on its own line, anywhere in the file; a matching one counts as explained.
//   npm run check:songs                      (checks src/songs)
//   CHECK_DIR=out npm run check:songs        (checks another folder, e.g. arranger output)
//   SONG=wayfarers-rest npm run check:songs  (checks one song by name, file name, or path)
//   SIBLINGS=techno npm run check:songs      (adds the report of each song in that style)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import { STYLE_DEFS, resolvePatch, withBankInstruments } from '../../src/audio/styles';
import { chordTones, parseChordMap } from '../../src/music/chords';
import type { ChordMap } from '../../src/music/chords';
import { parsePitch } from '../../src/music/pitch';
import { parseSong, TICKS_PER_WHOLE } from '../../src/music/song';
import { barAt, buildTimeline, secondsToTick, tickToSeconds } from '../../src/music/timing';

const DIR = process.env.CHECK_DIR ?? 'src/songs';
// SONG narrows the check to one song. A name or file name is looked up in DIR; a path brings its
// own folder.
const SONG = process.env.SONG;
const FOLDER = SONG && /[\\/]/.test(SONG) ? dirname(SONG) : DIR;
const NAME = SONG ? basename(SONG).replace(/\.song$/, '') : null;
const MIN_SECONDS = 0.3;
// CHECK_DETAIL=1 lists every clash: time, track, note, its length, and the pad or bass note under it.
const DETAIL = Boolean(process.env.CHECK_DETAIL);
// SIBLINGS=<style> adds a report of every song in that style: key, tempo, bars, length, kit, bass,
// lead instrument and every part it uses (the resolved patch names, without duplicates).
const SIBLINGS = process.env.SIBLINGS;
const siblingRows: string[] = [];
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (n: number) => `${NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
// A song explains a deliberate clash or off-chord note with `# ok @<bar> <track> <note>: <reason>`,
// on its own line anywhere in the file. A counted note whose bar, track id and pitch match one of
// these lines counts as explained instead; the line is then no longer "unused".
const OK_LINE = /^#\s*ok\s+@(\d+)\s+(\S+)\s+([A-G](?:#|b)?[0-8])\s*:\s*(.*)$/gm;
interface OkLine { bar: number; track: string; note: string; midi: number; reason: string; used: boolean; }
function parseOkLines(text: string): OkLine[] {
  return [...text.matchAll(OK_LINE)].flatMap((match) => {
    const midi = parsePitch(match[3]);
    return midi === null ? [] : [{
      bar: Number(match[1]), track: match[2], note: match[3], midi,
      reason: match[4].trim(), used: false,
    }];
  });
}

it(`songs in ${FOLDER} parse; clash report`, () => {
  const lines: string[] = [];
  let failed = 0;
  const wanted = NAME ? `${NAME}.song` : null;
  const files = wanted
    ? existsSync(join(FOLDER, wanted))
      ? [wanted]
      : []
    : readdirSync(FOLDER)
        .filter((f) => f.endsWith('.song'))
        .sort();
  if (wanted && files.length === 0) {
    lines.push(`no song file at ${join(FOLDER, wanted)}`);
    failed += 1;
  }
  for (const file of files) {
    const text = readFileSync(join(FOLDER, file), 'utf8');
    const result = parseSong(text);
    if (!result.ok) {
      failed += 1;
      lines.push(`${file}: PARSE ERROR ${result.errors.slice(0, 3).join('; ')}`);
      continue;
    }
    const song = result.song;
    const timeline = buildTimeline(song);
    const okLines = parseOkLines(text);
    // A matching `# ok` line explains every counted note in its bar, on its track, at its pitch.
    const explain = (bar: number, track: number, pitch: number): OkLine | undefined => {
      const found = okLines.find((ok) => ok.bar === bar && ok.track === song.tracks[track].id && ok.midi === pitch);
      if (found) found.used = true;
      return found;
    };
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
    let explainedClashes = 0;
    for (const note of timeline.notes) {
      if (!checked.has(note.track) || note.duration < MIN_SECONDS) continue;
      for (const other of timeline.notes) {
        if (!under.has(other.track)) continue;
        if (other.start > note.start + 1e-6 || other.start + other.duration <= note.start + 1e-6) continue;
        for (const a of note.pitches) {
          for (const b of other.pitches) {
            if ((((a - b) % 12) + 12) % 12 !== 1) continue;
            const bar = barAt(song, secondsToTick(song, note.start)).number;
            const ok = explain(bar, note.track, a);
            if (ok) {
              explainedClashes += 1;
            } else {
              clashes += 1;
              perTrack.set(note.track, (perTrack.get(note.track) ?? 0) + 1);
              if (where.length < 3) where.push(`${note.start.toFixed(1)}s`);
            }
            if (DETAIL) {
              details.push(
                `  ${note.start.toFixed(1)}s ${song.tracks[note.track].id} ${noteName(a)} (${note.duration.toFixed(2)}s) over ${song.tracks[other.track].id} ${noteName(b)}${ok ? ` ok: ${ok.reason}` : ''}`,
              );
            }
          }
        }
      }
    }
    let chordMap: ChordMap | null = null;
    let chordError: string | null = null;
    try {
      chordMap = parseChordMap(text);
    } catch (error) {
      failed += 1;
      chordError = error instanceof Error ? error.message : String(error);
    }
    const offDetails: string[] = [];
    const offPerTrack = new Map<number, number>();
    let offChord = 0;
    let explainedOff = 0;
    if (chordMap) {
      for (let trackIndex = 0; trackIndex < song.tracks.length; trackIndex++) {
        const track = song.tracks[trackIndex];
        if (track.role === 'drums') continue;
        for (const note of track.notes) {
          // The bar is the last one that starts at or before the note.
          let bar = song.bars[0];
          for (const candidate of song.bars) {
            if (candidate.startTick > note.tick) break;
            bar = candidate;
          }
          if (!bar) continue;
          const chord = chordMap.chordAt(bar.number);
          if (chord === null) continue;
          const tones = chordTones(chord);
          if (!tones) continue;
          const length =
            tickToSeconds(song, note.tick + note.ticks) - tickToSeconds(song, note.tick);
          if (length < MIN_SECONDS) continue;
          const beat = TICKS_PER_WHOLE / bar.time[1];
          if ((note.tick - bar.startTick) % beat !== 0) continue;
          const offending = note.pitches.find(
            (pitch) => !tones.includes(((pitch % 12) + 12) % 12),
          );
          if (offending === undefined) continue;
          const ok = explain(bar.number, trackIndex, offending);
          if (ok) explainedOff += 1;
          else {
            offChord += 1;
            offPerTrack.set(trackIndex, (offPerTrack.get(trackIndex) ?? 0) + 1);
          }
          if (DETAIL) {
            const start = tickToSeconds(song, note.tick);
            offDetails.push(
              `  off-chord bar ${bar.number} (${chord}) ${track.id} ${noteName(offending)} (${length.toFixed(2)}s) at ${start.toFixed(1)}s${ok ? ` ok: ${ok.reason}` : ''}`,
            );
          }
        }
      }
    }
    const total = Math.round(timeline.duration);
    const mins = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    if (SIBLINGS && song.meta.style === SIBLINGS) {
      const withBank = withBankInstruments(song);
      const patchName = (role: string) => {
        const k = withBank.tracks.findIndex((t) => t.role === role);
        return k < 0 ? '—' : resolvePatch(STYLE_DEFS[SIBLINGS], withBank.tracks[k]).name;
      };
      const firstLead = withBank.tracks.find((t) => t.role === 'lead');
      const leadName = firstLead ? resolvePatch(STYLE_DEFS[SIBLINGS], firstLead).name : '—';
      const parts = [...new Set(withBank.tracks.map(
        (t) => resolvePatch(STYLE_DEFS[SIBLINGS], t).name,
      ))].join(', ');
      siblingRows.push(
        `${file.padEnd(30)} ${song.meta.key.padEnd(5)} ${`${song.meta.tempo} BPM`.padEnd(8)} ${String(song.bars.length).padStart(4)}  ${mins.padStart(5)}  kit: ${patchName('drums').padEnd(18)}  bass: ${patchName('bass').padEnd(18)}  lead: ${leadName.padEnd(18)}  parts: ${parts}${song.meta.hidden ? '  hidden' : ''}`,
      );
    }
    const breakdown = [...perTrack.entries()]
      .sort(([x], [y]) => x - y)
      .map(([track, count]) => `${song.tracks[track].id} ${count}`);
    const clashCount = `${clashes} clashes${explainedClashes ? ` (+${explainedClashes} explained)` : ''}`;
    const clashText = breakdown.length ? `${clashCount} [${breakdown.join(', ')}]` : clashCount;
    const offBreakdown = [...offPerTrack.entries()]
      .sort(([x], [y]) => x - y)
      .map(([track, count]) => `${song.tracks[track].id} ${count}`);
    const offCount = `${offChord} off-chord${explainedOff ? ` (+${explainedOff} explained)` : ''}`;
    const offText = chordMap
      ? ` · ${offCount}${offBreakdown.length ? ` [${offBreakdown.join(', ')}]` : ''}`
      : '';
    const errorText = chordError ? ` CHORD MAP ERROR ${chordError}` : '';
    lines.push(
      `${file.padEnd(30)} ${mins.padStart(5)}  ${clashText}${where.length ? ` (at ${where.join(', ')})` : ''}${offText}${errorText}`,
    );
    lines.push(...details);
    lines.push(...offDetails);
    if (DETAIL) {
      for (const ok of okLines) {
        if (!ok.used) lines.push(`  unused ok @${ok.bar} ${ok.track} ${ok.note}`);
      }
    }
  }
  if (SIBLINGS) {
    lines.push('');
    lines.push(`Songs in ${SIBLINGS}:`);
    lines.push(...siblingRows);
  }
  console.log(lines.join('\n'));
  expect(failed).toBe(0);
});
