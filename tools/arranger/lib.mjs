// Plumbing shared by the song generators: writing a track's bars as song-file text, and measuring
// a bar's length in ticks. This module must never hold musical choices - pitches, chords,
// voicings, rhythms, grooves, patterns, velocities, swing amounts. Those stay in each song's own
// script, so a new song starts from a blank musical slate and songs never start to sound alike
// through this file.

const TICKS = { 1: 3840, 2: 1920, 4: 960, 8: 480, 16: 240, 32: 120, 64: 60 };

// Returns the bars as song-file lines. `first`, when given, is written on its own line ahead of
// them (a pickup bar). `marks` is an array of [barIndex, text] pairs or a Map of the same; each
// mark flushes the pending row and writes a comment line before that bar.
export function writeBlock(bars, marks = [], { perRow = 4, first = null } = {}) {
  const at = marks instanceof Map ? marks : new Map(marks);
  const lines = first === null ? [] : [`| ${first} |`];
  let row = [];
  const flush = () => { if (row.length) lines.push(`| ${row.join(' | ')} |`); row = []; };
  bars.forEach((bar, i) => {
    if (at.has(i)) { flush(); lines.push(`# ${at.get(i)}`); }
    row.push(bar);
    if (row.length === perRow) flush();
  });
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
