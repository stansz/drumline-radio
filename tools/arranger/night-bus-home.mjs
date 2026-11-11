// Night Bus Home, by MiMo v2.6 Pro, Claude and SZ. An original UK garage track for the Studio style
// at 132 BPM in Bb minor: a wordless vocal hook someone can hum after one listen (a pickup, a peak
// that lands a swung sixteenth ahead of the beat, a skipping fall, and a breath), a chattier verse
// melody of its own, a pre-chorus that climbs to the song's high Eb, and chopped vocal stabs that
// answer in the gaps.
//   The groove is what makes it garage. Every part shares one swing: each second sixteenth of a
//   beat lands SWING ticks late, while the eighths stay straight. The verses run on a 2-step kick
//   (beat 1 and the "and" of 3, so beat 3 is skipped), and the choruses switch to 4x4 speed-garage
//   drums with open hats on the off-beats. The FM Rhodes stabs skip on the off-beat sixteenths, and
//   the bass is a filtered saw that dodges the kick: in the 2-step it answers the skipped beat, in
//   the 4x4 it pumps on the off-beats, and the last bar of each loop drops an octave with a bend.
//   The chord loop is Bbm9 - Gbmaj7 - Dbmaj9 - Ab6, one chord a bar, for every bar but the two
//   pre-choruses, which run Gbmaj7 - Ab9 - Bbm9 - Bbm9 - Gbmaj7 - Dbmaj9 - Absus4 - Ab9. The pad
//   holds root and fifth only, so the melody's colour tones (the 9th, the 6th) never sit a half
//   step against it, and every long melody note is a chord tone of its bar.
//   Built by section over 128 bars: an 8-bar intro, the verse, a rising pre-chorus, the hook; the
//   verse again; a second pre-chorus into a second hook; an 8-bar breakdown with no kick where the
//   vocal sings the hook bare; a build with snare rolls into the final double chorus, which starts
//   in 2-step and opens into 4x4; and a stripped outro for the mixer.
//   Human feel on top of the swing is small on purpose, so the shuffle stays locked: the vocal sits
//   +4 to +12 ticks behind, the stabs +8 to +16, the claps +6 to +12, and velocities vary.
//   node tools/arranger/night-bus-home.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// The one swing every part shares: a note that starts on the second or fourth sixteenth of a beat
// lands this many ticks late (a sixteenth is 240 ticks, so 64 is about 63% swing).
const SWING = 64;
const swingAt = (slot) => (slot % 2 === 1 ? SWING : 0);

const clamp = (x) => Math.max(1, Math.min(127, Math.round(x)));
const U = { 1: '/16', 2: '/8', 3: '/8.', 4: '/4', 6: '/4.', 7: '/4..', 8: '/2', 12: '/2.', 16: '/1' };
// A length with no single duration is written as several, largest first.
const pieces = (u) => {
  const out = [];
  for (const size of [16, 12, 8, 7, 6, 4, 3, 2, 1]) while (u >= size) { out.push(size); u -= size; }
  return out;
};
const shiftOf = (off) => (off ? `${off > 0 ? '+' : ''}${off}` : '');

// --- pitched bars -----------------------------------------------------------
// A bar is a list of [units, token, velocityDelta]; units are sixteenths and must sum to 16. `r` is
// a rest, and a token like `Ab2^Ab1` is a note that bends to the second pitch halfway through. Each
// note gets the swing for the slot it starts on plus a small drift from `drift`, read in turn.
// Lengths with no single duration (like 5 sixteenths) are written as tied notes.
function seq(hits, base, drift = [0]) {
  const toks = [];
  let slot = 0;
  let n = 0;
  for (const [units, token, dv = 0] of hits) {
    if (token === 'r') {
      for (const u of pieces(units)) toks.push(`r${U[u]}`);
    } else {
      const off = swingAt(slot) + drift[n % drift.length];
      n += 1;
      const vel = `:${clamp(base + dv)}`;
      if (token.includes('^')) {
        const [a, b] = token.split('^');
        const held = units - Math.floor(units / 2);
        toks.push(`${a}${U[held]}${shiftOf(off)}${vel}^ ${b}${U[units - held]}`);
      } else if (pieces(units).length > 1) {
        const [first, ...rest] = pieces(units);
        toks.push([`${token}${U[first]}${shiftOf(off)}${vel}`, ...rest.map((u) => `${token}${U[u]}`)].join('~ '));
      } else {
        toks.push(`${token}${U[units]}${shiftOf(off)}${vel}`);
      }
    }
    slot += units;
  }
  if (slot !== 16) throw new Error(`bar is ${slot} sixteenths: ${JSON.stringify(hits)}`);
  return toks.join(' ');
}

