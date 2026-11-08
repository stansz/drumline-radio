// Fathom: an original dub techno track for the Techno style, by Qwen3.8 Flash and SZ. One G minor
// chord stab, echoing and smearing, over a deep rumbling sub, a soft hiss of hats, and a lot of
// space, at 118 BPM. No acid line and no lead: the chord and its repeats are the whole song. Built
// by section over 152 bars (5:09), DJ-style, changing something every 16 bars: the lone stab with
// its written fading echoes, soft hats and a sub drone in, the kick dropping, the stab's rhythm and
// voicing turning over, a second high stab layer arriving and leaving, a dub pass where the echoes
// take over, a breakdown with no kick and the chord hanging in the pad, the groove back and widest,
// then a slow strip-down to the stab alone in the dark.
//   Everything is one chord: G minor, voiced eight ways. The material is G, Bb, C, D, F, so no note
//   ever sits a half step against the pad's G-Bb-D or the sub's G and D.
//   All seven tracks use the Techno style's own role patches: chords -> Chord stab (the stabs and
//   the echo layer), pad -> Dark pad, bass -> Sub bass, drums -> 909 kit. No inst= needed.
//   node tools/arranger/fathom.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// Flat spellings, so every note reads in G minor.
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = (n) => `${FLAT[n % 12]}${Math.floor(n / 12) - 1}`;
const chordOf = (notes) => `[${notes.map(nm).join(' ')}]`;
const clamp = (x) => Math.max(1, Math.min(127, Math.round(x)));

// The one chord, voiced eight ways. Nothing here is a half step from the pad or the sub, so the
// song has no clashes by construction.
const V = {
  core: chordOf([67, 70, 74]), //    G4 Bb4 D5
  seven: chordOf([70, 74, 77]), //   Bb4 D5 F5   (the seventh, no root)
  low: chordOf([62, 67, 70]), //     D4 G4 Bb4   (five under the third)
  four: chordOf([65, 70, 74]), //    F4 Bb4 D5
  five: chordOf([67, 74, 79]), //    G4 D5 G5    (open fifth, no third)
  eleven: chordOf([67, 72, 74]), //  G4 C5 D5    (the eleventh, airy)
  high: chordOf([74, 79, 82]), //    D5 G5 Bb5   (the echo layer, an octave up)
  highTwo: chordOf([72, 77, 82]), // C5 F5 Bb5
};
const P = {
  low: chordOf([43, 46, 50]), //   G2 Bb2 D3   (the dark pad, low)
  mid: chordOf([50, 55, 58]), //   D3 G3 Bb3
  five: chordOf([43, 50, 55]), //  G2 D3 G3    (open, for the long hangs)
};
const G1 = nm(31); // the sub's root, 49 Hz
const D2 = nm(38); // its fifth, 73 Hz

// --- the sixteenth grid -----------------------------------------------------
// Every bar is built on sixteen slots (a sixteenth each, 240 ticks), so the arithmetic always lands
// on 3840 ticks. A hit is [slot, spanInSixteenths, levelDelta, offsetTicks, token].
const DUR = { 1: '/16', 2: '/8', 4: '/4', 8: '/2', 16: '/1' };

function grid(token, hits, vel) {
  const at = new Map();
  const used = new Set();
  for (const hit of hits) {
    const [slot, span] = hit;
    for (let i = slot; i < slot + span; i += 1) {
      if (i > 15) throw new Error(`hit at slot ${slot} runs past the bar line`);
      if (used.has(i)) throw new Error(`slot ${i} is taken twice`);
      used.add(i);
    }
    at.set(slot, hit);
  }
  const toks = [];
  for (let i = 0; i < 16; i += 1) {
    const hit = at.get(i);
    if (!hit) {
      if (!used.has(i)) toks.push('r/16'); // a slot a longer hit already covers writes no token
      continue;
    }
    const [, span, dv, off, name] = hit;
    const shift = off ? `${off > 0 ? '+' : ''}${off}` : '';
    // the floor keeps a fading echo a ghost rather than a silence
    toks.push(`${name ?? token}${DUR[span]}${shift}:${Math.max(18, clamp(vel + dv))}`);
  }
  return toks.join(' ');
}

