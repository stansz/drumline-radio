// Plumbing shared by the song generators: writing a track's bars as song-file text, measuring a
// bar's length in ticks, naming and transposing notes, reading chord symbols, and moving bars
// around. This module must never hold musical choices - pitches, chord progressions, voicings,
// rhythms, grooves, patterns, velocities, swing amounts. Those stay in each song's own script, so a
// new song starts from a blank musical slate and songs never start to sound alike through this file.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// A rest bar.
export const R = 'R';

// The length of each note value in ticks, 4/4 at 3840 ticks a bar.
export const TICKS = { 1: 3840, 2: 1920, 4: 960, 8: 480, 16: 240, 32: 120, 64: 60 };

// Returns the bars as song-file lines. `first`, when given, is written on its own line ahead of
// them (a pickup bar). `marks` is an array of [barIndex, text] pairs or a Map of the same; each
// mark flushes the pending row and writes a comment line before that bar. With `collapseRests`, a
// marked section whose bars are all 'R' is written as one `R*<count>` line after its comment.
export function writeBlock(bars, marks = [], { perRow = 4, first = null, collapseRests = false } = {}) {
  const at = marks instanceof Map ? marks : new Map(marks);
  const markAt = [...at.keys()].sort((a, b) => a - b);
  const lines = first === null ? [] : [`| ${first} |`];
  let row = [];
  const flush = () => { if (row.length) lines.push(`| ${row.join(' | ')} |`); row = []; };
  for (let i = 0; i < bars.length; i += 1) {
    if (at.has(i)) {
      flush();
      lines.push(`# ${at.get(i)}`);
      if (collapseRests) {
        const end = markAt.find((mark) => mark > i) ?? bars.length;
        if (bars.slice(i, end).every((bar) => bar === 'R')) {
          lines.push(`| R*${end - i} |`);
          i = end - 1;
          continue;
        }
      }
    }
    row.push(bars[i]);
    if (row.length === perRow) flush();
  }
  flush();
  return lines.join('\n');
}

// The length in ticks of one bar string. 'R' and null count as a whole bar; velocity markings do
// not add length.
export function barLength(bar, wholeBar = 3840) {
  if (bar === 'R' || bar === null) return wholeBar;
  let sum = 0;
  const tokens = bar.match(/\[[^\]]*\][^\s]*|[^\s]+/g) ?? [];
  for (const token of tokens) {
    if (/^v=\d+$/.test(token)) continue;
    const m = token.match(/\/(\d+)(\.\.|\.|t)?/);
    if (!m) throw new Error(`no duration in token ${token}`);
    const n = Number(m[1]);
    const base = TICKS[n];
    if (base === undefined) throw new Error(`unknown duration /${n} in token ${token}`);
    const mul = m[2] === '..' ? 1.75 : m[2] === '.' ? 1.5 : m[2] === 't' ? 2 / 3 : 1;
    sum += Math.round(base * mul);
  }
  return sum;
}

// The durations a length can be written as song-file text, longest first.
export const DURATIONS = [
  [3840, '/1'], [2880, '/2.'], [1920, '/2'], [1680, '/4..'], [1440, '/4.'], [960, '/4'],
  [720, '/8.'], [480, '/8'], [240, '/16'], [120, '/32'],
];

// The text of the single duration with exactly this many ticks.
export function durationText(ticks) {
  const found = DURATIONS.find(([t]) => t === ticks);
  if (!found) throw new Error('no duration for ' + ticks);
  return found[1];
}

// A length as the shortest list of duration texts that add up to it, largest size first.
// `sizes` is which of the durations may be used, in ticks.
export function splitDuration(ticks, sizes = DURATIONS.map(([t]) => t)) {
  const out = [];
  let rest = ticks;
  for (const size of sizes) while (rest >= size) { out.push(durationText(size)); rest -= size; }
  if (rest) throw new Error(`cannot write ${rest} ticks`);
  return out;
}

// A span as repeated notes: `fn` gets the index and the unit's duration text.
export function fillUnits(ticks, unit, fn) {
  return Array.from({ length: ticks / unit }, (_, i) => fn(i, durationText(unit))).join(' ');
}

// Note spellings, chosen per song: sharps, flats, or the mixed spellings most of them use.
export const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const MIXED = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// A MIDI number as a note name with an octave, spelled from `names`.
export function noteName(midi, names = SHARPS) {
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// The MIDI number of a note name like C4, C#4, Db4 or C-1.
export function noteMidi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const letter = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + letter + accidental;
}

// A pitch class by name, sharps and flats as alternate spellings.
export const PITCH_CLASS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

// The intervals above the root that each chord quality adds, in semitones.
export const CHORD_QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6] };