// --- drum and stab grid -----------------------------------------------------
// Every bar is sixteen slots. A hit is [slot, spanInSixteenths, levelDelta, offsetTicks, name];
// hits at the same slot and span merge into one chord token like [k cl]. The swing is added here.
const DUR = { 1: '/16', 2: '/8', 3: '/8.', 4: '/4', 8: '/2', 16: '/1' };
function grid(hits, vel) {
  const at = new Map();
  const used = new Set();
  for (const hit of hits) {
    const [slot, span] = hit;
    const prev = at.get(slot);
    if (prev) {
      if (prev[0][1] !== span) throw new Error(`slot ${slot} has hits of different spans`);
      at.set(slot, [...prev, hit]);
      continue;
    }
    for (let i = slot; i < slot + span; i += 1) {
      if (i > 15) throw new Error(`hit at slot ${slot} runs past the bar line`);
      if (used.has(i)) throw new Error(`slot ${i} is taken twice`);
      used.add(i);
    }
    at.set(slot, [hit]);
  }
  const toks = [];
  for (let i = 0; i < 16; i += 1) {
    const hitsAt = at.get(i);
    if (!hitsAt) {
      if (!used.has(i)) toks.push('r/16');
      continue;
    }
    const span = hitsAt[0][1];
    const names = [...new Set(hitsAt.flatMap((h) => h[4].replace(/[[\]]/g, '').split(' ')))];
    const name = names.length === 1 ? names[0] : `[${names.join(' ')}]`;
    const dv = Math.round(hitsAt.reduce((sum, h) => sum + h[2], 0) / hitsAt.length);
    // A merged hit takes the latest offset, except that a kick keeps the grid.
    const kick = hitsAt.find((h) => h[4].includes('k'));
    const off = (kick ? kick[3] : Math.max(...hitsAt.map((h) => h[3]))) + swingAt(i);
    toks.push(`${name}${DUR[span]}${shiftOf(off)}:${clamp(vel + dv)}`);
  }
  return toks.join(' ');
}

// --- the kit ----------------------------------------------------------------
// Velocity tables read from a different place each bar, so no two bars of hats are alike, but the
// timing is the shared swing plus a few ticks, so the shuffle stays locked.
const KICK_V = [0, -4, -1, -6, -2, -5, 0, -3];
const CLAP_V = [0, -5, 2, -3];
const CLAP_O = [8, 12, 6, 10, 9, 11, 7, 12];
const HAT_V = [-4, -12, -6, -14, -2, -10, -8, -12, -4, -14, -6, -10, -2, -12, -8, -10];
const HAT_O = [0, 4, 2, 6, 0, 3, 5, 2];
const GHOST_V = [-30, -24, -34, -26, -32, -22, -28, -25];

// The hats every garage bar shares: a hat on each off-beat eighth and a softer swung sixteenth
// after it ("ts-ka"). `open` makes the off-beat hats open (the speed-garage sound).
function hatHits(i, { open = false, skip = [] } = {}) {
  const hits = [];
  for (const slot of [2, 6, 10, 14]) {
    if (skip.includes(slot)) continue;
    hits.push([slot, 1, HAT_V[(slot + i * 3) % 16] - (open ? 6 : 0), HAT_O[(slot + i) % 8], open ? 'oh' : 'h']);
  }
  for (const slot of [3, 7, 11, 15]) {
    if (skip.includes(slot)) continue;
    hits.push([slot, 1, GHOST_V[(slot + i * 3) % 8], HAT_O[(slot + i * 5) % 8], 'h']);
  }
  return hits;
}

const claps = (i) => [
  [4, 1, CLAP_V[i % 4], CLAP_O[i % 8], '[s cl]'],
  [12, 1, CLAP_V[(i + 2) % 4] - 3, CLAP_O[(i + 3) % 8], '[s cl]'],
];

// A snare roll through the last beat, rising into the next section; it replaces the hats and the
// clap there.
const rollHits = (from = 12) =>
  Array.from({ length: 16 - from }, (_, j) => [from + j, 1, -22 + j * (30 / (16 - from)), 4, 's']);
const withRoll = (hits, from = 12) => [...hits.filter((h) => h[0] < from || h[4] === 'k'), ...rollHits(from)];

