// Plumbing shared by the song generators: writing a track's bars as song-file text, and measuring
// a bar's length in ticks. This module must never hold musical choices - pitches, chords,
// voicings, rhythms, grooves, patterns, velocities, swing amounts. Those stay in each song's own
// script, so a new song starts from a blank musical slate and songs never start to sound alike
// through this file.

const TICKS = { 1: 3840, 2: 1920, 4: 960, 8: 480, 16: 240, 32: 120, 64: 60 };

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

// The length in ticks of one bar string. 'R' and null count as a whole bar.
export function barLength(bar, wholeBar = 3840) {
  if (bar === 'R' || bar === null) return wholeBar;
  let sum = 0;
  const tokens = bar.match(/\[[^\]]*\][^\s]*|[^\s]+/g) ?? [];
  for (const token of tokens) {
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

// Note spellings, chosen per song: sharps, flats, or the mixed spellings most of them use.
export const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const MIXED = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// A MIDI number as a note name with an octave, spelled from `names`.
export function noteName(midi, names = SHARPS) {
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// A tick offset as note text: '' for none, '+12' later, '-6' earlier.
export function offsetText(ticks) {
  if (!ticks) return '';
  return ticks > 0 ? `+${ticks}` : String(ticks);
}

// A velocity rounded into 1..max.
export function clampVelocity(v, max = 127) {
  return Math.max(1, Math.min(max, Math.round(v)));
}

// The tracks, bar marks and section writer shared by the generators that lay parts out section by
// section. `keys` names the tracks; `section(name, n, parts)` adds n bars, resting where a part has
// no bar.
export function sectionBuilder(keys) {
  const tracks = Object.fromEntries(keys.map((k) => [k, []]));
  const marks = [];
  function section(name, n, parts) {
    marks.push([tracks[keys[0]].length, name]);
    for (const key of keys) {
      const list = parts[key] ?? [];
      if (list.length > n) throw new Error(`${name}: ${key} has ${list.length} bars, more than ${n}`);
      for (let i = 0; i < n; i += 1) tracks[key].push(list[i] ?? 'R');
    }
  }
  return { tracks, marks, section };
}
