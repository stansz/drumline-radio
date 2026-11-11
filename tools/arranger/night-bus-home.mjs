// Night Bus Home, by MiMo v2.6 Pro and SZ. An original UK garage house track for the Studio style,
// in the manner of the late-night garage 12-inches: a wordless vocal hook someone can hum after one
// listen (a pickup, a rising fourth to a held peak, a fall, and a breath), a chattier verse melody
// of its own, and a pre-chorus that climbs to the song's high Eb, at 127 BPM in Bb minor. The groove
// is four-on-the-floor with shuffled hats and ghost snares, off-beat FM Rhodes stabs, a 3+3+2 DX
// bass gallop under the kick, warm pad fifths, and a pluck arp in the full sections. Register plan:
// bass low, pad and keys in the middle, the vocal on top; the lead, stabs and hats carry the human
// feel in uneven velocities and small timing offsets.
//   The chord loop is Bbm9 - Gbmaj7 - Dbmaj9 - Ab6, one chord a bar, for every bar but the two
//   pre-choruses, which run Gbmaj7 - Ab9 - Bbm9 - Bbm9 - Gbmaj7 - Dbmaj9 - Absus4 - Ab9. The pad
//   holds root and fifth only, so the melody's colour tones (the 9th, the 6th) never sit a half
//   step against it, and every long melody note is a chord tone of its bar.
//   Built by section over 128 bars: an 8-bar intro, the verse, a rising pre-chorus, the hook; the
//   verse again; a second pre-chorus into a second hook; an 8-bar breakdown with no kick where the
//   vocal sings the hook bare over the pad; a build with snare rolls into the final double chorus;
//   and a stripped outro for the mixer.
//   Human feel: the kick and bass keep the grid (the machine), while the lead drifts +6 to +14
//   ticks late in uneven steps, the Rhodes stabs land +14 to +26 late, the claps drag +10 to +20,
//   the off-beat hats swing +42 to +90 late and the shuffled 16th ghosts later still, and every
//   hat, clap and stab has an uneven velocity.
//   node tools/arranger/night-bus-home.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const clamp = (x) => Math.max(1, Math.min(127, Math.round(x)));
const U = { 1: '/16', 2: '/8', 3: '/8.', 4: '/4', 6: '/4.', 8: '/2', 12: '/2.', 16: '/1' };
const DUR = { 1: '/16', 2: '/8', 4: '/4', 8: '/2', 16: '/1' };

// --- pitched bars -----------------------------------------------------------
// A melody bar is a list of [units, token, velocityDelta, offsetTicks]; units are sixteenths and
// must sum to 16. `r` is a rest. The deltas and offsets are the human feel, written out per note.
function seq(hits, base) {
  const toks = [];
  for (const [units, token, dv = 0, off = 0] of hits) {
    const shift = off ? `${off > 0 ? '+' : ''}${off}` : '';
    toks.push(token === 'r' ? `r${U[units]}` : `${token}${U[units]}${shift}:${clamp(base + dv)}`);
  }
  return toks.join(' ');
}

// --- drum grid --------------------------------------------------------------
// Every bar is sixteen slots (240 ticks each). A hit is [slot, spanInSixteenths, levelDelta,
// offsetTicks, drumName]; hits at the same slot and span merge into one chord token like [k cl].
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
    const names = hitsAt.map((h) => h[4]);
    const name = names.length === 1 ? names[0] : `[${names.join(' ')}]`;
    const dv = Math.round(hitsAt.reduce((sum, h) => sum + h[2], 0) / hitsAt.length);
    const off = Math.max(...hitsAt.map((h) => h[3]));
    const shift = off ? `${off > 0 ? '+' : ''}${off}` : '';
    toks.push(`${name}${DUR[span]}${shift}:${clamp(vel + dv)}`);
  }
  return toks.join(' ');
}

// --- the kit ----------------------------------------------------------------
// The kick and bass stay on the grid; the claps drag, the off-beat hats swing, and the 16th hat
// ghosts swing further still. The tables are read from a different place each bar, so no two bars
// of hats feel alike.
const KICK_V = [0, -4, -1, -6, -2, -5, 0, -3];
const CLAP_V = [0, -6, 3, -4];
const CLAP_O = [12, 18, 10, 16, 14, 20, 12, 18];
const HAT_V = [52, 38, 46, 34, 50, 36, 44, 40, 48, 32, 54, 36, 46, 38, 50, 34];
const SWING_O = [42, 78, 52, 90, 46, 84, 58, 72, 44, 88, 50, 76, 48, 82, 56, 70];
const GHOST_V = [30, 40, 24, 36, 28, 42, 26, 34];
const GHOST_O = [96, 118, 88, 130, 104, 112, 92, 124];