// The 2-step: the kick on beat 1 and the "and" of 3, skipping beat 3; every fourth bar a soft kick
// on the swung sixteenth before beat 3 bounces it. Ghost snares fill the skipped beat.
function twoStep(i, vel, { kick = true, clap = true, ghosts = true, fill = false, crash = false } = {}) {
  const hits = [];
  if (kick) {
    hits.push([0, 1, KICK_V[i % 8], 0, crash ? '[k cr]' : 'k']);
    hits.push([10, 1, KICK_V[(i + 3) % 8] - 2, 0, 'k']);
    if (i % 4 === 3) hits.push([7, 1, -16, 0, 'k']);
  } else if (crash) hits.push([0, 1, -20, 0, 'cr']);
  if (clap) hits.push(...claps(i));
  hits.push(...hatHits(i, { skip: kick && i % 4 === 3 ? [7] : [] }));
  if (ghosts) {
    hits.push([9, 1, GHOST_V[i % 8] + 4, 2, 's']);
    if (i % 2 === 1) hits.push([13, 1, GHOST_V[(i + 2) % 8] + 2, 2, 's']);
  }
  return grid(fill ? withRoll(hits) : hits, vel);
}

// The 4x4: a kick on every beat, open hats on the off-beats, swung closed hats between, and a ghost
// snare on the swung sixteenth before beat 4.
function fourFour(i, vel, { fill = false, crash = false, open = true } = {}) {
  const hits = [];
  for (let j = 0; j < 4; j += 1) hits.push([4 * j, 1, KICK_V[(j + i) % 8], 0, crash && j === 0 ? '[k cr]' : 'k']);
  hits.push(...claps(i));
  hits.push(...hatHits(i, { open }));
  hits.push([9, 1, GHOST_V[(i + 1) % 8] + 2, 2, 's']);
  return grid(fill ? withRoll(hits) : hits, vel);
}

// The build: 2-step bars gathering into a 4x4 with a long snare roll.
// Phase 0 is a plain 2-step, 1 a 2-step with a last-beat roll, 2 a 4x4 whose second half rolls,
// and 3 a 4x4 under a full bar of rising sixteenth snares.
const fourKicks = () => [0, 4, 8, 12].map((slot, j) => [slot, 1, -2 * j, 0, 'k']);
function buildBar(i, vel, phase) {
  if (phase === 0) return twoStep(i, vel);
  if (phase === 1) return twoStep(i, vel, { fill: true });
  if (phase === 2) return grid(withRoll([...fourKicks(), ...claps(i), ...hatHits(i)], 8), vel);
  return grid([...fourKicks(), ...rollHits(0)], vel);
}

// --- bass -------------------------------------------------------------------
// A filtered saw that dodges the kick. Roots sit low; the octave pops and the bend drops give the
// garage bounce.
const ROOTS = { Bbm: 'Bb1', Gbmaj: 'Gb1', Dbmaj: 'Db2', Ab: 'Ab1', Ab9: 'Ab1', Absus: 'Ab1' };
const FIFTHS = { Bbm: 'F2', Gbmaj: 'Db2', Dbmaj: 'Ab2', Ab: 'Eb2', Ab9: 'Eb2', Absus: 'Eb2' };
const up = (p) => `${p.slice(0, -1)}${Number(p.slice(-1)) + 1}`;
const BASS_O = [0, 4, 2, 6, 3, 5];
// `two`: under the 2-step kick (beat 1 and slot 10), the bass fills the skipped beat 3 and comes
// back on the swung sixteenth after the second kick.
// `four`: under the 4x4, it pumps on the off-beats. `light`: one held root and a pickup.
// `drop` ends the bar on an octave that bends down to the root.
function bassBar(chord, vel, { feel = 'two', drop = false } = {}) {
  const r = ROOTS[chord];
  const f = FIFTHS[chord];
  const o = up(r);
  let hits;
  if (feel === 'light') hits = [[8, r, 0], [3, 'r'], [2, f, -10], [3, 'r']];
  else if (feel === 'four')
    hits = [[2, 'r'], [2, r, 0], [1, 'r'], [1, r, -10], [2, o, -4], [2, 'r'], [2, r, -2], [1, 'r'], [1, f, -10],
      ...(drop ? [[2, `${o}^${r}`, -2]] : [[2, r, -6]])];
  else
    hits = [[3, r, 0], [1, o, -12], [2, 'r'], [1, r, -10], [1, 'r'], [2, r, -2], [1, 'r'], [2, f, -6],
      ...(drop ? [[3, `${o}^${r}`, -2]] : [[2, r, -8], [1, 'r']])];
  return seq(hits, vel, BASS_O);
}

