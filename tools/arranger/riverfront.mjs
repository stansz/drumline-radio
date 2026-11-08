// Riverfront: an original deep techno track for the Techno style, by MiMo v2.6 Pro and SZ. Warm
// chord stabs, a dark evolving pad, a hypnotic FM counter-line, and a rolling sub bass under a
// four-on-the-floor kit at 124 BPM in F minor. This script lays the parts out over 136 bars: an
// intro, a groove that grows a layer every 8 bars, a breakdown where the kick drops and the hook
// surfaces over the pad and chords, a build, two drops, a stripped break, a second build, the final
// drop with the hook over everything, and an outro that cadences on F minor.
//   node tools/arranger/riverfront.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// Flat names, so every note reads in F minor.
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = (n) => `${FLAT[n % 12]}${Math.floor(n / 12) - 1}`;
const chordOf = (notes) => `[${notes.map(nm).join(' ')}]`;

// The chords. The pad sits low-mid, the stabs above it, the counter-line above those, and the sub
// bass under the kick. Each chord keeps one pitch set everywhere, so nothing ever clashes: the
// counter-line avoids any note a half step above a pad or bass tone (G and Db over Fm, and so on).
const CH = {
  Fm: { stab: [56, 60, 65], padA: [41, 44, 48], padB: [44, 48, 53], padC: [41, 48, 53], root: 29, cell: [72, 70, 68] },
  Db: { stab: [56, 61, 65], padA: [37, 41, 44], padB: [41, 44, 49], padC: [37, 44, 49], root: 37, cell: [73, 70, 68] },
  Ab: { stab: [56, 60, 63], padA: [44, 48, 51], padB: [48, 51, 56], padC: [44, 51, 56], root: 32, cell: [72, 70, 68] },
  Eb: { stab: [58, 63, 67], padA: [39, 43, 46], padB: [43, 46, 51], padC: [39, 46, 51], root: 39, cell: [75, 73, 70] },
  Bbm: { stab: [58, 61, 65], padA: [46, 49, 53], padB: [49, 53, 58], padC: [46, 53, 58], root: 34, cell: [73, 70, 68] },
};

// The 8-bar loop: F minor for two bars, then D-flat, A-flat, F minor, D-flat, B-flat minor, and
// E-flat. The breakdown slows the harmony to two bars a chord; the outro cadences on F minor.
const LOOP = ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Bbm', 'Eb'];
const BREAK = ['Fm', 'Fm', 'Bbm', 'Bbm', 'Db', 'Db', 'Eb', 'Eb'];
const OUTRO = ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Eb', 'Fm'];
const CHORDS = Array.from({ length: 136 }, (_, g) => {
  if (g < 40) return LOOP[g % 8];
  if (g < 48) return BREAK[g - 40];
  if (g < 128) return LOOP[(g - 48) % 8];
  return OUTRO[g - 128];
});
const ch = (g) => CHORDS[g];

// The hook (the song's own): a slow melody for the breakdown and the final drop, one gesture per
// chord so it follows any order of the loop.
const HOOK = {
  Fm: (v) => `Ab4/2:${v} C5/2:${v + 3}`,
  Db: (v) => `Bb4/4:${v + 2} Ab4/4:${v - 4} F4/2:${v}`,
  Ab: (v) => `Ab4/4:${v - 3} Bb4/4:${v} C5/2:${v + 4}`,
  Eb: (v) => `Eb5/4:${v + 4} Db5/4:${v - 2} Bb4/2:${v}`,
  Bbm: (v) => `Db5/2:${v + 2} Bb4/2:${v - 2}`,
};
const HOOK2 = {
  Fm: (v) => `C5/4:${v + 2} Bb4/4:${v - 4} Ab4/2:${v}`,
  Db: (v) => `F4/4:${v - 2} Ab4/4:${v + 2} Bb4/2:${v}`,
  Ab: (v) => `C5/2:${v + 3} Ab4/2:${v - 2}`,
  Eb: (v) => `Bb4/4:${v - 3} Eb5/4:${v + 4} Db5/2:${v}`,
  Bbm: (v) => `Bb4/4:${v - 2} Db5/4:${v + 2} F5/2:${v + 4}`,
};

