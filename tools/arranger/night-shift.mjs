// Night Shift: an original for the Techno style, built section by section like club.mjs. The acid
// line and the hook are the song's own; this script lays them out over 112 bars: intro, acid groove,
// a breakdown with the hook, the drop, a stripped break with an answering hook, a build, a long
// second drop with an arpeggio on top, and the outro.
//   node tools/arranger/night-shift.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeBlock } from './lib.mjs';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// The 8-bar loop: D minor for four bars, B-flat for two, C for two.
const LOOP = ['Dm', 'Dm', 'Dm', 'Dm', 'Bb', 'Bb', 'C', 'C'];
const ACID = {
  Dm: 'D3/16 D3 D4:120 D3 F3 D3 A3 D3 C4:120 D3 D4 D3 F3 A3 G3 F3',
  Bb: 'Bb3/16 Bb3 Bb4:120 Bb3 D4 Bb3 F4 Bb3 A3:120 Bb3 Bb4 Bb3 D4 F4 D4 C4',
  C: 'C4/16 C4 C5:120 C4 E4 C4 G4 C4 Bb3:120 C4 C5 C4 E4 G4 E4 D4',
};
const ROOT = { Dm: 38, Bb: 34, C: 36 }; // D2, Bb1, C2
const STAB = { Dm: '[D4 F4 A4]', Bb: '[D4 F4 Bb4]', C: '[E4 G4 C5]' };
const PAD = { Dm: '[D3 A3 F4]', Bb: '[Bb2 F3 D4]', C: '[C3 G3 E4]' };
const ARP = { Dm: [62, 65, 69, 74], Bb: [62, 65, 70, 74], C: [64, 67, 72, 76] };
// The hook (the song's own) over Dm, Bb, C, Dm; and the answering hook, new here.
const HOOK = [
  'D5/8. A4/16 r/8 F5/8 r/8 E5/8 D5/4', 'D5/8. Bb4/16 r/8 F5/8 r/8 D5/8 C5/4',
  'E5/8. C5/16 r/8 G5/8 r/8 F5/8 E5/4', 'D5/2 r/2',
];
const ANSWER = [
  'A5/8. F5/16 r/8 D5/8 r/8 E5/8 F5/4', 'F5/8. D5/16 r/8 Bb4/8 r/8 C5/8 D5/4',
  'G5/8. E5/16 r/8 C5/8 r/8 D5/8 E5/4', 'F5/4 E5/4 D5/2',
];

const SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = (n) => `${SHARP[n % 12]}${Math.floor(n / 12) - 1}`;
const loop = (n, from = 0) => Array.from({ length: n }, (_, i) => LOOP[(from + i) % 8]);
// The hook runs over 4 bars, so its chords go Dm, Bb, C, Dm.
const HOOK_CHORDS = ['Dm', 'Bb', 'C', 'Dm'];
const cyc = (list, n) => Array.from({ length: n }, (_, i) => list[i % list.length]);
const T = {
  acid: (c) => ACID[c],
  off8: (c) => Array(4).fill(`r/8 ${nm(ROOT[c])}/8`).join(' '),
  roll: (c) => Array(4).fill(`r/16 ${nm(ROOT[c])}/16 ${nm(ROOT[c])}/16 ${nm(ROOT[c])}/16`).join(' '),
  rollPop: (c) => Array(4).fill(`r/16 ${nm(ROOT[c])}/16 ${nm(ROOT[c] + 12)}/16 ${nm(ROOT[c])}/16`).join(' '),
  hold: (c) => `${nm(ROOT[c])}/1`,
  stabs: (c) => `r/8 ${STAB[c]}/8 r/4 r/8 ${STAB[c]}/8 r/4`,
  pad: (c) => `${PAD[c]}/1`,
  arp: (c) => Array.from({ length: 16 }, (_, i) => `${nm(ARP[c][[0, 2, 1, 3][i % 4]] + (i >= 8 ? 12 : 0))}/16`).join(' '),
};
const each = (chords, fn) => chords.map(fn);
const DRUMS = {
  four: 'k/4 k k k',
  hats: 'k/8 h k h k h k oh',
  full: 'k/8 oh [k cl] oh k oh [k cl] oh',
  crash: '[k cr]/8 oh [k cl] oh k oh [k cl] oh',
  snare8: 's/8 s s s s s s s',
  snare16: 's/16 s s s s s s s s s s s s s s s',
  end: '[k cr]/4 r/2.',
};
const PERC = 'r/8 rim/16 r/16 r/8 rim/8 r/16 tm/16 r/8 rim/8 r/8';
const drumsWithCrash = (n) => Array.from({ length: n }, (_, i) => (i % 8 === 0 ? DRUMS.crash : DRUMS.full));
const rollIn = ['v=70 s/4 s s s', 'v=82 s/8 s s s s s s s', `v=94 ${DRUMS.snare16}`, 'v=106 s/16 s s s s s s s r/2'];

const keys = ['acid', 'hook', 'answer', 'arp', 'stabs', 'pad', 'bass', 'drums', 'perc'];
const tracks = Object.fromEntries(keys.map((k) => [k, []]));
const marks = [];
const R = 'R';
const rep = (bar, n) => Array(n).fill(bar);
const v = (vel, bars) => bars.map((b, i) => (b === R || b === null ? R : i === 0 || bars[i - 1] === R || bars[i - 1] === null ? `v=${vel} ${b}` : b));
function section(name, n, parts) {
  marks.push([tracks.acid.length, name]);
  for (const key of keys) {
    const bars = parts[key] ?? [];
    if (bars.length > n) throw new Error(`${name}: ${key} has ${bars.length} bars`);
    for (let i = 0; i < n; i++) tracks[key].push(bars[i] ?? R);
  }
}

