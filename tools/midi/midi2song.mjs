// MIDI -> .song bars, for building a public-domain piece from a score's MIDI file (Mutopia Project
// MIDI files work well). Splits each MIDI track into voices that are single notes or chords,
// quantises to a grid, and writes each voice's bars (with ties across bar lines) as JSON for a song
// script to use. It prints the voices' ranges and how many notes the grid moved.
//   node tools/midi/midi2song.mjs <file.mid> --time 3/8 [--pickup 480] [--grid 40] [--json out.json]
// --pickup is the pickup bar's length in ticks (960 a quarter); --grid 40 fits both 32nds and
// triplets. A repeat the MIDI plays once, or a first ending, shows up as bars shifted off the bar
// lines: convert again with another --pickup for the part after it, and unfold repeats in the script.
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i < 0 ? dflt : args[i + 1]; };
const grid = Number(opt('grid', 120));
const pickup = Number(opt('pickup', 0));
const [tn, td] = opt('time', '4/4').split('/').map(Number);
const BAR = (tn * 3840) / td;

// --- Standard MIDI file parsing ---------------------------------------------------------------
const buf = readFileSync(file);
let p = 0;
const u32 = () => { const v = buf.readUInt32BE(p); p += 4; return v; };
const u16 = () => { const v = buf.readUInt16BE(p); p += 2; return v; };
const vlq = () => { let v = 0; for (;;) { const b = buf[p++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v; } };
if (buf.toString('ascii', 0, 4) !== 'MThd') throw new Error('not a MIDI file');
p = 4; const hlen = u32(); const format = u16(); const ntracks = u16(); const division = u16(); p = 8 + hlen;
const scale = 960 / division;
const tracks = [];
const meta = { tempos: [], times: [], names: [] };
for (let t = 0; t < ntracks; t++) {
  if (buf.toString('ascii', p, p + 4) !== 'MTrk') throw new Error('bad track');
  p += 4; const len = u32(); const end = p + len;
  let tick = 0; let status = 0; const on = new Map(); const notes = [];
  while (p < end) {
    tick += vlq();
    let b = buf[p];
    if (b & 0x80) { status = b; p++; } else b = status;
    const type = status & 0xf0;
    if (status === 0xff) {
      const mt = buf[p++]; const ml = vlq(); const data = buf.subarray(p, p + ml); p += ml;
      if (mt === 0x51) meta.tempos.push({ tick: tick * scale, bpm: 60000000 / data.readUIntBE(0, 3) });
      if (mt === 0x58) meta.times.push({ tick: tick * scale, time: `${data[0]}/${2 ** data[1]}` });
      if (mt === 0x03) meta.names.push({ track: t, name: data.toString('latin1') });
    } else if (status === 0xf0 || status === 0xf7) { p += vlq(); }
    else if (type === 0x90 || type === 0x80) {
      const note = buf[p++]; const vel = buf[p++];
      const key = `${status & 0x0f}:${note}`;
      if (type === 0x90 && vel > 0) { if (!on.has(key)) on.set(key, []); on.get(key).push({ tick, vel }); }
      else { const list = on.get(key); const start = list?.shift(); if (start) notes.push({ start: start.tick * scale, end: tick * scale, pitch: note, vel: start.vel }); }
    } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) p += 2;
    else if (type === 0xc0 || type === 0xd0) p += 1;
  }
  p = end;
  if (notes.length) tracks.push({ index: t, notes });
}

// --- Quantise and split into voices -----------------------------------------------------------
const q = (x) => Math.round(x / grid) * grid;
let moved = 0;
const SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = (n) => `${SHARP[n % 12]}${Math.floor(n / 12) - 1}`;
const DURS = [[3840, '/1'], [2880, '/2.'], [1920, '/2'], [1440, '/4.'], [960, '/4'], [720, '/8.'], [480, '/8'], [360, '/16.'], [320, '/8t'], [240, '/16'], [180, '/32.'], [160, '/16t'], [120, '/32'], [80, '/32t'], [60, '/64'], [40, '/64t']];
// Fewest notes that add up to t (greedy fails on mixes like 360 + 320).
const memo = new Map();
const split = (t) => {
  if (t === 0) return [];
  if (memo.has(t)) return memo.get(t);
  let best = null;
  for (const [d, s] of DURS) {
    if (d > t) continue;
    const rest = split(t - d);
    if (rest && (!best || rest.length + 1 < best.length)) best = [s, ...rest];
  }
  memo.set(t, best);
  return best;
};
const pieces = (t) => { const p = split(t); if (!p) throw new Error(`cannot write ${t}`); return p; };