// A chord symbol as { pc (root pitch class), iv (intervals), bass (slash bass pitch class) }.
export function parseChord(symbol, shift = 0) {
  const m = /^([A-G](?:#|b)?)(maj7|m7|m|7|dim)?(?:\/([A-G](?:#|b)?))?$/.exec(symbol);
  if (!m) throw new Error(`bad chord ${symbol}`);
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const pc = mod12(PITCH_CLASS[m[1]] + shift);
  const iv = CHORD_QUALITY[m[2] ?? ''];
  const bass = m[3] ? mod12(PITCH_CLASS[m[3]] + shift) : pc;
  return { pc, iv, bass };
}

// Pitches as a bracket chord text, spelled by `name`.
export function chordText(pitches, name = noteName) {
  return `[${pitches.map(name).join(' ')}]`;
}

// A bar's note text moved by `by` semitones, spelled by `name`.
export function transpose(text, by, name = noteName) {
  if (by === 0) return text;
  return text.replace(/\b[A-G](?:#|b)?\d\b/g, (match) => name(noteMidi(match) + by));
}

// `fn` called with each index from 0 to n - 1.
export function times(n, fn) {
  return Array.from({ length: n }, (_, i) => fn(i));
}

// The bar repeated n times.
export function repeatBar(bar, n) {
  return Array(n).fill(bar);
}

// Bars repeated n times, flattened.
export function repeatBars(bars, n) {
  return Array.from({ length: n }, () => bars).flat();
}

// n bars taken from `list`, starting over when it runs out.
export function cycle(list, n) {
  return Array.from({ length: n }, (_, i) => list[i % list.length]);
}

// Bars with `v=<vel> ` set on the first bar and on the first bar after a rest.
export function entryVelocity(vel, bars, { afterRests = true } = {}) {
  return bars.map((bar, i) => {
    if (bar === null || bar === undefined || bar === R) return R;
    const previous = bars[i - 1];
    const afterRest = previous === null || previous === undefined || previous === R;
    return i === 0 || (afterRests && afterRest) ? `v=${vel} ${bar}` : bar;
  });
}

// The value of the last [start, value] entry whose start is at or before i.
export function valueAt(table, i) {
  return table.filter(([a]) => a <= i).pop()[1];
}

// A list of [1-based bar, text] pairs as a Map of [0-based bar, text] marks for writeBlock.
export function barMarks(list) {
  return new Map([...list].map(([bar, text]) => [bar - 1, text]));
}

// A bar of chord symbols as { c: parseChord(s), ticks } spans, one span per chord.
export function chordSpans(text) {
  const symbols = text.split(' ');
  return symbols.map((s) => ({ c: parseChord(s), ticks: 3840 / symbols.length }));
}

// Each bar's chord spans passed to `fn(c, ticks)` and joined back into bar text.
export function eachChord(texts, fn) {
  return texts.map((t) => chordSpans(t).map(({ c, ticks }) => fn(c, ticks)).join(' '));
}

// A tick offset as note text: '' for none, '+12' later, '-6' earlier.
export function offsetText(ticks) {
  if (!ticks) return '';
  return ticks > 0 ? `+${ticks}` : String(ticks);
}

// A note, chord or drum hit as song text: `name/dur`, then the offset, then `:vel`. The song picks
// the name (its spelling, or a bracket chord) and the velocity (its own cap).
export function noteText(name, dur, vel, off = 0) {
  return `${name}/${dur}${offsetText(off)}:${vel}`;
}

// A velocity rounded into 1..max.
export function clampVelocity(v, max = 127) {
  return Math.max(1, Math.min(max, Math.round(v)));
}

// The tracks, bar marks and section writer shared by the generators that lay parts out section by
// section. `keys` names the tracks; `section(name, n, parts)` adds n bars, resting where a part has
// no bar. A `label` names the mark from the section's 1-based start and end bars; `exact` requires
// every part it is given to supply exactly n bars; `map` reworks each bar before it is stored.
// `barTicks`, given to the builder or to one section, makes every stored non-rest bar that many
// ticks or the section throws with the bar's number; without it no bar length is checked.
export function sectionBuilder(keys, { label, exact = false, barTicks } = {}) {
  const tracks = Object.fromEntries(keys.map((k) => [k, []]));
  const marks = [];
  const sections = [];
  function section(name, n, parts, { map, barTicks: sectionBarTicks } = {}) {
    const start = tracks[keys[0]].length + 1;
    const end = start + n - 1;
    const want = sectionBarTicks ?? barTicks;
    marks.push([start - 1, label ? label(name, start, end) : name]);
    sections.push({ name, start, end });
    for (const key of keys) {
      const list = parts[key] ?? [];
      if (list.length > n) throw new Error(`${name}: ${key} has ${list.length} bars, more than ${n}`);
      if (exact && parts[key] !== undefined && list.length !== n) throw new Error(`${name}: ${key} has ${list.length} bars`);
      for (let i = 0; i < n; i += 1) {
        const bar = map ? map(list[i] ?? R, key) : list[i] ?? R;
        if (want !== undefined && bar !== R) {
          const got = barLength(bar, want);
          if (got !== want) throw new Error(`${name}: ${key} bar ${start + i} is ${got} ticks, not ${want}: ${bar}`);
        }
        tracks[key].push(bar);
      }
    }
  }
  return { tracks, marks, sections, section, block: (key, options) => writeBlock(tracks[key], marks, options) };
}

// The chords, section starts, chord-range lookup and `# chords:`/`# <start>-<end>:` header lines
// for a form of { name, bars } entries, each bars string a bar of space-separated chord names.
export function formHeader(form) {
  const chords = form.flatMap((section) => section.bars.split(' '));
  const starts = form.map((_, index) =>
    1 + form.slice(0, index).reduce((sum, section) => sum + section.bars.split(' ').length, 0));
  const chordRange = (from, count) => chords.slice(from - 1, from - 1 + count);
  const chordLines = form.map((section, index) =>
    `${index === 0 ? '# chords:' : `# chords @${starts[index]}:`} ${section.bars}`);
  const formLines = form.map((section, index) => {
    const end = starts[index] + section.bars.split(' ').length - 1;
    return `# ${starts[index]}-${end}: ${section.name}`;
  });
  return { chords, starts, chordRange, chordLines, formLines };
}

// The generator's output folder: the first argument, or `fallback` (the app's songs folder).
export function outDir(fallback = 'src/songs') {
  return process.argv[2] ?? fallback;
}

// Writes a song file under out, making the folder first, and returns the path written.
export function saveSong(out, file, text) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, file), text);
  return join(out, file);
}