// --- stab patterns ----------------------------------------------------------
// Every stab sits a few ticks behind the grid and each echo repeat lands later and softer than the
// one before it, the way a tape delay slips. Three sixteenths (720 ticks) is the Techno style's own
// dotted-eighth delay, so the written repeats fall exactly where the machine's would.
const ST = {
  A: [[0, 1, 0, 16], [3, 1, -16, 22], [6, 1, -28, 28], [9, 1, -38, 34], [12, 1, -46, 40]],
  B: [[2, 1, 4, 14], [5, 1, -14, 20], [8, 1, -26, 26], [11, 1, -36, 32], [14, 1, -44, 38]],
  C: [[0, 2, 0, 18], [3, 1, -14, 24], [6, 1, -24, 30], [8, 2, -6, 12], [11, 1, -20, 26], [14, 1, -30, 34]],
  D: [[0, 8, 0, 20], [8, 4, -10, 16], [12, 4, -20, 24]], // the chord hanging
  E: [[0, 1, 0, 12], [2, 1, -6, 16], [4, 1, 2, 14], [6, 1, -10, 18], [8, 1, 0, 12], [10, 1, -8, 16], [12, 1, 4, 14], [14, 1, -14, 18]],
  F: [[0, 4, 0, 16], [6, 1, -20, 24], [12, 2, -8, 18]],
  G: [[0, 8, 0, 20], [12, 1, -18, 28], [14, 1, -28, 34]],
  T: [[0, 1, 0, 14], [3, 1, -18, 22], [6, 1, -32, 30], [9, 1, -44, 38], [12, 1, -54, 46]], // a long trail
  // the echo layer answers in the gaps of the main stab
  e1: [[6, 1, 0, 18], [11, 1, -18, 26]],
  e2: [[0, 1, 0, 16], [3, 1, -20, 24], [6, 1, -34, 32], [9, 1, -46, 40]],
  e3: [[2, 1, 0, 20], [7, 1, -16, 28], [12, 1, -30, 36]],
};
const st = (pattern, voice, vel) => grid(V[voice], ST[pattern], vel);

// A bar plan is [pattern, voicing, level] or null for a bar that rests. The level is measured
// against the section's base, so a whole section moves up or down together. Groove sections run
// hot: the Chord stab has no sustain at all, so a stab only reads near the top of its range.
function plan(rows, base) {
  return rows.map((row) => (row ? st(row[0], row[1], base + row[2]) : R));
}

// --- hat beds ---------------------------------------------------------------
// The hiss is sixteenth closed hats, soft and uneven: a few ticks late on the beats, early on the
// off-beats, and never the same level twice running. `oh` breathes at the end of a bar now and
// then, `rd` washes over the peak. The tables are read from a different place each bar, so no two
// bars of hats feel alike.
const HISS_V = [46, 36, 52, 30, 44, 32, 50, 38, 42, 34, 54, 28, 46, 36, 48, 30];
const HISS_O = [7, -4, 9, -6, 6, -8, 8, -5, 7, -4, 10, -6, 5, -7, 8, -4];
const RD_SLOTS = [0, 6, 10];
const hissHits = (i) =>
  Array.from({ length: 16 }, (_, s) => [s, 1, HISS_V[(s + i * 5) % 16] - 46, HISS_O[(s + i * 3) % 16], 'h']);
const hiss = (i, vel) => grid('h', hissHits(i), vel);
const hissOh = (i, vel, slot = 15) =>
  grid('h', hissHits(i).map((hit) => (hit[0] === slot ? [slot, 1, hit[2] + 10, 6, 'oh'] : hit)), vel);
const ride = (i, vel) =>
  grid('h', hissHits(i).map((hit) => (RD_SLOTS.includes(hit[0]) ? [hit[0], 1, hit[2] + 10, hit[3] + 2, 'rd'] : hit)), vel);
const WASH_V = [44, 34, 46, 32, 42, 36, 48, 30];
const WASH_O = [6, -6, 8, -7, 5, -8, 7, -5];
const wash = (i, vel) =>
  grid('h', WASH_V.map((_, j) => [2 * j, 2, WASH_V[(j + i) % 8] - 40, WASH_O[(j + i) % 8], 'h']), vel);