// The hypnotic counter-line: one rhythmic cell in sixteenths, its three notes drawn from the chord.
// m1 falls, m3 rises, and m2 breathes. The longer notes drift a few ticks behind the beat.
const m1 = (c, v) => {
  const [x, y, z] = CH[c].cell.map(nm);
  return `r/8 ${x}/16:${v + 4} ${y}/16:${v - 6} r/8 ${z}/8+10:${v} r/8 ${x}/16:${v + 2} ${y}/16:${v - 8} r/8 ${z}/8+6:${v - 2}`;
};
const m2 = (c, v) => {
  const [x, y, z] = CH[c].cell.map(nm);
  return `r/8 ${x}/16:${v + 4} ${y}/16:${v - 4} r/8 ${z}/8+12:${v} r/4. ${z}/8+16:${v - 6}`;
};
const m3 = (c, v) => {
  const [x, y, z] = CH[c].cell.map(nm);
  return `r/8 ${z}/16:${v + 2} ${y}/16:${v - 4} r/8 ${x}/8+8:${v + 4} r/8 ${z}/16:${v - 2} ${y}/16:${v - 6} r/8 ${x}/8+12:${v}`;
};

// The stabs: three syncopated patterns, every hit nudged late and a little uneven in level.
const stab = (c, v, kind) => {
  const N = chordOf(CH[c].stab);
  if (kind === 'A')
    return `r/8. ${N}/16+22:${v + 4} r/8 ${N}/8+16:${v - 4} r/8 ${N}/8+24:${v + 2} r/16 ${N}/16+18:${v - 6} r/8`;
  if (kind === 'B')
    return `r/8 ${N}/16+20:${v} r/16 ${N}/8+26:${v - 6} r/8 ${N}/16+18:${v + 2} r/16 ${N}/8+24:${v - 4} r/8 ${N}/16+14:${v - 8} r/16`;
  return `r/8 ${N}/8+22:${v} r/4 ${N}/8+18:${v - 6} r/4 ${N}/8+26:${v - 2}`; // C: sparse
};
const stabBeat = (c, v) => {
  const N = chordOf(CH[c].stab);
  return `${N}/4:${v} ${N}/4:${v + 2} ${N}/4:${v + 4} ${N}/4:${v + 6}`;
};

// The pad: low triads (A), inversions above them (B), and open fifths for the breakdown (C).
const pad = (set, c, v) => `${chordOf(CH[c][set])}/1:${v}`;
const padHold = (set, c, v) => `${chordOf(CH[c][set])}/1:${v}~`; // tied over two bars
const padRest = (set, c) => `${chordOf(CH[c][set])}/1`;

// The rolling sub bass: offbeat eighths, sixteenth rolls, rolls with an octave pop, and held roots.
const b8 = (c, v) => {
  const x = nm(CH[c].root);
  return `r/8 ${x}/8:${v} r/8 ${x}/8:${v - 6} r/8 ${x}/8:${v - 2} r/8 ${x}/8:${v - 8}`;
};
const ROLL_V = [[0, -8, -2, -12], [0, -10, -4, -14], [0, -6, -2, -10], [0, -8, -4, -12]];
const b16 = (c, v, i) => {
  const x = nm(CH[c].root);
  const d = ROLL_V[i % 4];
  return Array.from({ length: 4 }, (_, b) => `r/16 ${x}/16:${v + d[b]} ${x}/16:${v + d[b] - 4} ${x}/16:${v + d[b] - 2}`).join(' ');
};
const bpop = (c, v, i) => {
  const x = nm(CH[c].root);
  const x8 = nm(CH[c].root + 12);
  const d = ROLL_V[i % 4];
  return Array.from({ length: 4 }, (_, b) => `r/16 ${x}/16:${v + d[b]} ${x8}/16:${v + d[b] + 4} ${x}/16:${v + d[b] - 8}`).join(' ');
};
const bhold = (c, v) => `${nm(CH[c].root)}/1:${v}`;