// --- Rhodes stabs -----------------------------------------------------------
// Skippy stabs on the off-beat sixteenths, a two-bar figure, one voicing per chord.
const VOICINGS = {
  Bbm: '[Db4 F4 Ab4 C5]',
  Gbmaj: '[Bb3 Db4 F4]',
  Dbmaj: '[Db4 F4 Ab4 C5]',
  Ab: '[C4 Eb4 F4]',
  Ab9: '[C4 Eb4 Gb4 Bb4]',
  Absus: '[Db4 Eb4 Ab4]',
};
const STAB_O = [10, 14, 8, 16, 12, 9, 15, 11];
const STAB_V = [2, -8, 0, -6, 4, -10, -2, -4];
// [slot, span] pairs. A: the "ka-chunk" figure; B: its answer, pushed onto the next bar's lead-in.
const STABS = {
  A: [[3, 2], [6, 2], [10, 1], [13, 2]],
  B: [[2, 1], [3, 2], [7, 2], [11, 2], [14, 2]],
  sparse: [[3, 2], [10, 2]],
  lift: [[6, 2], [14, 2]],
};
function stabBar(chord, i, vel, figure) {
  const v = VOICINGS[chord];
  return grid(figure.map(([slot, span], j) => [slot, span, STAB_V[(j + i) % 8], STAB_O[(slot + i * 3) % 8], v]), vel);
}

// --- pad --------------------------------------------------------------------
// Root and fifth only, one whole bar per chord: open fifths leave the melody's colour tones room.
const PADS = {
  Bbm: '[Bb2 F3]',
  Gbmaj: '[Gb2 Db3]',
  Dbmaj: '[Db3 Ab3]',
  Ab: '[Ab2 Eb3]',
  Ab9: '[Ab2 Eb3]',
  Absus: '[Ab2 Eb3]',
};
const padBar = (chord, vel) => `${PADS[chord]}/1:${clamp(vel)}`;

// --- the melodies -----------------------------------------------------------
// The vocal drifts a few ticks behind the beat on top of the swing.
const LEAD_O = [6, 10, 4, 12, 8, 5, 11, 7];

// The hook: a pickup on the off-beat eighth, a peak that lands a swung sixteenth ahead of beat 2,
// a skipping fall on swung sixteenths, and a breath. Bars 5-6 repeat bars 1-2, and bar 7 rises to
// the song's high Eb before the fall in bar 8.
const peak = (a, b, c, d) => [[2, 'r'], [1, a, -8], [5, b, 4], [1, 'r'], [2, c, -6], [2, d, -10], [3, 'r']];
const reach = (a, b, c, d, e) => [[2, 'r'], [1, a, -8], [2, b, -2], [5, c, 4], [1, 'r'], [2, d, -4], [3, e, -8]];
const land = (a, b) => [[1, 'r'], [2, a, -8], [7, b, 0], [6, 'r']];
const HOOK = [
  peak('F5', 'Bb5', 'Ab5', 'F5'),
  peak('Db5', 'F5', 'Eb5', 'Db5'),
  reach('Ab5', 'Bb5', 'Db6', 'C6', 'Bb5'),
  land('Ab5', 'F5'),
  peak('F5', 'Bb5', 'Ab5', 'F5'),
  peak('Db5', 'F5', 'Eb5', 'Db5'),
  reach('Ab5', 'Bb5', 'Db6', 'Eb6', 'Db6'),
  land('C6', 'Ab5'),
];

// The verse: its own tune, a register lower and chattier, skipping across the swung sixteenths.
// The second four bars move the figure a sixteenth later and land on beat 4.
const v1 = (a, b, c, d, e) => [[2, 'r'], [1, a, -8], [2, b, -6], [3, c, -2], [1, 'r'], [2, d, -6], [4, e, 0], [1, 'r']];
const v2 = (a, b, c, d, e) => [[3, 'r'], [1, a, -8], [2, b, -4], [2, c, -6], [1, 'r'], [3, d, -2], [4, e, 2]];
const VERSE = [
  v1('Db5', 'Db5', 'F5', 'F5', 'Db5'),
  v1('Eb5', 'F5', 'Eb5', 'Db5', 'Bb4'),
  v1('F5', 'Ab5', 'F5', 'Eb5', 'Db5'),
  [[2, 'r'], [1, 'Eb5', -8], [2, 'F5', -6], [3, 'Eb5', -4], [3, 'r'], [2, 'C5', -8], [3, 'r']],
  v2('Db5', 'Db5', 'F5', 'F5', 'Db5'),
  v2('Eb5', 'F5', 'Eb5', 'Db5', 'Bb4'),
  v2('F5', 'Ab5', 'F5', 'Eb5', 'Db5'),
  v2('Eb5', 'F5', 'Ab5', 'F5', 'Eb5'),
];