// --- the kit ----------------------------------------------------------------
// The kick stays on the grid and only its level moves; the stabs and hats are what breathe.
const KICK_V = [0, -5, -1, -7];
const four = (i, vel) => grid('k', [0, 4, 8, 12].map((s, j) => [s, 4, KICK_V[(j + i) % 4], 0, 'k']), vel);
const fourClap = (i, vel) =>
  grid('k', [[0, 4, KICK_V[i % 4], 0, 'k'], [4, 4, -4, 0, '[k cl]'], [8, 4, KICK_V[(2 + i) % 4], 0, 'k'], [12, 4, -6, 0, '[k cl]']], vel);
const fourCrash = (i, vel) =>
  grid('k', [[0, 4, 6, 0, '[k cr]'], [4, 4, KICK_V[(1 + i) % 4], 0, 'k'], [8, 4, KICK_V[(2 + i) % 4], 0, 'k'], [12, 4, KICK_V[(3 + i) % 4], 0, 'k']], vel);
const half = (i, vel) => grid('k', [[0, 4, KICK_V[i % 4], 0, 'k'], [8, 4, -6, 0, 'k']], vel);
const oneHit = (i, vel) => grid('k', [[0, 4, KICK_V[i % 4], 0, 'k']], vel);

// The dub lane: lazy rim ticks that come and go, and one distant snare rumble leading the kick back.
const rim = (vel) => grid('rim', [[6, 1, 0, 10], [14, 1, -8, 14]], vel);
const rim2 = (vel) => grid('rim', [[2, 1, -6, 8], [9, 1, 2, 12], [11, 1, -10, 6]], vel);
const rollFar = (vel) => grid('s', Array.from({ length: 8 }, (_, j) => [8 + j, 1, -34 + 3 * j, 0, 's']), vel);

// --- held chords ------------------------------------------------------------
// Two bars to a swell: the dark pad takes a second to speak, so a short hold never really lands.
function swell(voice, vel, n) {
  const SHAPE = [0, 3, -2, 2];
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const w = vel + SHAPE[i % 4] - Math.floor(i / 4) * 2;
    out.push(i % 2 === 0 ? `${voice}/1:${clamp(w)}~` : `${voice}/1:${clamp(w - 4)}`);
  }
  return out;
}
// n bars tied into one long note: the pad, or the sub, hangs for the whole span.
function tiedBars(voice, vel, n) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(i === n - 1 ? `${voice}/1:${clamp(vel)}` : `${voice}/1:${clamp(vel)}~`);
  return out;
}

// --- the sub bass -----------------------------------------------------------
// Mostly roots, an eighth off the beat so it lands between the kicks.
const bOff = (i, vel, root = G1) => grid(root, [2, 6, 10, 14].map((s, j) => [s, 2, [-2, -8, 0, -10][(j + i) % 4], 3 + (j % 2) * 4]), vel);
const bBreathe = (i, vel, root = G1) => grid(root, [[0, 4, 0, 4], [8, 4, -6, 6]], vel);
const bRoll = (i, vel, root = G1) =>
  grid(root, [0, 2, 4, 6, 8, 10, 12, 14].map((s, j) => [s, 1, [-2, -10, -4, -12, -1, -9, -3, -11][(j + i) % 8], (j % 2) * 5]), vel);

const R = 'R';
const bars = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

const keys = ['stabs', 'echo', 'hang', 'sub', 'drums', 'hats', 'dub'];
const tracks = Object.fromEntries(keys.map((k) => [k, []]));
const marks = [];
function section(name, n, parts) {
  marks.push([tracks.stabs.length, name]);
  for (const key of keys) {
    const list = parts[key] ?? [];
    if (list.length > n) throw new Error(`${name}: ${key} has ${list.length} bars, more than ${n}`);
    for (let i = 0; i < n; i += 1) tracks[key].push(list[i] ?? R);
  }
}