// The 909 kit. Off-beat hats sit a little late (the swing), every hit's velocity moves, and claps
// land with the kick on 2 and 4.
const HAT_V = [[64, 58, 66, 60], [62, 60, 64, 56], [66, 56, 62, 62], [60, 62, 58, 64]];
const HAT_O = [26, 20, 24, 18];
const KICK_V = [0, -6, -2, -8];

function drumBar({ v, i, hats = '8', claps = false, open = false, crash = false }) {
  const hv = HAT_V[i % 4];
  const parts = [];
  for (let b = 0; b < 4; b++) {
    let kick = `k/8:${v + KICK_V[(i + b) % 4]}`;
    if (b === 0 && crash) kick = `[k cr]/8:${v + 6}`;
    else if (claps && (b === 1 || b === 3)) kick = `[k cl]/8+${10 + 2 * b}:${v + KICK_V[(i + b) % 4] - 10}`;
    parts.push(kick);
    const hatV = hv[b] + (v - 108);
    if (open && b === 3) parts.push(`oh/8+22:${hatV + 16}`);
    else if (hats === '8') parts.push(`h/8+${HAT_O[b]}:${hatV}`);
    else if (hats === '16') parts.push(`h/16:${hatV - 4} h/16+${HAT_O[b] - 8}:${hatV - 10}`);
  }
  return parts.join(' ');
}
const kickOnly = (v, i) =>
  Array.from({ length: 4 }, (_, b) => `k/4:${v + KICK_V[(i + b) % 4]}`).join(' ');
const roll8 = (v) =>
  Array.from({ length: 8 }, (_, j) => `s/8:${v - 12 + 3 * j}`).join(' ');
const roll16 = (v) =>
  Array.from({ length: 16 }, (_, j) => `s/16:${v - 20 + 2 * j}`).join(' ');

// The percussion lane: rim ticks between the beats, ride ticks in the second drop, tom fills at the
// section ends.
const pRim = (v, i) => {
  const w = v + 6;
  return `r/8 rim/16+${12 + (i % 3) * 2}:${w} r/16 r/8 rim/8+${18 - (i % 2) * 4}:${w + 6} r/8 rim/16+${10 + (i % 4)}:${w - 4} r/16 r/8 rim/8+${22 - (i % 3) * 2}:${w + 2}`;
};
const pRide = (v) => {
  const w = v + 6;
  return `r/8 rd/8+22:${w} r/8 rd/8+18:${w - 6} r/8 rd/8+24:${w - 2} r/8 rd/8+20:${w - 8}`;
};
const pTom = (v) => `r/2 tl/8:${v + 6} tm/8:${v + 2} th/8:${v - 2} th/8:${v - 6}`;

const R = 'R';
const fill = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const keys = ['melody', 'stabs', 'pad', 'bass', 'drums', 'perc'];
const tracks = Object.fromEntries(keys.map((k) => [k, []]));
const marks = [];
function section(name, n, parts) {
  marks.push([tracks.melody.length, name]);
  for (const key of keys) {
    const bars = parts[key] ?? [];
    if (bars.length > n) throw new Error(`${name}: ${key} has ${bars.length} bars, more than ${n}`);
    for (let i = 0; i < n; i++) tracks[key].push(bars[i] ?? R);
  }
}

// Intro: the kick alone, then the hats and the pad.
section('Intro: the kick, then the pad', 8, {
  drums: fill(8, (i) => (i < 4 ? kickOnly(100, i) : drumBar({ v: 104, i }))),
  pad: [...fill(4, () => R), ...fill(4, (i) => pad('padA', ch(4 + i), 52))],
});

// The groove: the sub bass rolls in, the counter-line answers.
section('Groove: the sub bass rolls in', 8, {
  drums: fill(8, (i) => drumBar({ v: i < 4 ? 104 : 108, i, claps: i >= 4 })),
  bass: fill(8, (i) => (i < 4 ? b8(ch(8 + i), 92) : b16(ch(8 + i), 100, i))),
  pad: fill(8, (i) => pad('padA', ch(8 + i), 54)),
  melody: [...fill(4, () => R), ...fill(4, (i) => m2(ch(12 + i), 82))],
});