section('Intro: kick, then hats', 8, {
  drums: v(100, [...rep(DRUMS.four, 4), ...rep(DRUMS.hats, 4)]),
});
section('The bass comes in', 8, {
  bass: v(96, each(loop(8), T.off8)),
  drums: v(104, rep(DRUMS.hats, 8)),
  perc: v(66, rep(PERC, 8)),
});
section('The acid line', 16, {
  acid: v(96, each(loop(16), T.acid)),
  pad: [...rep(null, 8), ...v(56, each(loop(8), T.pad))],
  bass: v(100, each(loop(16), T.off8)),
  drums: v(108, drumsWithCrash(16)),
  perc: v(70, rep(PERC, 16)),
});
section('Breakdown: the hook appears', 16, {
  hook: v(88, cyc(HOOK, 16)),
  stabs: v(92, each(cyc(HOOK_CHORDS, 16), T.stabs)),
  pad: v(64, each(cyc(HOOK_CHORDS, 16), T.pad)),
  bass: [...rep(null, 8), ...v(84, each(cyc(HOOK_CHORDS, 8), T.hold))],
  drums: [...rep(null, 12), ...rollIn],
});
section('Drop: the hook over everything', 16, {
  acid: v(100, each(cyc(HOOK_CHORDS, 16), T.acid)),
  hook: v(96, cyc(HOOK, 16)),
  stabs: v(100, each(cyc(HOOK_CHORDS, 16), T.stabs)),
  pad: v(60, each(cyc(HOOK_CHORDS, 16), T.pad)),
  bass: v(112, each(cyc(HOOK_CHORDS, 16), T.rollPop)),
  drums: v(112, drumsWithCrash(16)),
  perc: v(76, rep(PERC, 16)),
});
section('Stripped: acid, pad, and an answering hook', 8, {
  acid: v(80, each(cyc(HOOK_CHORDS, 8), T.acid)),
  answer: v(86, cyc(ANSWER, 8)),
  pad: v(62, each(cyc(HOOK_CHORDS, 8), T.pad)),
  bass: v(88, each(cyc(HOOK_CHORDS, 8), T.hold)),
  perc: v(66, rep(PERC, 8)),
});
section('Build: the kick returns, the arp joins', 8, {
  acid: v(92, each(cyc(HOOK_CHORDS, 8), T.acid)),
  arp: v(56, each(cyc(HOOK_CHORDS, 8), T.arp)),
  answer: v(90, cyc(ANSWER, 8)),
  pad: v(64, each(cyc(HOOK_CHORDS, 8), T.pad)),
  bass: v(104, [...each(cyc(HOOK_CHORDS, 7), T.roll), null]),
  drums: v(108, [...rep(DRUMS.hats, 4), ...rollIn]),
});
section('Second drop: everything', 24, {
  acid: v(104, each(cyc(HOOK_CHORDS, 24), T.acid)),
  hook: v(98, [...cyc(HOOK, 8), ...rep(null, 8), ...cyc(HOOK, 8)]),
  answer: v(94, [...rep(null, 8), ...cyc(ANSWER, 8), ...rep(null, 8)]),
  arp: v(62, each(cyc(HOOK_CHORDS, 24), T.arp)),
  stabs: v(102, each(cyc(HOOK_CHORDS, 24), T.stabs)),
  pad: v(62, each(cyc(HOOK_CHORDS, 24), T.pad)),
  bass: v(114, each(cyc(HOOK_CHORDS, 24), T.rollPop)),
  drums: v(114, drumsWithCrash(24)),
  perc: v(80, rep(PERC, 24)),
});
section('Outro', 8, {
  acid: v(84, each(loop(4), T.acid)),
  bass: v(100, [...each(loop(6), T.off8)]),
  drums: v(104, [...rep(DRUMS.full, 4), ...rep(DRUMS.hats, 2), DRUMS.four, DRUMS.end]),
  perc: v(66, rep(PERC, 4)),
});

const total = tracks.acid.length;
const block = (key) => writeBlock(tracks[key], marks);

const text = `# Night Shift, by Claude and SZ. An original for the Techno style: an acid line, a hook that arrives
# in the breakdown, an answering hook, and two drops.
title: Night Shift
composer: Claude & SZ
year: 2026
source: original
category: originals
style: techno
key: D minor
tempo: 130
time: 4/4

track acid role=lead vol=0.65
${block('acid')}

track hook role=counter vol=0.7
${block('hook')}

track answer role=lead2 vol=0.55 pan=0.2
${block('answer')}

track arp role=arp vol=0.45 pan=-0.3
${block('arp')}

track stabs role=chords vol=0.85 pan=-0.15
${block('stabs')}

track pad role=pad vol=0.45
${block('pad')}

track bass role=bass vol=0.6
${block('bass')}

track drums role=drums vol=0.75
${block('drums')}

track perc role=drums vol=0.45 pan=0.2
${block('perc')}
`;
writeFileSync(join(out, 'night-shift.song'), text);
console.log(`wrote ${out}/night-shift.song (${total} bars)`);