// 1. Bars 1-16. Nothing but the chord at first: one stab, its fading repeats. Then the hiss of
// hats, the sub drone and the pad swell come under it. No kick.
section('The chord alone, echoing', 16, {
  stabs: plan([
    ['G', 'core', -18], null, ['G', 'low', -22], null,
    ['A', 'core', -14], null, ['A', 'seven', -16], ['T', 'four', -20],
    ['A', 'core', -10], ['B', 'low', -12], ['A', 'seven', -10], ['B', 'eleven', -14],
    ['A', 'core', -8], ['T', 'seven', -10], ['B', 'low', -8], ['A', 'five', -6],
  ], 98),
  hats: [...bars(8, () => R), ...bars(4, (i) => wash(i, 55)), ...bars(4, (i) => hiss(i, 57))],
  hang: [...bars(8, () => R), ...swell(P.low, 58, 8)],
  sub: [...bars(8, () => R), ...tiedBars(G1, 62, 4), ...tiedBars(G1, 64, 4)],
  dub: [...bars(14, () => R), rim(64), rim(58)],
});

// 2. Bars 17-32. The kick and the sub drop in together; the stab settles into its loop.
section('The kick and the sub drop in', 16, {
  drums: [fourCrash(0, 104), ...bars(3, (i) => four(i + 1, 104)), ...bars(4, (i) => four(i, 106)), ...bars(4, (i) => four(i, 108)), ...bars(4, (i) => four(i, 106))],
  sub: [...bars(4, (i) => bOff(i, 88)), ...bars(4, (i) => bOff(i, 90, i % 4 === 3 ? D2 : G1)), ...bars(4, (i) => bOff(i, 94)), ...bars(4, (i) => bOff(i, 92, i % 4 === 3 ? D2 : G1))],
  stabs: plan([
    ['A', 'core', -2], null, ['B', 'seven', -6], null,
    ['A', 'low', -2], null, ['T', 'core', -10], ['C', 'four', -2],
    ['A', 'seven', 0], null, ['B', 'core', -4], null,
    ['F', 'eleven', -8], null, ['A', 'five', -1], ['B', 'core', -4],
  ], 106),
  hats: [...bars(12, (i) => hiss(i, 59)), ...bars(4, (i) => hissOh(i, 61))],
  hang: [...swell(P.low, 60, 8), ...swell(P.low, 60, 8)],
  dub: bars(8, (i) => (i % 2 ? R : rim(66))),
});

// 3. Bars 33-48. The second stab layer arrives an octave up, answering in the gaps; the main stab
// turns over to its two-pulse figure and its voicings open up.
section('The second stab arrives', 16, {
  stabs: plan([
    ['C', 'four', -4], null, ['A', 'eleven', -8], ['C', 'core', -2],
    ['F', 'seven', -8], null, ['C', 'low', -2], null,
    ['A', 'five', 0], ['C', 'core', -4], ['F', 'eleven', -8], null,
    ['C', 'seven', 0], ['B', 'core', -4], ['T', 'four', -8], null,
  ], 108),
  echo: plan([
    ['e1', 'high', -6], null, ['e3', 'highTwo', -8], null,
    ['e1', 'highTwo', -6], ['e2', 'high', -8], null, ['e1', 'high', -12],
    ['e3', 'highTwo', -6], null, ['e1', 'high', -6], ['e2', 'highTwo', -8],
    null, ['e1', 'high', -8], ['e3', 'highTwo', -12], null,
  ], 96),
  drums: [...bars(12, (i) => four(i, 108)), ...bars(4, (i) => fourClap(i, 108))],
  sub: [...bars(4, (i) => bOff(i, 96)), ...bars(4, (i) => bRoll(i, 92, i % 4 === 3 ? D2 : G1)), ...bars(4, (i) => bOff(i, 98)), ...bars(4, (i) => bOff(i, 94, i % 4 === 3 ? D2 : G1))],
  hats: [...bars(12, (i) => hiss(i, 61)), ...bars(4, (i) => ride(i, 61))],
  hang: [...swell(P.low, 60, 8), ...swell(P.mid, 64, 8)],
  dub: bars(16, (i) => (i % 3 === 2 ? rim2(68) : i % 3 === 0 ? rim(66) : R)),
});