// The stabs arrive, and the counter-line takes the cell.
section('The stabs arrive', 8, {
  drums: fill(8, (i) => drumBar({ v: 108, i, claps: true, open: i % 4 === 3, crash: i === 0 })),
  bass: fill(8, (i) => b16(ch(16 + i), 104, i)),
  stabs: fill(8, (i) => stab(ch(16 + i), 92, 'A')),
  melody: fill(8, (i) => m1(ch(16 + i), 88)),
  pad: fill(8, (i) => pad('padA', ch(16 + i), 54)),
  perc: fill(8, (i) => pRim(68, i)),
});

// Sixteenth hats and a higher pad voicing open the counter-line up.
section('The counter-line opens up', 8, {
  drums: fill(8, (i) => drumBar({ v: 108, i, hats: '16', claps: true, open: i % 4 === 3, crash: i === 0 })),
  bass: fill(8, (i) => b16(ch(24 + i), 106, i)),
  stabs: fill(8, (i) => stab(ch(24 + i), 94, 'B')),
  melody: [...fill(4, (i) => m1(ch(24 + i), 90)), ...fill(4, (i) => m2(ch(28 + i), 88))],
  pad: fill(8, (i) => pad('padB', ch(24 + i), 56)),
  perc: fill(8, (i) => pRim(70, i)),
});

// The turn: space first, then lift, ending on a snare crescendo into the breakdown.
section('Turn: space, then lift', 8, {
  drums: [
    ...fill(4, (i) => drumBar({ v: 104, i, claps: true })),
    ...fill(3, (i) => drumBar({ v: 110, i: i + 4, hats: '16', claps: true, open: true, crash: i === 0 })),
    roll8(104),
  ],
  bass: [...fill(4, (i) => b16(ch(32 + i), 102, i)), ...fill(3, (i) => bpop(ch(36 + i), 108, i)), bhold(ch(39), 96)],
  stabs: [...fill(4, (i) => stab(ch(32 + i), 90, 'A')), ...fill(4, (i) => stab(ch(36 + i), 96, 'B'))],
  melody: [...fill(4, (i) => m2(ch(32 + i), 84)), ...fill(4, (i) => m3(ch(36 + i), 92))],
  pad: fill(8, (i) => pad('padB', ch(32 + i), 56)),
  perc: [...fill(7, (i) => pRim(70, i)), pTom(84)],
});

// Breakdown: the kick drops. The pad and the stabs carry, and the hook surfaces.
section('Breakdown: the pad and chords carry', 8, {
  drums: [...fill(7, () => R), 'r/2 r/4 s/8:80 s/8:92'],
  pad: fill(8, (i) =>
    i % 2 === 0 ? padHold('padC', ch(40 + i), 64) : padRest('padC', ch(40 + i)),
  ),
  stabs: fill(8, (i) => stab(ch(40 + i), 76, 'C')),
  melody: fill(8, (i) => (i % 2 === 0 ? HOOK : HOOK2)[ch(40 + i)](92)),
  bass: [...fill(4, () => R), ...fill(4, (i) => bhold(ch(44 + i), 52))],
  perc: [...fill(4, () => R), ...fill(4, (i) => pRim(56, i))],
});

// The groove returns under the chords and grows back into the build.
section('The groove returns', 8, {
  drums: [
    ...fill(4, (i) => drumBar({ v: 96, i })),
    ...fill(3, (i) => drumBar({ v: 106, i: i + 4, claps: true })),
    roll16(96),
  ],
  bass: [...fill(4, (i) => b8(ch(48 + i), 88)), ...fill(4, (i) => b16(ch(52 + i), 98, i))],
  stabs: fill(8, (i) => stab(ch(48 + i), 84, 'A')),
  melody: [...fill(4, (i) => m2(ch(48 + i), 84)), ...fill(4, (i) => m1(ch(52 + i), 92))],
  pad: fill(8, (i) => pad('padA', ch(48 + i), 56)),
  perc: [...fill(2, () => R), ...fill(6, (i) => pRim(62, i))],
});