// The pre-chorus: two rising four-bar lines over Gbmaj7-Ab9-Bbm9-Bbm9, gathering to the high Eb.
const climb = (a, b, c, d, e) => [[2, a, -8], [1, 'r'], [2, b, -6], [5, c, 2], [1, 'r'], [2, d, -8], [3, e, -6]];
const PRE = [
  climb('Db5', 'Eb5', 'F5', 'Eb5', 'F5'),
  climb('F5', 'Gb5', 'Ab5', 'Gb5', 'Ab5'),
  climb('Ab5', 'Bb5', 'C6', 'Bb5', 'Ab5'),
  [[8, 'Bb5', 2], [8, 'r']],
  climb('Db5', 'Eb5', 'F5', 'Eb5', 'F5'),
  climb('Ab5', 'Bb5', 'C6', 'Db6', 'C6'),
  climb('C6', 'Db6', 'Eb6', 'Db6', 'C6'),
  [[1, 'r'], [2, 'Bb5', -8], [1, 'Ab5', -10], [4, 'Eb5', -6], [8, 'r']],
];

// --- vocal chops ------------------------------------------------------------
// Short stabs of the vox cut from the chord's tones, on the swung sixteenths, answering the vocal
// where it breathes. Kept a register under the hook.
const CHOP = {
  Bbm: ['Db5', 'F5', 'Ab4'],
  Gbmaj: ['Db5', 'Bb4', 'Db5'],
  Dbmaj: ['F5', 'Ab4', 'Db5'],
  Ab: ['Eb5', 'C5', 'Ab4'],
  Ab9: ['Eb5', 'C5', 'Bb4'],
  Absus: ['Eb5', 'Db5', 'Ab4'],
};
const CHOP_O = [4, 8, 2, 6];
function chopBar(chord, vel, shape) {
  const [a, b, c] = CHOP[chord];
  const shapes = {
    // A full bar of chops, for bars where the vocal rests.
    full: [[3, 'r'], [1, a, 0], [2, 'r'], [1, a, -8], [1, b, -4], [2, 'r'], [1, a, -6], [2, 'r'], [2, c, -2], [1, 'r']],
    // An answer in the back half of the bar, where the hook breathes.
    tail: [[11, 'r'], [1, a, -4], [1, b, -8], [1, 'r'], [1, c, -2], [1, 'r']],
    // One stuttered pickup into the next bar.
    stutter: [[13, 'r'], [1, a, -6], [1, a, -10], [1, b, -2]],
  };
  return seq(shapes[shape], vel, CHOP_O);
}

// --- sections ---------------------------------------------------------------
const R = 'R';
const bars = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const LOOP = ['Bbm', 'Gbmaj', 'Dbmaj', 'Ab'];
const PRE_CHORDS = ['Gbmaj', 'Ab9', 'Bbm', 'Bbm', 'Gbmaj', 'Dbmaj', 'Absus', 'Ab9'];
const loop = (i) => LOOP[i % 4];
const stabFig = (i) => (i % 2 ? STABS.B : STABS.A);

const keys = ['lead', 'chops', 'keys', 'pad', 'bass', 'drums'];
const tracks = Object.fromEntries(keys.map((k) => [k, []]));
const marks = [];
function section(name, n, parts) {
  marks.push([tracks.lead.length, name]);
  for (const key of keys) {
    const list = parts[key] ?? [];
    if (list.length > n) throw new Error(`${name}: ${key} has ${list.length} bars, more than ${n}`);
    for (let i = 0; i < n; i += 1) tracks[key].push(list[i] ?? R);
  }
}
const lead = (rows, base) => rows.map((bar) => seq(bar, base, LEAD_O));
// The chops answer in the hook's gaps: the tail of bars 4 and 8, a stutter before the turnaround.
const hookChops = (i, vel) => (i % 4 === 3 ? chopBar(loop(i), vel, 'tail') : i % 8 === 6 ? chopBar(loop(i), vel - 4, 'stutter') : R);

// 1. Bars 1-8. Intro: 2-step drums build up, then the stabs and bass, with the vocal chops teasing
// the hook. The vocal stays out.
section('Intro', 8, {
  drums: [...bars(4, (i) => twoStep(i, 88, { clap: i >= 2, ghosts: false })), ...bars(3, (i) => twoStep(i + 4, 94)), twoStep(7, 96, { fill: true })],
  pad: bars(8, (i) => padBar(loop(i), 66 + 2 * i)),
  bass: [...bars(4, () => R), ...bars(4, (i) => bassBar(loop(i), 76, { feel: 'light' }))],
  keys: [...bars(4, () => R), ...bars(4, (i) => stabBar(loop(i), i, 82, STABS.sparse))],
  chops: bars(8, (i) => (i % 2 === 1 ? chopBar(loop(i), 72 + 2 * i, 'full') : R)),
});