// 4. Bars 49-64. The dub pass: the stab thins to a hit and a long fading trail, the second layer
// leaves after eight bars, and the pad comes forward under the echoes.
section('Dub: the echoes take over', 16, {
  stabs: plan([
    ['T', 'core', 0], null, ['F', 'seven', -6], null,
    ['T', 'low', -10], null, ['G', 'eleven', -14], null,
    ['T', 'four', -18], null, ['F', 'core', -22], ['B', 'seven', -14],
    null, ['T', 'five', -26], null, ['G', 'core', -18],
  ], 104),
  echo: plan([
    ['e1', 'high', -4], null, ['e3', 'highTwo', -8], null,
    ['e2', 'high', -12], ['e1', 'highTwo', -16], null, ['e3', 'high', -20],
  ], 92),
  hang: [...swell(P.mid, 68, 8), ...swell(P.mid, 66, 8)],
  drums: [...bars(12, (i) => four(i, 102)), ...bars(4, (i) => four(i, 100))],
  sub: [...bars(8, (i) => bOff(i, 88)), ...bars(8, (i) => bBreathe(i, 84, i % 4 === 3 ? D2 : G1))],
  hats: [...bars(8, (i) => hiss(i, 55)), ...bars(7, (i) => wash(i, 51)), hissOh(15, 53)],
  dub: [...bars(4, () => R), ...bars(12, (i) => (i % 2 ? rim(62) : R))],
});

// 5. Bars 65-80. The breakdown: the kick goes, the chord hangs in the pad four bars at a time, the
// echoes stack up, and a distant snare rumble leads the kick back.
section('Breakdown: the kick drops, the chord hangs', 16, {
  stabs: plan([
    ['D', 'five', -18], ['D', 'eleven', -20], ['D', 'core', -18], ['D', 'four', -22],
    ['T', 'seven', -24], null, ['T', 'low', -28], null,
    ['A', 'core', -20], ['A', 'seven', -16], ['T', 'eleven', -12], ['B', 'five', -8],
    ['C', 'core', -6], ['A', 'four', -8], ['B', 'seven', -6], ['A', 'core', -4],
  ], 100),
  hang: [...tiedBars(P.mid, 72, 4), ...tiedBars(P.five, 70, 4), ...tiedBars(P.mid, 72, 4), ...tiedBars(P.low, 66, 4)],
  sub: [...tiedBars(G1, 62, 4), ...tiedBars(G1, 60, 4), ...tiedBars(G1, 58, 4), ...bars(4, (i) => bOff(i, 88))],
  drums: [...bars(8, () => R), ...bars(4, (i) => oneHit(i, 90)), ...bars(4, (i) => four(i, 96 + 2 * i))],
  hats: [...bars(8, (i) => wash(i, 51)), ...bars(4, (i) => hiss(i, 55)), ...bars(4, (i) => hiss(i, 61))],
  dub: [...bars(8, () => R), ...bars(4, (i) => (i % 2 ? rim(60) : R)), R, R, rollFar(104), rollFar(108)],
});

// 6. Bars 81-96. The groove back and widest: a clapped kick, a rolling sub, the stab on every
// off-beat, the echo layer in again, ride wash over the hiss.
section('Back in, and wider', 16, {
  drums: [fourCrash(0, 110), ...bars(7, (i) => fourClap(i + 1, 110)), ...bars(8, (i) => fourClap(i, 112))],
  sub: [...bars(8, (i) => bRoll(i, 98)), ...bars(8, (i) => bRoll(i, 96, i % 4 === 3 ? D2 : G1))],
  stabs: plan([
    ['E', 'core', -4], ['E', 'seven', -8], ['E', 'low', -4], ['E', 'four', -10],
    ['E', 'core', -2], ['E', 'eleven', -8], ['E', 'seven', -4], ['E', 'low', -10],
    ['A', 'five', -2], null, ['B', 'core', -6], ['A', 'seven', -2],
    null, ['A', 'eleven', -4], ['T', 'four', -8], ['B', 'core', -2],
  ], 116),
  echo: plan([
    ['e2', 'high', 0], null, ['e1', 'highTwo', -4], ['e3', 'high', 0],
    null, ['e2', 'highTwo', -4], ['e1', 'high', 0], null,
    ['e3', 'highTwo', 2], ['e1', 'high', -2], null, ['e2', 'highTwo', -6],
    ['e1', 'high', -2], null, ['e3', 'highTwo', -6], ['e1', 'high', -2],
  ], 100),
  hats: [...bars(8, (i) => hiss(i, 65)), ...bars(8, (i) => ride(i, 63))],
  hang: [...swell(P.low, 64, 8), ...swell(P.low, 62, 8)],
  dub: bars(16, (i) => (i % 2 ? rim2(70) : rim(72))),
});