// Build: the kick pushes, the stabs hit the beats, and the snares roll.
section('Build: the kick pushes', 8, {
  drums: [
    ...fill(4, (i) => drumBar({ v: 110, i, claps: true, crash: i === 0 })),
    ...fill(2, (i) => drumBar({ v: 112, i: i + 4, hats: '16', claps: true })),
    drumBar({ v: 112, i: 6, hats: '16', claps: true, open: true }),
    roll16(112),
  ],
  bass: [...fill(6, (i) => b16(ch(56 + i), 106, i)), ...fill(2, (i) => bpop(ch(62 + i), 112, i))],
  stabs: [
    ...fill(4, (i) => stab(ch(56 + i), 96, 'B')),
    ...fill(2, (i) => stab(ch(60 + i), 98, 'A')),
    ...fill(2, (i) => stabBeat(ch(62 + i), 100)),
  ],
  melody: [...fill(4, (i) => m1(ch(56 + i), 94)), ...fill(4, (i) => m3(ch(60 + i), 98))],
  pad: fill(8, (i) => pad('padB', ch(56 + i), 60)),
  perc: [...fill(7, (i) => pRim(72, i)), pTom(88)],
});

// Drop: everything, the counter-line on top.
section('Drop: everything', 16, {
  drums: fill(16, (i) =>
    drumBar({ v: 112, i, hats: i < 8 ? '8' : '16', claps: true, open: i % 4 === 3, crash: i % 8 === 0 }),
  ),
  bass: [...fill(8, (i) => bpop(ch(64 + i), 112, i)), ...fill(8, (i) => b16(ch(72 + i), 110, i))],
  stabs: [...fill(8, (i) => stab(ch(64 + i), 100, 'A')), ...fill(8, (i) => stab(ch(72 + i), 102, 'B'))],
  melody: [...fill(8, (i) => m1(ch(64 + i), 96)), ...fill(8, (i) => m3(ch(72 + i), 98))],
  pad: fill(16, (i) => pad('padB', ch(64 + i), 58)),
  perc: fill(16, (i) => pRim(78, i)),
});

// Second half of the drop: sixteenth hats, ride ticks, and the counter-line rising.
section('Drop: sixteenth hats', 16, {
  drums: fill(16, (i) =>
    drumBar({ v: 112 + (i >= 8 ? 2 : 0), i, hats: '16', claps: true, open: i % 4 === 3, crash: i % 8 === 0 }),
  ),
  bass: fill(16, (i) => bpop(ch(80 + i), 114, i)),
  stabs: [...fill(8, (i) => stab(ch(80 + i), 102, 'B')), ...fill(8, (i) => stab(ch(88 + i), 104, 'A'))],
  melody: fill(16, (i) => {
    const c = ch(80 + i);
    if (i % 8 === 4) return m2(c, 96);
    return i < 8 ? m1(c, 100) : m3(c, 100);
  }),
  pad: fill(16, (i) => pad('padB', ch(80 + i), 58)),
  perc: [...fill(8, (i) => pRim(80, i)), ...fill(8, () => pRide(74))],
});

// Stripped: kick, bass, and pad, with the counter-line breathing.
section('Stripped: kick, bass, and pad', 8, {
  drums: [...fill(4, (i) => drumBar({ v: 100, i })), ...fill(4, (i) => drumBar({ v: 106, i: i + 4, claps: true }))],
  bass: [...fill(4, (i) => b8(ch(96 + i), 92)), ...fill(4, (i) => b16(ch(100 + i), 100, i))],
  stabs: [...fill(4, () => R), ...fill(4, (i) => stab(ch(100 + i), 82, 'C'))],
  melody: fill(8, (i) => m2(ch(96 + i), 84)),
  pad: fill(8, (i) => pad('padA', ch(96 + i), 54)),
  perc: [...fill(4, () => R), ...fill(4, (i) => pRim(66, i))],
});