const result = [];
for (const tr of tracks) {
  const ns = tr.notes.map((n) => {
    const s = q(n.start); let e = q(n.end); if (e <= s) e = s + grid;
    if (Math.abs(s - n.start) > 1 || Math.abs(e - n.end) > grid / 2) moved++;
    return { ...n, start: s, end: e };
  }).sort((a, b) => a.start - b.start || b.pitch - a.pitch);
  // group equal start+end into chords
  const events = [];
  for (const n of ns) {
    const last = events[events.length - 1];
    if (last && last.start === n.start && last.end === n.end) last.pitches.push(n.pitch);
    else events.push({ start: n.start, end: n.end, pitches: [n.pitch], vel: n.vel });
  }
  // greedy voice assignment: highest events to the first free voice (keeps the top line together)
  const voices = [];
  for (const ev of events.sort((a, b) => a.start - b.start || Math.max(...b.pitches) - Math.max(...a.pitches))) {
    let v = voices.find((x) => x.free <= ev.start);
    if (!v) { v = { free: 0, events: [] }; voices.push(v); }
    v.events.push(ev); v.free = ev.end;
  }
  for (const v of voices) result.push({ track: tr.index, events: v.events });
}

// --- Write bars --------------------------------------------------------------------------------
const lastEnd = Math.max(...result.flatMap((v) => v.events.map((e) => e.end)));
const barStart = (i) => (i === 0 ? 0 : pickup + (i - 1) * BAR); // bar 0 is the pickup when there is one
const barLen = (i) => (i === 0 && pickup ? pickup : BAR);
const nbars = pickup ? 1 + Math.ceil((lastEnd - pickup) / BAR) : Math.ceil(lastEnd / BAR);
const first = pickup ? 0 : 1;
const out = result.map((v) => {
  const bars = [];
  for (let i = first; i < first + nbars; i++) {
    const s0 = pickup ? barStart(i) : (i - 1) * BAR; const len = barLen(pickup ? i : 1); const s1 = s0 + len;
    const toks = []; let pos = s0;
    for (const ev of v.events) {
      if (ev.end <= s0 || ev.start >= s1) continue;
      const a = Math.max(ev.start, s0); const b = Math.min(ev.end, s1);
      if (a > pos) for (const d of pieces(a - pos)) toks.push(`r${d}`);
      const name = ev.pitches.length > 1 ? `[${[...ev.pitches].sort((x, y) => x - y).map(nm).join(' ')}]` : nm(ev.pitches[0]);
      const ps = pieces(b - a);
      ps.forEach((d, k) => { const last = k === ps.length - 1; const tie = !last || b < ev.end; toks.push(`${name}${d}${tie ? '~' : ''}`); });
      pos = b;
    }
    if (pos < s1) for (const d of pieces(s1 - pos)) toks.push(`r${d}`);
    bars.push(toks.every((t) => t.startsWith('r')) ? 'R' : toks.join(' '));
  }
  const pitches = v.events.flatMap((e) => e.pitches);
  return { track: v.track, low: nm(Math.min(...pitches)), high: nm(Math.max(...pitches)), notes: v.events.length, bars };
});
console.error(`format ${format}, division ${division}, ${tracks.length} note tracks, ${out.length} voices, ${nbars} bars, ${moved} notes moved by quantising`);
console.error(`tempos: ${meta.tempos.map((t) => `${t.tick}:${t.bpm.toFixed(1)}`).join(' ')} | times: ${meta.times.map((t) => `${t.tick}:${t.time}`).join(' ')}`);
for (const v of out) console.error(`voice track ${v.track}: ${v.notes} events, ${v.low}-${v.high}`);
const json = opt('json', null);
if (json) writeFileSync(json, JSON.stringify(out, null, 1));