// One groove bar: options pick what joins the kick. `hats` is 8 (swung eighths) or 16 (plus
// shuffled ghosts), `snare` adds ghost snares, `oh` puts an open hat on the "and" of 4, and `fill`
// rolls snares through the last beat in place of the hats.
function groove(i, vel, opts = {}) {
  const { kick = true, claps = true, hats = 8, snare = false, oh = false, fill = false, crash = false } = opts;
  const hits = [];
  for (let j = 0; j < 4; j += 1) {
    const slot = 4 * j;
    const name = crash && j === 0 ? '[k cr]' : 'k';
    if (kick) hits.push([slot, 1, KICK_V[(j + i) % 8], 0, name]);
    else if (crash && j === 0) hits.push([slot, 1, -20, 0, 'cr']);
  }
  if (claps) {
    hits.push([4, 1, CLAP_V[i % 4], CLAP_O[i % 8], 'cl']);
    hits.push([12, 1, CLAP_V[(i + 2) % 4] - 4, CLAP_O[(i + 3) % 8], 'cl']);
  }
  for (let j = 0; j < 4; j += 1) {
    const slot = 2 + 4 * j;
    const isOh = oh && slot === 14;
    hits.push([slot, 1, HAT_V[(slot + i * 3) % 16] - 44, SWING_O[(slot + i * 5) % 16], isOh ? 'oh' : 'h']);
    if (hats === 16) {
      const g = slot + 1;
      hits.push([g, 1, GHOST_V[(g + i * 3) % 8] - 28, GHOST_O[(g + i * 5) % 8], 'h']);
    }
  }
  if (snare) {
    for (const slot of [3, 11]) {
      hits.push([slot, 1, GHOST_V[(slot + i) % 8] - 8, GHOST_O[(slot + i * 3) % 8] - 12, 's']);
    }
  }
  if (fill) {
    // A rolling fill through the last beat, rising into the next section. It replaces the hats
    // and clap there but keeps the kick under it.
    const kept = hits.filter((h) => h[0] < 12 || h[4].includes('k'));
    kept.push([13, 1, -18, 8, 's'], [14, 1, -8, 12, 's'], [15, 1, 4, 16, 's']);
    return grid(kept, vel);
  }
  return grid(hits, vel);
}

// A soft breakdown bar: swung hats and claps only, no kick.
function hatsOnly(i, vel, opts = {}) {
  const { claps = true, snare = false } = opts;
  return groove(i, vel, { kick: false, claps, hats: 16, snare, oh: false, fill: false });
}

// The build: the kick gathers through four-on-the-floor, then the hats give way to a snare roll.
function buildBar(i, vel, phase) {
  if (phase === 2) return groove(i, vel, { hats: 16, snare: true, fill: true });
  if (phase < 2) return groove(i, vel, { hats: 16, snare: true });
  return grid(
    [
      [0, 1, 0, 0, 'k'],
      [4, 1, -6, 14, 'cl'],
      [4, 1, -6, 14, 'k'],
      [8, 1, -2, 0, 'k'],
      [12, 1, -8, 8, 'k'],
      [12, 1, -8, 8, 's'],
      [13, 1, -2, 10, 's'],
      [14, 1, 4, 12, 's'],
      [15, 1, 10, 14, 's'],
      [2, 1, -8, 60, 'h'],
      [6, 1, -10, 70, 'h'],
      [10, 1, -12, 66, 'h'],
    ],
    vel,
  );
}

// --- bass -------------------------------------------------------------------
// The 3+3+2 garage gallop: root, root, root, root, fifth, root, with an octave pop now and then.
const ROOTS = { Bbm: 'Bb1', Gbmaj: 'Gb1', Dbmaj: 'Db2', Ab: 'Ab1', Ab9: 'Ab1', Absus: 'Ab1' };
const FIFTHS = { Bbm: 'F2', Gbmaj: 'Db2', Dbmaj: 'Ab2', Ab: 'Eb2', Ab9: 'Eb2', Absus: 'Eb2' };
function bassBar(chord, i, vel, opts = {}) {
  const { gallop = true, pop = false, light = false } = opts;
  const root = ROOTS[chord];
  const fifth = FIFTHS[chord];
  const hits = gallop
    ? [
        [0, 2, 0, 0, root],
        [3, 2, -8, 4, root],
        [6, 2, -2, 6, pop ? `${root.slice(0, -1)}${Number(root.slice(-1)) + 1}` : root],
        [8, 2, -4, 0, root],
        [11, 2, -10, 6, fifth],
        [14, 2, -6, 4, root],
      ]
    : light
      ? [
          [0, 4, 0, 0, root],
          [8, 2, -8, 4, root],
          [12, 2, -12, 6, fifth],
        ]
      : [
          [0, 4, 0, 0, root],
          [8, 4, -6, 0, root],
        ];
  return grid(hits, vel);
}