// Build: second wind.
section('Build: second wind', 8, {
  drums: [
    ...fill(4, (i) => drumBar({ v: 110, i, claps: true, crash: i === 0 })),
    ...fill(2, (i) => drumBar({ v: 112, i: i + 4, hats: '16', claps: true })),
    drumBar({ v: 112, i: 6, hats: '16', claps: true, open: true }),
    roll16(116),
  ],
  bass: [...fill(6, (i) => b16(ch(104 + i), 108, i)), ...fill(2, (i) => bpop(ch(110 + i), 114, i))],
  stabs: [...fill(4, (i) => stab(ch(104 + i), 98, 'A')), ...fill(4, (i) => stab(ch(108 + i), 100, 'B'))],
  melody: [...fill(4, (i) => m1(ch(104 + i), 96)), ...fill(4, (i) => m3(ch(108 + i), 100))],
  pad: fill(8, (i) => pad('padB', ch(104 + i), 60)),
  perc: [...fill(7, (i) => pRim(74, i)), pTom(92)],
});

// Final drop: the hook over everything.
section('Final drop: the hook over everything', 16, {
  drums: fill(16, (i) =>
    drumBar({ v: 116, i, hats: i < 8 ? '8' : '16', claps: true, open: i % 4 === 3, crash: i % 8 === 0 }),
  ),
  bass: fill(16, (i) => bpop(ch(112 + i), 116, i)),
  stabs: [...fill(8, (i) => stab(ch(112 + i), 104, 'B')), ...fill(8, (i) => stab(ch(120 + i), 106, 'A'))],
  melody: [...fill(8, (i) => m1(ch(112 + i), 102)), ...fill(8, (i) => (i % 2 === 0 ? HOOK : HOOK2)[ch(120 + i)](106))],
  pad: fill(16, (i) => pad('padB', ch(112 + i), 62)),
  perc: fill(16, (i) => pRim(82, i)),
});

// Outro: the layers leave one by one and the song cadences on F minor.
section('Outro', 8, {
  drums: [
    ...fill(4, (i) => drumBar({ v: 106, i, claps: true, crash: i === 0 })),
    ...fill(2, (i) => drumBar({ v: 100, i: i + 4 })),
    kickOnly(96, 6),
    '[k cr]/4:112 r/2.',
  ],
  bass: [...fill(4, (i) => b16(ch(128 + i), 100, i)), ...fill(2, (i) => b8(ch(132 + i), 90)), bhold(ch(134), 84), bhold(ch(135), 80)],
  stabs: [...fill(2, (i) => stab(ch(128 + i), 92, 'A')), ...fill(2, (i) => stab(ch(130 + i), 84, 'C')), ...fill(4, () => R)],
  melody: [...fill(4, (i) => m2(ch(128 + i), 86)), R, R, 'C5/1:76~', 'C5/1'],
  pad: fill(8, (i) => pad('padA', ch(128 + i), 54)),
  perc: [...fill(4, (i) => pRim(66, i)), ...fill(4, () => R)],
});

// Every bar must be exactly one 4/4 bar (3840 ticks). Durations are written out in full above; the
// checker here just makes sure of the arithmetic before the song file is written.
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

const total = tracks.melody.length;
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

const text = `# Riverfront, by MiMo v2.6 Pro and SZ. An original for the Techno style: warm chord stabs, a dark
# evolving pad, a hypnotic counter-line, and a rolling sub bass under a four-on-the-floor kit at 124
# BPM in F minor. Built section by section over 136 bars: intro, a groove that grows a layer every 8
# bars, a breakdown where the kick drops and the hook surfaces over the pad and chords, a build, two
# drops, a stripped break, a second build, the final drop with the hook over everything, and an outro
# that cadences on F minor. The chord loop is Fm Db Ab Eb Fm Db Bbm Eb; every part follows it, the
# hats and stabs carry small timing offsets and uneven velocities so the kit breathes.
title: Riverfront
composer: MiMo v2.6 Pro & SZ
year: 2026
source: original
category: originals
style: techno
key: F minor
tempo: 124
time: 4/4

track melody role=counter vol=0.8
${block('melody')}

track stabs role=chords vol=1 pan=-0.15
${block('stabs')}

track pad role=pad vol=0.75
${block('pad')}

track bass role=bass vol=0.4
${block('bass')}

track drums role=drums vol=0.78
${block('drums')}

track perc role=drums vol=1 pan=0.25
${block('perc')}
`;
writeFileSync(join(out, 'riverfront.song'), text);
console.log(`wrote ${out}/riverfront.song (${total} bars)`);