// 2. Bars 9-24. Verse 1: the vocal's own tune over the 2-step, the chops answering at the end of
// each four bars.
section('Verse 1', 16, {
  lead: [...lead(VERSE, 94), ...lead(VERSE, 98)],
  drums: bars(16, (i) => twoStep(i, 98, { fill: i % 8 === 7 })),
  bass: bars(16, (i) => bassBar(loop(i), 80, { drop: i % 8 === 7 })),
  keys: bars(16, (i) => stabBar(loop(i), i, 84, i % 4 === 3 ? STABS.lift : stabFig(i))),
  pad: bars(16, (i) => padBar(loop(i), 74)),
  chops: bars(16, (i) => (i % 4 === 3 ? chopBar(loop(i), 76, 'stutter') : R)),
});

// 3. Bars 25-32. Pre-chorus 1: the vocal climbs over the 2-step, the stabs thicken, and the last
// bars roll into the hook.
section('Pre-chorus 1', 8, {
  lead: lead(PRE, 96),
  drums: [...bars(6, (i) => twoStep(i, 100)), buildBar(6, 102, 1), buildBar(7, 104, 3)],
  bass: bars(8, (i) => bassBar(PRE_CHORDS[i], 84, { drop: i === 3 })),
  keys: bars(8, (i) => stabBar(PRE_CHORDS[i], i, 88, stabFig(i))),
  pad: bars(8, (i) => padBar(PRE_CHORDS[i], 76)),
  chops: [R, R, R, chopBar('Bbm', 80, 'full'), R, R, R, R],
});

// 4. Bars 33-48. Chorus 1: the hook twice over 4x4 speed-garage drums and the pumping bass.
section('Chorus 1', 16, {
  lead: [...lead(HOOK, 102), ...lead(HOOK, 106)],
  drums: bars(16, (i) => fourFour(i, 104, { fill: i % 8 === 7, crash: i === 0 })),
  bass: bars(16, (i) => bassBar(loop(i), 88, { feel: 'four', drop: i % 4 === 3 })),
  keys: bars(16, (i) => stabBar(loop(i), i, 92, stabFig(i))),
  pad: bars(16, (i) => padBar(loop(i), 78)),
  chops: bars(16, (i) => hookChops(i, 84)),
});

// 5. Bars 49-64. Verse 2: back to the 2-step, with more chops between the lines.
section('Verse 2', 16, {
  lead: [...lead(VERSE, 98), ...lead(VERSE, 102)],
  drums: bars(16, (i) => twoStep(i, 100, { fill: i % 8 === 7 })),
  bass: bars(16, (i) => bassBar(loop(i), 82, { drop: i % 4 === 3 })),
  keys: bars(16, (i) => stabBar(loop(i), i, 88, stabFig(i))),
  pad: bars(16, (i) => padBar(loop(i), 76)),
  chops: bars(16, (i) => (i % 4 === 3 ? chopBar(loop(i), 80, 'stutter') : i % 4 === 1 ? chopBar(loop(i), 74, 'tail') : R)),
});

// 6. Bars 65-72. Pre-chorus 2: the same climb, a touch hotter.
section('Pre-chorus 2', 8, {
  lead: lead(PRE, 100),
  drums: [...bars(6, (i) => twoStep(i, 102)), buildBar(6, 104, 1), buildBar(7, 106, 3)],
  bass: bars(8, (i) => bassBar(PRE_CHORDS[i], 86, { drop: i === 3 })),
  keys: bars(8, (i) => stabBar(PRE_CHORDS[i], i, 92, stabFig(i))),
  pad: bars(8, (i) => padBar(PRE_CHORDS[i], 78)),
  chops: [R, R, R, chopBar('Bbm', 84, 'full'), R, R, R, R],
});

// 7. Bars 73-88. Chorus 2: the hook twice, a little hotter.
section('Chorus 2', 16, {
  lead: [...lead(HOOK, 106), ...lead(HOOK, 108)],
  drums: bars(16, (i) => fourFour(i, 106, { fill: i % 8 === 7, crash: i === 0 })),
  bass: bars(16, (i) => bassBar(loop(i), 90, { feel: 'four', drop: i % 4 === 3 })),
  keys: bars(16, (i) => stabBar(loop(i), i, 94, stabFig(i))),
  pad: bars(16, (i) => padBar(loop(i), 80)),
  chops: bars(16, (i) => hookChops(i, 86)),
});

