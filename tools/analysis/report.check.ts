// Song report: reads one .song file and prints the numbers that are hard to hear from a score —
// density, register, velocity spread, rests, repetition, and how the energy changes per section.
// This is a report, not a pass/fail gate. Flags are heuristics, not rules.
//   SONG=src/songs/third-rail.song npm run report:song
//   SONG=out/draft.song VERBOSE=1 npm run report:song
import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { parseSong } from '../../src/music/song';
import type { Song, Track } from '../../src/music/song';
import { buildTimeline } from '../../src/music/timing';

const PATH = process.env.SONG ?? 'src/songs/third-rail.song';
const VERBOSE = Boolean(process.env.VERBOSE);
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (n: number) => `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const bar = (v: number, max: number, width = 24) => '#'.repeat(Math.max(0, Math.round((v / max) * width)));

function barIndexAt(song: Song, tick: number): number {
  let lo = 0;
  let hi = song.bars.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (song.bars[mid].startTick <= tick) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function trackStats(song: Song, track: Track) {
  const perBar: number[][] = song.bars.map(() => []);
  for (const note of track.notes) perBar[barIndexAt(song, note.tick)].push(note.pitches[0]);
  const active = perBar.filter((b) => b.length > 0).length;
  const pitches = track.notes.flatMap((n) => n.pitches);
  const velocities = track.notes.map((n) => n.velocity);
  // A bar's identity: its notes, ignoring absolute position. Low unique counts mean a looping part.
  const signatures = perBar.map((b, i) =>
    track.notes
      .filter((n) => barIndexAt(song, n.tick) === i)
      .map((n) => `${n.tick - song.bars[i].startTick}:${n.pitches.join('.')}/${n.ticks}/${n.velocity}`)
      .join(' '),
  );
  const sounding = signatures.filter((s) => s !== '');
  return {
    events: track.notes.length,
    pitches: pitches.length,
    perBar: track.notes.length / song.bars.length,
    active,
    lowest: pitches.length ? Math.min(...pitches) : 0,
    highest: pitches.length ? Math.max(...pitches) : 0,
    velMean: mean(velocities),
    velSd: sd(velocities),
    velMin: velocities.length ? Math.min(...velocities) : 0,
    velMax: velocities.length ? Math.max(...velocities) : 0,
    unique: new Set(sounding).size,
    soundingBars: sounding.length,
  };
}

it(`song report: ${PATH}`, () => {
  const result = parseSong(readFileSync(PATH, 'utf8'));
  if (!result.ok) throw new Error(`${PATH} does not parse: ${result.errors.join('; ')}`);
  const song = result.song;
  const timeline = buildTimeline(song);
  const bars = song.bars.length;
  const out: string[] = [];

  out.push(`${song.meta.title}  ·  ${song.meta.key}  ·  ${song.meta.style}  ·  ${song.meta.tempo} BPM  ·  ${song.meta.time[0]}/${song.meta.time[1]}`);
  out.push(`${bars} bars, ${mmss(timeline.duration)}, ${song.tracks.length} tracks, ${timeline.notes.length} note events`);
  out.push('');
  out.push('track      role     inst            events  ev/bar  active  range          vel mean±sd (min-max)  unique');
  for (const track of song.tracks) {
    const s = trackStats(song, track);
    const range = s.pitches ? `${noteName(s.lowest)}-${noteName(s.highest)}` : '—';
    out.push(
      `${track.id.padEnd(10)} ${track.role.padEnd(8)} ${(track.inst ?? '').padEnd(15)} ` +
        `${String(s.events).padStart(6)}  ${s.perBar.toFixed(2).padStart(6)}  ` +
        `${String(Math.round((100 * s.active) / bars)).padStart(4)}%  ${range.padEnd(13)}  ` +
        `${s.velMean.toFixed(0).padStart(4)}±${s.velSd.toFixed(0).padEnd(3)} (${s.velMin}-${s.velMax})`.padEnd(24) +
        `${String(s.unique).padStart(5)}`,
    );
  }

  // Melody shape: steps vs leaps, register, and how often the line rests.
  const melody = song.tracks.find((t) => t.role === 'lead' || t.role === 'lead2' || t.id === 'melody');
  if (melody) {
    const notes = [...melody.notes].sort((a, b) => a.tick - b.tick);
    const top = notes.map((n) => Math.max(...n.pitches));
    const intervals = top.slice(1).map((p, i) => Math.abs(p - top[i]));
    const repeats = intervals.filter((d) => d === 0).length;
    const steps = intervals.filter((d) => d > 0 && d <= 2).length;
    const leaps = intervals.filter((d) => d > 2 && d <= 7).length;
    const big = intervals.filter((d) => d > 7).length;
    const pct = (n: number) => (intervals.length ? Math.round((100 * n) / intervals.length) : 0);
    const m = trackStats(song, melody);
    out.push('');
    out.push(
      `melody: mean ${noteName(Math.round(mean(top)))}  ·  repeats ${pct(repeats)}%  ·  steps ${pct(steps)}%  ·  ` +
        `leaps ${pct(leaps)}%  ·  over an octave ${pct(big)}%  ·  silently rests ${Math.round(100 - (100 * m.active) / bars)}% of bars`,
    );
  }

  // Energy over 8-bar windows: how much is happening, all tracks together.
  const window = 8;
  const counts: number[] = [];
  for (let start = 0; start < bars; start += window) {
    const end = Math.min(bars, start + window);
    const n = song.tracks.reduce(
      (sum, t) => sum + t.notes.filter((note) => {
        const b = barIndexAt(song, note.tick);
        return b >= start && b < end;
      }).length,
      0,
    );
    counts.push(n / (end - start));
  }
  const max = Math.max(1, ...counts);
  out.push('');
  out.push('events per bar, 8-bar windows:');
  counts.forEach((c, i) => {
    const from = i * window + 1;
    const to = Math.min(bars, (i + 1) * window);
    out.push(`  ${String(from).padStart(3)}-${String(to).padEnd(3)} ${c.toFixed(1).padStart(5)}  ${bar(c, max)}`);
  });

  // Flags are heuristics: they point at something to listen for, they do not fail the song.
  const flags: string[] = [];
  for (const track of song.tracks) {
    const s = trackStats(song, track);
    if (s.events === 0) flags.push(`${track.id}: empty`);
    if (s.events >= 8 && s.perBar >= 5) flags.push(`${track.id}: busy (${s.perBar.toFixed(1)} events/bar)`);
    if (s.events >= 8 && s.velSd < 6) flags.push(`${track.id}: flat velocity (sd ${s.velSd.toFixed(0)})`);
    if (s.events >= 8 && s.active === bars) flags.push(`${track.id}: never rests`);
    if (track.role !== 'drums' && s.pitches && s.lowest < 24) flags.push(`${track.id}: below the bass range`);
  }
  if (melody) {
    const top = melody.notes.map((n) => Math.max(...n.pitches));
    const m = mean(top);
    if (m > 72) flags.push(`melody: high register (mean ${noteName(Math.round(m))}, above C5)`);
    if (m < 55) flags.push(`melody: low register (mean ${noteName(Math.round(m))})`);
  }
  out.push('');
  out.push(flags.length ? `flags: ${flags.join(' · ')}` : 'flags: none');

  if (VERBOSE) {
    out.push('');
    out.push('tracks in file order: ' + song.tracks.map((t) => `${t.id}(${t.role})`).join(', '));
    out.push('bars: ' + song.bars.map((b, i) => `${i + 1}:${b.ticks}`).filter((_, i) => i > 0).slice(0, 0).join(''));
  }
  console.log(out.join('\n'));
});