// --- Rhodes stabs -----------------------------------------------------------
// Off-beat stabs a few ticks late, one voicing per chord, the middle of the mix.
const VOICINGS = {
  Bbm: '[Db4 F4 Ab4 C5]',
  Gbmaj: '[Bb3 Db4 F4]',
  Dbmaj: '[Db4 F4 Ab4 C5]',
  Ab: '[C4 Eb4 F4]',
  Ab9: '[C4 Eb4 Gb4 Bb4]',
  Absus: '[Db4 Eb4 Ab4]',
};
const STAB_O = [16, 22, 14, 26, 18, 24, 12, 20];
function stabBar(voicing, i, vel, slots = [2, 6, 10, 14]) {
  return grid(
    slots.map((slot, j) => [slot, 2, [4, -8, 0, -6, 2, -10, -2, -4][(j + i) % 8], STAB_O[(slot + i * 3) % 8], voicing]),
    vel,
  );
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

// --- pluck arp --------------------------------------------------------------
// A shuffled sixteenth figure over the chord's middle register, only in the full sections.
const ARP_PITCH = {
  Bbm: ['Bb3', 'Db4', 'F4', 'Ab4', 'F4', 'Db4', 'Ab4', 'F4'],
  Gbmaj: ['Bb3', 'Db4', 'F4', 'Gb4', 'F4', 'Db4', 'Bb3', 'F4'],
  Dbmaj: ['Ab3', 'Db4', 'F4', 'Ab4', 'C5', 'Ab4', 'F4', 'Ab4'],
  Ab: ['C4', 'Eb4', 'F4', 'Ab4', 'F4', 'Eb4', 'C4', 'F4'],
  Ab9: ['C4', 'Eb4', 'Gb4', 'Bb4', 'Gb4', 'Eb4', 'C4', 'Eb4'],
  Absus: ['Db4', 'Eb4', 'Ab4', 'Eb4', 'Db4', 'Ab4', 'Eb4', 'Ab4'],
};
function arpBar(chord, i, vel) {
  const pitches = ARP_PITCH[chord];
  const slots = [0, 2, 3, 6, 8, 10, 11, 14];
  return grid(
    slots.map((slot, j) => [slot, 1, [2, -6, -2, -8, 0, -4, -6, -2][(j + i) % 8], SWING_O[(slot + i * 5) % 16] / 2, pitches[(j + i) % 8]]),
    vel,
  );
}

// --- the melodies -----------------------------------------------------------
// The hook: a pickup, a rising fourth to a held peak, a fall, and a breath. Bars 5-6 repeat bars
// 1-2 and bar 7 rises to the song's high Eb before the fall in bar 8.
const HOOK = [
  [[2, 'r'], [2, 'F5', -6, 10], [6, 'Bb5', 4, 6], [2, 'Ab5', -8, 12], [2, 'F5', -10, 8], [2, 'r']],
  [[2, 'r'], [2, 'Db5', -8, 14], [6, 'F5', 2, 8], [2, 'Eb5', -10, 12], [2, 'Db5', -12, 6], [2, 'r']],
  [[2, 'r'], [2, 'Ab5', -8, 12], [2, 'Bb5', -2, 8], [6, 'Db6', 4, 10], [2, 'C6', -8, 14], [2, 'Bb5', -10, 8]],
  [[2, 'Bb5', -8, 12], [2, 'Ab5', -10, 8], [8, 'F5', 0, 6], [4, 'r']],
  [[2, 'r'], [2, 'F5', -6, 12], [6, 'Bb5', 4, 8], [2, 'Ab5', -8, 10], [2, 'F5', -10, 12], [2, 'r']],
  [[2, 'r'], [2, 'Db5', -8, 12], [6, 'F5', 2, 10], [2, 'Eb5', -10, 8], [2, 'Db5', -12, 12], [2, 'r']],
  [[2, 'r'], [2, 'Ab5', -8, 10], [2, 'Bb5', -2, 12], [6, 'Db6', 4, 8], [2, 'Eb6', 2, 12], [2, 'Db6', -8, 10]],
  [[2, 'Db6', -8, 12], [2, 'C6', -10, 8], [8, 'Ab5', 0, 6], [4, 'r']],
];

// The verse: its own tune, a register lower, chattier, with a rest at the end of every other bar.
const VERSE = [
  [[2, 'r'], [2, 'Db5', -8, 12], [2, 'Db5', -10, 8], [2, 'F5', -4, 14], [2, 'r'], [2, 'F5', -8, 10], [4, 'Db5', 0, 8]],
  [[2, 'r'], [2, 'Eb5', -8, 12], [2, 'F5', -6, 10], [2, 'Eb5', -10, 14], [2, 'r'], [2, 'Db5', -8, 8], [4, 'Bb4', 2, 10]],
  [[2, 'r'], [2, 'F5', -8, 12], [2, 'Ab5', -4, 10], [2, 'F5', -10, 14], [2, 'r'], [2, 'Eb5', -8, 8], [4, 'Db5', 0, 10]],
  [[2, 'r'], [2, 'Eb5', -8, 12], [2, 'F5', -6, 10], [2, 'Eb5', -10, 14], [4, 'r'], [2, 'C5', -8, 8], [2, 'r']],
  [[2, 'r'], [2, 'Db5', -6, 10], [2, 'Db5', -8, 12], [2, 'F5', -2, 8], [2, 'r'], [2, 'F5', -6, 14], [4, 'Db5', 2, 6]],
  [[2, 'r'], [2, 'Eb5', -6, 10], [2, 'F5', -4, 12], [2, 'Eb5', -8, 8], [2, 'r'], [2, 'Db5', -6, 14], [4, 'Bb4', 4, 6]],
  [[2, 'r'], [2, 'F5', -6, 10], [2, 'Ab5', -2, 12], [2, 'F5', -8, 8], [2, 'r'], [2, 'Eb5', -6, 14], [4, 'Db5', 2, 6]],
  [[2, 'r'], [2, 'Eb5', -8, 12], [2, 'F5', -6, 10], [2, 'Ab5', -2, 12], [2, 'r'], [2, 'F5', -8, 8], [4, 'Eb5', 0, 10]],
];

// The pre-chorus: two rising four-bar lines over Gbmaj7-Ab9-Bbm9-Bbm9, gathering to the high Eb.
const PRE = [
  [[2, 'Db5', -8, 12], [2, 'r'], [2, 'Eb5', -6, 10], [6, 'F5', 2, 8], [2, 'Eb5', -8, 12], [2, 'F5', -6, 10]],
  [[2, 'F5', -8, 12], [2, 'r'], [2, 'Gb5', -6, 10], [6, 'Ab5', 2, 8], [2, 'Gb5', -8, 12], [2, 'Ab5', -6, 10]],
  [[2, 'Ab5', -8, 12], [2, 'r'], [2, 'Bb5', -6, 10], [6, 'C6', 2, 8], [2, 'Bb5', -8, 12], [2, 'Ab5', -6, 10]],
  [[8, 'Bb5', 2, 6], [8, 'r']],
  [[2, 'Db5', -8, 12], [2, 'r'], [2, 'Eb5', -6, 10], [6, 'F5', 2, 8], [2, 'Eb5', -8, 12], [2, 'F5', -6, 10]],
  [[2, 'Ab5', -8, 12], [2, 'r'], [2, 'Bb5', -6, 10], [6, 'C6', 2, 8], [2, 'Db6', -8, 12], [2, 'C6', -6, 10]],
  [[2, 'C6', -8, 12], [2, 'r'], [2, 'Db6', -6, 10], [6, 'Eb6', 2, 8], [2, 'Db6', -8, 12], [2, 'C6', -6, 10]],
  [[2, 'Bb5', -8, 12], [2, 'Ab5', -10, 8], [4, 'Eb5', -6, 10], [8, 'r']],
];

// --- counter-line answers ---------------------------------------------------
// Short FM-pluck figures that answer the vocal in the gaps its phrases leave, mostly on the fourth
// and eighth bar of each hook. Mid register, under the vocal.
const ANSWERS = {
  up: [[8, 'r', 0, 0], [2, 'C5', -6, 16], [2, 'Db5', -8, 18], [2, 'Eb5', -4, 14], [2, 'Db5', -10, 20]],
  down: [[8, 'r', 0, 0], [2, 'Eb5', -6, 16], [2, 'Db5', -8, 18], [2, 'C5', -4, 14], [2, 'Bb4', -10, 20]],
  tail: [[12, 'r', 0, 0], [2, 'F4', -8, 18], [2, 'Bb4', -6, 16]],
  echo: [[8, 'r', 0, 0], [2, 'F4', -8, 16], [2, 'Ab4', -6, 18], [2, 'Bb4', -4, 14], [2, 'Ab4', -10, 20]],
};
// The hook's four bars an octave down, for the counter to double on the last pass.
const HOOK_LOW = HOOK.map((bar) => bar.map(([u, t, dv = 0, off = 0]) => [u, t === 'r' ? t : `${t.slice(0, -1)}${Number(t.slice(-1)) - 1}`, dv, off]));

// --- sections ---------------------------------------------------------------
const R = 'R';
const bars = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const LOOP = ['Bbm', 'Gbmaj', 'Dbmaj', 'Ab'];
const PRE_CHORDS = ['Gbmaj', 'Ab9', 'Bbm', 'Bbm', 'Gbmaj', 'Dbmaj', 'Absus', 'Ab9'];

const keys = ['lead', 'chops', 'keys', 'pad', 'arp', 'bass', 'drums'];
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
// The chord for the bars of a normal loop section, starting at loop position `phase`.
const loopChords = (n, phase = 0) => bars(n, (i) => LOOP[(i + phase) % 4]);

// 1. Bars 1-8. Intro: kick and swung hats first, then claps, ghost snares, the pad and bass, and a
// first quiet answer from the pluck. The vocal stays out.
section('Intro', 8, {
  drums: [...bars(4, (i) => groove(i, 88, { claps: false, hats: 8 })), ...bars(3, (i) => groove(i, 94, { hats: 8, snare: true })), groove(7, 96, { hats: 8, snare: true, fill: true })],
  pad: bars(8, (i) => padBar(LOOP[i % 4], 66 + 2 * i)),
  bass: [...bars(4, () => R), ...bars(4, (i) => bassBar(LOOP[(i + 4) % 4], i, 76, { light: true }))],
  keys: [...bars(4, () => R), ...bars(4, (i) => stabBar(VOICINGS[LOOP[(i + 4) % 4]], i, 82, i % 2 ? [6, 14] : [2, 10]))],
  chops: [R, R, R, seq(ANSWERS.tail, 74), R, R, R, seq(ANSWERS.down, 78)],
});

// 2. Bars 9-24. Verse 1: the vocal's own tune over the loop, twice, with the counter answering in
// the gaps at the end of each four bars.
section('Verse 1', 16, {
  lead: [...bars(8, (i) => seq(VERSE[i], 94)), ...bars(8, (i) => seq(VERSE[i], 98))],
  drums: bars(16, (i) => groove(i, 98, { hats: 8, snare: true, fill: i % 8 === 7 })),
  bass: bars(16, (i) => bassBar(LOOP[i % 4], i, 80, { pop: i % 8 === 6 })),
  keys: bars(16, (i) => stabBar(VOICINGS[LOOP[i % 4]], i, 84, i % 2 ? [6, 14] : [2, 10])),
  pad: bars(16, (i) => padBar(LOOP[i % 4], 74)),
  chops: bars(16, (i) => (i % 8 === 3 ? seq(ANSWERS.up, 78) : i % 8 === 7 ? seq(ANSWERS.down, 80) : R)),
});

// 3. Bars 25-32. Pre-chorus 1: the vocal climbs, the hats thicken to shuffled sixteenths, the arp
// joins, and the last bar rolls into the hook.
section('Pre-chorus 1', 8, {
  lead: bars(8, (i) => seq(PRE[i], 96)),
  drums: [...bars(6, (i) => groove(i, 100, { hats: 16, snare: true })), buildBar(6, 102, 2), buildBar(7, 104, 3)],
  bass: bars(8, (i) => bassBar(PRE_CHORDS[i], i, 84, { pop: i % 4 === 2 })),
  keys: bars(8, (i) => stabBar(VOICINGS[PRE_CHORDS[i]], i, 88, [2, 6, 10, 14])),
  pad: bars(8, (i) => padBar(PRE_CHORDS[i], 76)),
  arp: [...bars(4, () => R), ...bars(4, (i) => arpBar(PRE_CHORDS[i + 4], i, 80))],
});

// 4. Bars 33-48. Chorus 1: the hook twice over the full groove, with the pluck arp and the counter
// answering in the hook's gaps.
section('Chorus 1', 16, {
  lead: [...bars(8, (i) => seq(HOOK[i], 102)), ...bars(8, (i) => seq(HOOK[i], 106))],
  drums: bars(16, (i) => groove(i, 104, { hats: 16, snare: true, oh: i % 4 === 3, fill: i % 8 === 7, crash: i === 0 })),
  bass: bars(16, (i) => bassBar(LOOP[i % 4], i, 88, { pop: i % 4 === 3 })),
  keys: bars(16, (i) => stabBar(VOICINGS[LOOP[i % 4]], i, 92, [2, 6, 10, 14])),
  pad: bars(16, (i) => padBar(LOOP[i % 4], 78)),
  arp: bars(16, (i) => arpBar(LOOP[i % 4], i, 82)),
  chops: bars(16, (i) =>
    i % 8 === 3 ? seq(ANSWERS.up, 84) : i % 8 === 7 ? seq(ANSWERS.down, 86) : i % 8 === 5 ? seq(ANSWERS.tail, 76) : R,
  ),
});

// 5. Bars 49-64. Verse 2: the verse tune again with more answer from the pluck, the arp waiting
// for the build.
section('Verse 2', 16, {
  lead: [...bars(8, (i) => seq(VERSE[i], 98)), ...bars(8, (i) => seq(VERSE[i], 102))],
  drums: bars(16, (i) => groove(i, 100, { hats: 16, snare: true, fill: i % 8 === 7 })),
  bass: bars(16, (i) => bassBar(LOOP[i % 4], i, 82, { pop: i % 8 === 6 })),
  keys: bars(16, (i) => stabBar(VOICINGS[LOOP[i % 4]], i, 88, [2, 6, 10, 14])),
  pad: bars(16, (i) => padBar(LOOP[i % 4], 76)),
  chops: bars(16, (i) =>
    i % 8 === 3 ? seq(ANSWERS.up, 82) : i % 8 === 7 ? seq(ANSWERS.down, 84) : i % 8 === 5 ? seq(ANSWERS.echo, 78) : R,
  ),
});

// 6. Bars 65-72. Pre-chorus 2: the same climb, a touch hotter.
section('Pre-chorus 2', 8, {
  lead: bars(8, (i) => seq(PRE[i], 100)),
  drums: [...bars(6, (i) => groove(i, 102, { hats: 16, snare: true })), buildBar(6, 104, 2), buildBar(7, 106, 3)],
  bass: bars(8, (i) => bassBar(PRE_CHORDS[i], i, 86, { pop: i % 4 === 2 })),
  keys: bars(8, (i) => stabBar(VOICINGS[PRE_CHORDS[i]], i, 92, [2, 6, 10, 14])),
  pad: bars(8, (i) => padBar(PRE_CHORDS[i], 78)),
  arp: [...bars(4, () => R), ...bars(4, (i) => arpBar(PRE_CHORDS[i + 4], i, 82))],
});

// 7. Bars 73-88. Chorus 2: the hook twice, open hats and fuller answers.
section('Chorus 2', 16, {
  lead: [...bars(8, (i) => seq(HOOK[i], 106)), ...bars(8, (i) => seq(HOOK[i], 108))],
  drums: bars(16, (i) => groove(i, 106, { hats: 16, snare: true, oh: i % 2 === 1, fill: i % 8 === 7, crash: i === 0 })),
  bass: bars(16, (i) => bassBar(LOOP[i % 4], i, 90, { pop: i % 4 === 3 })),
  keys: bars(16, (i) => stabBar(VOICINGS[LOOP[i % 4]], i, 94, [2, 6, 10, 14])),
  pad: bars(16, (i) => padBar(LOOP[i % 4], 80)),
  arp: bars(16, (i) => arpBar(LOOP[i % 4], i, 84)),
  chops: bars(16, (i) =>
    i % 8 === 3 ? seq(ANSWERS.up, 86) : i % 8 === 7 ? seq(ANSWERS.down, 88) : i % 8 === 5 ? seq(ANSWERS.echo, 80) : R,
  ),
});

// 8. Bars 89-96. Breakdown: the kick drops out and the vocal sings the hook bare over the pad, the
// stabs and soft hats; the bass slides back under the second half.
section('Breakdown', 8, {
  lead: [...bars(4, (i) => seq(HOOK[i], 76)), ...bars(2, (i) => seq(HOOK[i], 84)), R, R],
  drums: [...bars(4, (i) => hatsOnly(i, 74, { claps: i % 2 === 1 })), ...bars(3, (i) => hatsOnly(i, 82, { claps: true, snare: true })), buildBar(7, 92, 2)],
  bass: [...bars(2, () => R), ...bars(2, (i) => bassBar(LOOP[(i + 2) % 4], i, 58, { light: true })), ...bars(4, (i) => bassBar(LOOP[(i + 4) % 4], i, 70, { light: i < 2 }))],
  keys: bars(8, (i) => stabBar(VOICINGS[LOOP[i % 4]], i, 78, i < 4 ? [6, 14] : [2, 6, 10, 14])),
  pad: bars(8, (i) => padBar(LOOP[i % 4], 82)),
  arp: [...bars(4, () => R), ...bars(4, (i) => arpBar(LOOP[(i + 4) % 4], i, 74))],
  chops: [R, seq(ANSWERS.tail, 70), R, seq(ANSWERS.down, 72), R, seq(ANSWERS.tail, 74), R, seq(ANSWERS.up, 78)],
});

// 9. Bars 97-104. Build: the drums gather behind the stabs and arp, the rolls get faster, and the
// vocal holds the last note into the drop.
section('Build', 8, {
  lead: [
    ...bars(4, () => R),
    seq([[4, 'r'], [2, 'F5', -6, 10], [2, 'Ab5', -4, 12], [4, 'Bb5', 0, 8], [4, 'C6', 2, 10]], 100),
    seq([[8, 'Db6', 4, 8], [8, 'r']], 104),
    seq([[4, 'r'], [2, 'Ab5', -6, 10], [2, 'Bb5', -4, 12], [4, 'C6', 0, 8], [4, 'Db6', 2, 10]], 104),
    seq([[8, 'Eb6', 4, 8], [8, 'r']], 108),
  ],
  drums: [...bars(4, (i) => buildBar(i, 96, 0)), ...bars(2, (i) => buildBar(i + 2, 100, 1)), buildBar(6, 104, 2), buildBar(7, 108, 3)],
  bass: [...bars(4, (i) => bassBar(LOOP[i % 4], i, 70, { light: true })), ...bars(4, (i) => bassBar(LOOP[(i + 4) % 4], i, 80, { pop: i % 2 === 1 }))],
  keys: bars(8, (i) => stabBar(VOICINGS[LOOP[i % 4]], i, 84 + 2 * i, [2, 6, 10, 14])),
  pad: bars(8, (i) => padBar(LOOP[i % 4], 80)),
  arp: bars(8, (i) => arpBar(LOOP[i % 4], i, 78 + 2 * i)),
});

// 10. Bars 105-120. The final double chorus: everything at its fullest, the counter doubling the
// hook's tail on the last pass.
section('Final chorus', 16, {
  lead: [...bars(8, (i) => seq(HOOK[i], 110)), ...bars(8, (i) => seq(HOOK[i], 112))],
  drums: bars(16, (i) => groove(i, 108, { hats: 16, snare: true, oh: i % 2 === 1, fill: i % 8 === 7, crash: i === 0 })),
  bass: bars(16, (i) => bassBar(LOOP[i % 4], i, 92, { pop: i % 4 === 3 })),
  keys: bars(16, (i) => stabBar(VOICINGS[LOOP[i % 4]], i, 96, [2, 6, 10, 14])),
  pad: bars(16, (i) => padBar(LOOP[i % 4], 82)),
  arp: bars(16, (i) => arpBar(LOOP[i % 4], i, 86)),
  chops: bars(16, (i) =>
    i % 8 === 3
      ? seq(ANSWERS.up, 88)
      : i % 8 === 7
        ? seq(ANSWERS.down, 90)
        : i >= 12
          ? seq(HOOK_LOW[i - 8], 82)
          : R,
  ),
});

// 11. Bars 121-128. Outro for the mixer: the vocal takes the hook's first two bars once more, then
// the layers leave one by one until only the kick and hats are left.
section('Outro', 8, {
  lead: [...bars(4, (i) => seq(HOOK[i], 82)), ...bars(4, () => R)],
  drums: [
    ...bars(4, (i) => groove(i, 102, { hats: 16, snare: true, oh: i % 2 === 1 })),
    ...bars(2, (i) => groove(i, 96, { hats: 8, snare: false })),
    groove(6, 90, { claps: false, hats: 8 }),
    grid([[0, 1, 0, 0, '[k cr]'], [8, 1, -6, 0, 'k'], [2, 1, -10, 50, 'h'], [10, 1, -12, 56, 'h']], 88),
  ],
  bass: [...bars(4, (i) => bassBar(LOOP[i % 4], i, 76, { pop: i % 4 === 3 })), ...bars(2, (i) => bassBar(LOOP[(i + 4) % 4], i, 68, { light: true })), bassBar(LOOP[2], 0, 58, { light: true }), R],
  keys: [...bars(4, (i) => stabBar(VOICINGS[LOOP[i % 4]], i, 88, [2, 6, 10, 14])), ...bars(2, (i) => stabBar(VOICINGS[LOOP[(i + 4) % 4]], i, 80, [6, 14])), R, R],
  pad: bars(8, (i) => padBar(LOOP[i % 4], 78 - 2 * (i > 5 ? i - 5 : 0))),
  arp: [...bars(2, (i) => arpBar(LOOP[i % 4], i, 82)), ...bars(6, () => R)],
  chops: [R, R, seq(ANSWERS.down, 80), R, seq(ANSWERS.tail, 72), R, R, R],
});

// --- checks -----------------------------------------------------------------
// Every bar must be exactly one 4/4 bar (3840 ticks). The builders guarantee it; this reads the
// finished strings again so a hand-written bar can't slip past.
const DUR_TICKS = { '/1': 3840, '/2': 1920, '/2.': 2880, '/4': 960, '/4.': 1440, '/8': 480, '/8.': 720, '/16': 240 };
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

const text = `# Night Bus Home, by MiMo v2.6 Pro and SZ. An original UK garage house track for the Studio
# style: a wordless vocal hook someone can hum after one listen - a pickup, a rising fourth to a
# held peak, a fall, and a breath - over off-beat FM Rhodes stabs, a 3+3+2 DX bass gallop under the
# kick, and four-on-the-floor drums with shuffled hats and ghost snares, at 127 BPM in Bb minor.
# The verse has a chattier tune of its own, and each pre-chorus climbs to the song's high Eb before
# the hook lifts over the loop. A breakdown drops the kick so the vocal sings the hook bare over
# the pad, snare rolls build back up, and the final double chorus runs into a stripped outro.
#
# The chord loop is Bbm9 - Gbmaj7 - Dbmaj9 - Ab6, one chord a bar, except the two pre-choruses
# (Gbmaj7 - Ab9 - Bbm9 - Bbm9 - Gbmaj7 - Dbmaj9 - Absus4 - Ab9). The pad holds root and fifth only,
# so the melody's colour tones never sit a half step against it, and every long melody note is a
# chord tone of its bar. Registers: the bass low under the kick, the pad and stabs in the middle,
# the vocal on top, and the FM-pluck counter answering in the gaps the vocal leaves.
#
# Human feel: the kick and bass keep the grid, while the vocal drifts +6 to +14 ticks late in
# uneven steps, the stabs land +12 to +26 late, the claps drag +10 to +20, the off-beat hats swing
# +42 to +90 late with the shuffled sixteenth ghosts later still, and every hat, clap and stab has
# an uneven velocity.
# chords: Bbm9 Gbmaj7 Dbmaj9 Ab6
# chords @25: Gbmaj7 Ab9 Bbm9 Bbm9 Gbmaj7 Dbmaj9 Absus4 Ab9
# chords @33: Bbm9 Gbmaj7 Dbmaj9 Ab6
# chords @65: Gbmaj7 Ab9 Bbm9 Bbm9 Gbmaj7 Dbmaj9 Absus4 Ab9
# chords @73: Bbm9 Gbmaj7 Dbmaj9 Ab6
title: Night Bus Home
composer: MiMo v2.6 Pro & SZ
about: UK garage house at 127 in Bb minor: a humming wordless vocal hook over swung Rhodes stabs, a bouncing DX bass and shuffled four-on-the-floor drums, through a bare breakdown to the last chorus.
year: 2026
source: original
category: originals
style: studio
key: Bb minor
tempo: 127
time: 4/4

track lead role=lead inst=vox-lead vol=0.95
${block('lead')}

track chops role=counter inst=fm-pluck vol=0.8 pan=0.35
${block('chops')}

track keys role=chords inst=fm-rhodes vol=0.85 pan=-0.15
${block('keys')}

track pad role=pad inst=warm-pad vol=0.75
${block('pad')}

track arp role=arp inst=pluck vol=1 pan=0.2
${block('arp')}

track bass role=bass inst=dx-bass vol=0.45
${block('bass')}

track drums role=drums inst=909-kit vol=0.85
${block('drums')}

`;
writeFileSync(join(out, 'night-bus-home.song'), text);
console.log(`wrote ${out}/night-bus-home.song (${total} bars)`);