// 8. Bars 89-96. Breakdown: the kick drops out and the vocal sings the hook bare over the pad, the
// stabs, the chops and soft hats; the bass slides back under the second half.
section('Breakdown', 8, {
  lead: [...lead(HOOK.slice(0, 4), 76), ...lead(HOOK.slice(0, 2), 84), R, R],
  drums: [...bars(4, (i) => twoStep(i, 74, { kick: false, clap: i % 2 === 1, ghosts: false })), ...bars(3, (i) => twoStep(i, 82, { kick: false })), twoStep(7, 92, { kick: false, fill: true })],
  bass: [R, R, ...bars(4, (i) => bassBar(loop(i + 2), 62 + 2 * i, { feel: 'light' })), ...bars(2, (i) => bassBar(loop(i + 2), 74))],
  keys: bars(8, (i) => stabBar(loop(i), i, 78, i < 4 ? STABS.sparse : stabFig(i))),
  pad: bars(8, (i) => padBar(loop(i), 82)),
  chops: [R, R, R, chopBar(loop(3), 72, 'tail'), R, R, chopBar(loop(6), 76, 'full'), chopBar(loop(7), 80, 'full')],
});

// 9. Bars 97-104. Build: 2-step gathering into a 4x4 roll behind the stabs, the vocal climbing to
// the high Eb into the drop.
section('Build', 8, {
  lead: [
    ...bars(4, () => R),
    seq([[3, 'r'], [2, 'F5', -6], [3, 'Ab5', -4], [3, 'Bb5', 0], [5, 'C6', 2]], 100, LEAD_O),
    seq([[8, 'Db6', 4], [8, 'r']], 104, LEAD_O),
    seq([[3, 'r'], [2, 'Ab5', -6], [3, 'Bb5', -4], [3, 'C6', 0], [5, 'Db6', 2]], 104, LEAD_O),
    seq([[8, 'Eb6', 4], [8, 'r']], 108, LEAD_O),
  ],
  drums: [...bars(4, (i) => buildBar(i, 96, 0)), buildBar(4, 100, 0), buildBar(5, 100, 1), buildBar(6, 104, 2), buildBar(7, 108, 3)],
  bass: [...bars(4, (i) => bassBar(loop(i), 70, { feel: 'light' })), ...bars(4, (i) => bassBar(loop(i), 80, { drop: i === 3 }))],
  keys: bars(8, (i) => stabBar(loop(i), i, 84 + 2 * i, stabFig(i))),
  pad: bars(8, (i) => padBar(loop(i), 80)),
  chops: [chopBar(loop(0), 76, 'full'), R, chopBar(loop(2), 80, 'full'), R],
});

// 10. Bars 105-120. The final double chorus: the first pass back in 2-step, the second opening into
// the 4x4 with the chops filling every gap.
section('Final chorus', 16, {
  lead: [...lead(HOOK, 110), ...lead(HOOK, 112)],
  drums: bars(16, (i) => (i < 8 ? twoStep(i, 108, { fill: i === 7, crash: i === 0 }) : fourFour(i, 108, { fill: i === 15, crash: i === 8 }))),
  bass: bars(16, (i) => bassBar(loop(i), 92, { feel: i < 8 ? 'two' : 'four', drop: i % 4 === 3 })),
  keys: bars(16, (i) => stabBar(loop(i), i, 96, stabFig(i))),
  pad: bars(16, (i) => padBar(loop(i), 82)),
  chops: bars(16, (i) => (i >= 8 && i % 4 !== 3 && i % 8 !== 6 ? chopBar(loop(i), 78, 'tail') : hookChops(i, 88))),
});

// 11. Bars 121-128. Outro for the mixer: the vocal takes the hook's first four bars once more, then
// the layers leave one by one until only the 2-step kick and hats are left.
section('Outro', 8, {
  lead: [...lead(HOOK.slice(0, 4), 82), ...bars(4, () => R)],
  drums: [
    ...bars(4, (i) => twoStep(i, 102)),
    ...bars(2, (i) => twoStep(i + 4, 96, { ghosts: false })),
    twoStep(6, 90, { clap: false, ghosts: false }),
    grid([[0, 1, 0, 0, '[k cr]'], [10, 1, -6, 0, 'k'], [2, 1, -10, 2, 'h'], [3, 1, -30, 2, 'h'], [6, 1, -12, 4, 'h']], 88),
  ],
  bass: [...bars(4, (i) => bassBar(loop(i), 76, { drop: i === 3 })), ...bars(3, (i) => bassBar(loop(i), 66 - 4 * i, { feel: 'light' })), R],
  keys: [...bars(4, (i) => stabBar(loop(i), i, 88, stabFig(i))), ...bars(2, (i) => stabBar(loop(i), i, 80, STABS.sparse)), R, R],
  pad: bars(8, (i) => padBar(loop(i), 78 - 2 * (i > 5 ? i - 5 : 0))),
  chops: [R, R, R, chopBar(loop(3), 80, 'tail'), chopBar(loop(4), 74, 'full'), R, chopBar(loop(6), 68, 'full'), R],
});