// 7. Bars 97-112. The peak settles: the echo layer slips out, then the pad, and the hats thin.
section('The long hold, and the layers leave', 16, {
  stabs: plan([
    ['F', 'core', -2], null, ['T', 'eleven', -6], ['C', 'seven', -2],
    null, ['A', 'low', -6], ['F', 'five', -10], null,
    ['A', 'core', -10], null, ['T', 'seven', -12], ['B', 'eleven', -14],
    null, ['A', 'core', -12], ['T', 'four', -16], null,
  ], 108),
  echo: plan([['e1', 'high', -6], null, ['e3', 'highTwo', -10], ['e1', 'high', -10]], 98),
  drums: [fourCrash(0, 108), ...bars(7, (i) => fourClap(i + 1, 108)), ...bars(8, (i) => four(i, 106 - (i % 4)))],
  sub: [...bars(8, (i) => bRoll(i, 96)), ...bars(8, (i) => bOff(i, 92, i % 4 === 3 ? D2 : G1))],
  hats: [...bars(8, (i) => hiss(i, 63)), ...bars(8, (i) => wash(i, 57))],
  hang: swell(P.low, 62, 8), // the pad leaves after bar 104
  dub: bars(16, (i) => (i % 2 ? rim(64) : R)),
});

// 8. Bars 113-128. Stripped back: the kick narrows to beats one and three, then goes; the hats fall
// to a whisper and the sub holds again.
section('Stripped back', 16, {
  stabs: plan([
    ['A', 'core', -4], null, ['T', 'seven', -8], null,
    ['F', 'low', -12], null, ['A', 'eleven', -8], ['T', 'four', -14],
    null, ['A', 'core', -12], null, ['G', 'five', -18],
    ['T', 'seven', -22], null, ['B', 'core', -18], ['T', 'low', -26],
  ], 100),
  drums: [...bars(8, (i) => four(i, 100)), ...bars(4, (i) => half(i, 96)), ...bars(4, () => R)],
  hats: [...bars(8, (i) => wash(i, 53)), ...bars(4, (i) => wash(i, 49)), wash(12, 45), wash(13, 43), R, R],
  sub: [...bars(8, (i) => bOff(i, 88)), ...bars(4, (i) => bOff(i, 84, i % 4 === 3 ? D2 : G1)), ...tiedBars(G1, 64, 4)],
  dub: [...bars(8, (i) => (i % 4 === 2 ? rim(62) : R)), ...bars(8, () => R)],
});

// 9. Bars 129-144. Out to the dark: no kit, one last pad swell and one last sub drone, and the stab
// alone with its trails, each pass softer.
section('Out to the dark', 16, {
  stabs: plan([
    ['T', 'core', 0], null, ['F', 'seven', -6], null,
    ['T', 'low', -10], null, ['G', 'five', -16], null,
    ['T', 'seven', -20], null, ['F', 'core', -24], null,
    ['T', 'eleven', -28], null, ['G', 'four', -32], null,
  ], 96),
  hang: [...tiedBars(P.five, 58, 4), ...tiedBars(P.five, 54, 4), ...bars(8, () => R)],
  sub: [...tiedBars(G1, 60, 4), ...tiedBars(G1, 58, 4), ...bars(8, () => R)],
});

// 10. Bars 145-152. The stab alone in the room, until the last chord hangs and nothing answers.
section('The stab alone', 8, {
  stabs: plan([
    ['T', 'core', -6], null, ['G', 'seven', -10], null,
    ['T', 'low', -14], null, ['D', 'five', -8], null,
  ], 92),
});

// --- mix ----------------------------------------------------------------------
// The stabs are the star but peaked 12-16 dB under the kick, so their velocities are lifted here
// (with the echo layer's volume, and the drums and sub lowered, in the track headers below).
tracks.stabs = tracks.stabs.map((bar) =>
  bar.replace(/:(\d+)/g, (_, v) => `:${Math.min(127, Math.round(Number(v) * 1.25))}`),
);

// --- checks -----------------------------------------------------------------
// Every bar must be exactly one 4/4 bar (3840 ticks). The grid builder guarantees it; this reads
// the finished strings again so a hand-written bar can't slip past.
const TICKS = { 1: 3840, 2: 1920, 4: 960, 8: 480, 16: 240, 32: 120, 64: 60 };
const barTicks = (bar) => {
  if (bar === R) return 3840;
  let sum = 0;
  const tokens = bar.match(/\[[^\]]*\][^\s]*|[^\s]+/g) ?? [];
  for (const token of tokens) {
    const m = token.match(/\/(\d+)(\.\.|\.|t)?/);
    if (!m) throw new Error(`no duration in token ${token}`);
    const base = TICKS[Number(m[1])];
    const mul = m[2] === '..' ? 1.75 : m[2] === '.' ? 1.5 : m[2] === 't' ? 2 / 3 : 1;
    sum += base * mul;
  }
  return sum;
};
for (const key of keys) {
  tracks[key].forEach((bar, i) => {
    const got = barTicks(bar);
    if (got !== 3840) throw new Error(`track ${key} bar ${i + 1} is ${got} ticks: ${bar}`);
  });
}

const total = tracks.stabs.length;
const block = (key) => {
  const lines = [];
  const at = new Map(marks);
  let row = [];
  const flush = () => {
    if (row.length) lines.push(`| ${row.join(' | ')} |`);
    row = [];
  };
  tracks[key].forEach((bar, i) => {
    if (at.has(i)) {
      flush();
      lines.push(`# ${at.get(i)}`);
    }
    row.push(bar);
    if (row.length === 4) flush();
  });
  flush();
  return lines.join('\n');
};

const text = `# Fathom, by Qwen3.8 Flash and SZ. An original dub techno piece for the Techno style: one G minor
# chord stab, echoing and smearing, over a deep rumbling sub, a soft hiss of hats, and a lot of
# space at 118 BPM. No acid line and no lead: the chord and its fading repeats are the whole song.
# Built by section over ${total} bars, DJ-style, changing something every 16 bars: the lone stab with its
# written echoes, then hats and a sub drone, then the kick; the stab's rhythm and voicing turning
# over; a second high stab layer arriving and leaving; a dub pass where the echoes take over; a
# breakdown with no kick and the chord hanging in the pad; the groove back and widest; then a slow
# strip-down to the stab alone in the dark. Everything is one chord voiced eight ways (G Bb D F C),
# so nothing ever clashes. Stabs and hats sit a few ticks late and each echo repeat lands later and
# softer than the last, while the kick keeps the grid. All seven tracks are the Techno style's own
# role patches: Chord stab, Dark pad, Sub bass, 909 kit.
title: Fathom
composer: Qwen3.8 Flash & SZ
about: Dub techno in G minor: one chord stab and its fading echoes, a rumbling sub, hiss hats, and long spaces, in the manner of Basic Channel and Deepchord.
year: 2026
source: original
category: originals
style: techno
key: G minor
tempo: 118
time: 4/4

track stabs role=chords vol=1 pan=-0.12
${block('stabs')}

track echo role=chords vol=1 pan=0.45
${block('echo')}

track hang role=pad vol=0.9
${block('hang')}

track sub role=bass vol=0.27
${block('sub')}

track drums role=drums vol=0.5
${block('drums')}

track hats role=drums vol=1 pan=0.22
${block('hats')}

track dub role=drums vol=0.65 pan=-0.45
${block('dub')}
`;
writeFileSync(join(out, 'fathom.song'), text);
console.log(`wrote ${out}/fathom.song (${total} bars)`);