// --- checks -----------------------------------------------------------------
// Every bar must be exactly one 4/4 bar (3840 ticks). The builders guarantee it; this reads the
// finished strings again so a hand-written bar can't slip past.
const DUR_TICKS = { '/1': 3840, '/2': 1920, '/2.': 2880, '/4': 960, '/4.': 1440, '/4..': 1680, '/8': 480, '/8.': 720, '/16': 240 };
const barTicks = (bar) => {
  if (bar === R) return 3840;
  let sum = 0;
  const tokens = bar.match(/\[[^\]]*\][^\s]*|[^\s]+/g) ?? [];
  for (const token of tokens) {
    const m = token.match(/\/\d+(?:\.\.|\.|t)?/);
    if (!m) throw new Error(`no duration in token ${token}`);
    sum += DUR_TICKS[m[0]];
  }
  return sum;
};
for (const key of keys) {
  tracks[key].forEach((bar, i) => {
    const got = barTicks(bar);
    if (got !== 3840) throw new Error(`track ${key} bar ${i + 1} is ${got} ticks: ${bar}`);
  });
}

const total = tracks.lead.length;
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

const text = `# Night Bus Home, by MiMo v2.6 Pro, Claude and SZ. An original UK garage track for the Studio
# style at 132 BPM in Bb minor: a wordless vocal hook someone can hum after one listen - a pickup, a
# peak that lands a swung sixteenth ahead of the beat, a skipping fall, and a breath - with chopped
# vocal stabs answering in its gaps. The verse has a chattier tune of its own, and each pre-chorus
# climbs to the song's high Eb before the hook. A breakdown drops the kick so the vocal sings the
# hook bare, snare rolls build back up, and the final double chorus runs into a stripped outro.
#
# The groove: every part shares one swing (each second sixteenth of a beat lands ${SWING} ticks late,
# the eighths stay straight). The verses run on a 2-step kick (beat 1 and the "and" of 3), the
# choruses on 4x4 speed-garage drums with open off-beat hats. The FM Rhodes stabs skip on the
# off-beat sixteenths, and the saw bass dodges the kick, dropping an octave with a bend at the end
# of each loop.
#
# The chord loop is Bbm9 - Gbmaj7 - Dbmaj9 - Ab6, one chord a bar, except the two pre-choruses
# (Gbmaj7 - Ab9 - Bbm9 - Bbm9 - Gbmaj7 - Dbmaj9 - Absus4 - Ab9). The pad holds root and fifth only,
# so the melody's colour tones never sit a half step against it, and every long melody note is a
# chord tone of its bar.
# chords: Bbm9 Gbmaj7 Dbmaj9 Ab6
# chords @25: Gbmaj7 Ab9 Bbm9 Bbm9 Gbmaj7 Dbmaj9 Absus4 Ab9
# chords @33: Bbm9 Gbmaj7 Dbmaj9 Ab6
# chords @65: Gbmaj7 Ab9 Bbm9 Bbm9 Gbmaj7 Dbmaj9 Absus4 Ab9
# chords @73: Bbm9 Gbmaj7 Dbmaj9 Ab6
title: Night Bus Home
composer: MiMo v2.6 Pro, Claude & SZ
about: UK garage at 132 in Bb minor: a humming wordless vocal hook and chopped vocal stabs over skippy Rhodes, a 2-step that opens into 4x4 for the choruses, and a bass that ducks the kick.
year: 2026
source: original
category: originals
style: studio
key: Bb minor
tempo: 132
time: 4/4

track lead role=lead inst=vox-lead vol=0.95
${block('lead')}

track chops role=lead2 inst=vox-lead vol=0.9 pan=0.3
${block('chops')}

track keys role=chords inst=fm-rhodes vol=0.6 pan=-0.2
${block('keys')}

track pad role=pad inst=warm-pad vol=0.75
${block('pad')}

track bass role=bass inst=synth-bass vol=0.75
${block('bass')}

track drums role=drums inst=909-kit vol=0.85
${block('drums')}

`;
writeFileSync(join(out, 'night-bus-home.song'), text);
console.log(`wrote ${out}/night-bus-home.song (${total} bars)`);
