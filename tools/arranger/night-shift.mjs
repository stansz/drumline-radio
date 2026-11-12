// Night Shift: an original for the Techno style, built section by section like club.mjs. The acid
// line and the hook are the song's own; this script lays them out over 112 bars: intro, acid groove,
// a breakdown with the hook, the drop, a stripped break with an answering hook, a build, a long
// second drop with an arpeggio on top, and the outro.
//   node tools/arranger/night-shift.mjs [outDir]
import {
  cycle, entryVelocity, MIXED, noteName, outDir, repeatBar, saveSong, sectionBuilder,
} from './lib.mjs';

const out = outDir();

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

const nm = (n) => noteName(n, MIXED);
const loop = (n, from = 0) => Array.from({ length: n }, (_, i) => LOOP[(from + i) % 8]);
// The hook runs over 4 bars, so its chords go Dm, Bb, C, Dm.
const HOOK_CHORDS = ['Dm', 'Bb', 'C', 'Dm'];
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
const { tracks, section, block } = sectionBuilder(keys);

section('Intro: kick, then hats', 8, {
  drums: entryVelocity(100, [...repeatBar(DRUMS.four, 4), ...repeatBar(DRUMS.hats, 4)]),
});
section('The bass comes in', 8, {
  bass: entryVelocity(96, loop(8).map(T.off8)),
  drums: entryVelocity(104, repeatBar(DRUMS.hats, 8)),
  perc: entryVelocity(66, repeatBar(PERC, 8)),
});
section('The acid line', 16, {
  acid: entryVelocity(96, loop(16).map(T.acid)),
  pad: [...repeatBar(null, 8), ...entryVelocity(56, loop(8).map(T.pad))],
  bass: entryVelocity(100, loop(16).map(T.off8)),
  drums: entryVelocity(108, drumsWithCrash(16)),
  perc: entryVelocity(70, repeatBar(PERC, 16)),
});
section('Breakdown: the hook appears', 16, {
  hook: entryVelocity(88, cycle(HOOK, 16)),
  stabs: entryVelocity(92, cycle(HOOK_CHORDS, 16).map(T.stabs)),
  pad: entryVelocity(64, cycle(HOOK_CHORDS, 16).map(T.pad)),
  bass: [...repeatBar(null, 8), ...entryVelocity(84, cycle(HOOK_CHORDS, 8).map(T.hold))],
  drums: [...repeatBar(null, 12), ...rollIn],
});
section('Drop: the hook over everything', 16, {
  acid: entryVelocity(100, cycle(HOOK_CHORDS, 16).map(T.acid)),
  hook: entryVelocity(96, cycle(HOOK, 16)),
  stabs: entryVelocity(100, cycle(HOOK_CHORDS, 16).map(T.stabs)),
  pad: entryVelocity(60, cycle(HOOK_CHORDS, 16).map(T.pad)),
  bass: entryVelocity(112, cycle(HOOK_CHORDS, 16).map(T.rollPop)),
  drums: entryVelocity(112, drumsWithCrash(16)),
  perc: entryVelocity(76, repeatBar(PERC, 16)),
});
section('Stripped: acid, pad, and an answering hook', 8, {
  acid: entryVelocity(80, cycle(HOOK_CHORDS, 8).map(T.acid)),
  answer: entryVelocity(86, cycle(ANSWER, 8)),
  pad: entryVelocity(62, cycle(HOOK_CHORDS, 8).map(T.pad)),
  bass: entryVelocity(88, cycle(HOOK_CHORDS, 8).map(T.hold)),
  perc: entryVelocity(66, repeatBar(PERC, 8)),
});
section('Build: the kick returns, the arp joins', 8, {
  acid: entryVelocity(92, cycle(HOOK_CHORDS, 8).map(T.acid)),
  arp: entryVelocity(56, cycle(HOOK_CHORDS, 8).map(T.arp)),
  answer: entryVelocity(90, cycle(ANSWER, 8)),
  pad: entryVelocity(64, cycle(HOOK_CHORDS, 8).map(T.pad)),
  bass: entryVelocity(104, [...cycle(HOOK_CHORDS, 7).map(T.roll), null]),
  drums: entryVelocity(108, [...repeatBar(DRUMS.hats, 4), ...rollIn]),
});
section('Second drop: everything', 24, {
  acid: entryVelocity(104, cycle(HOOK_CHORDS, 24).map(T.acid)),
  hook: entryVelocity(98, [...cycle(HOOK, 8), ...repeatBar(null, 8), ...cycle(HOOK, 8)]),
  answer: entryVelocity(94, [...repeatBar(null, 8), ...cycle(ANSWER, 8), ...repeatBar(null, 8)]),
  arp: entryVelocity(62, cycle(HOOK_CHORDS, 24).map(T.arp)),
  stabs: entryVelocity(102, cycle(HOOK_CHORDS, 24).map(T.stabs)),
  pad: entryVelocity(62, cycle(HOOK_CHORDS, 24).map(T.pad)),
  bass: entryVelocity(114, cycle(HOOK_CHORDS, 24).map(T.rollPop)),
  drums: entryVelocity(114, drumsWithCrash(24)),
  perc: entryVelocity(80, repeatBar(PERC, 24)),
});
section('Outro', 8, {
  acid: entryVelocity(84, loop(4).map(T.acid)),
  bass: entryVelocity(100, [...loop(6).map(T.off8)]),
  drums: entryVelocity(104, [...repeatBar(DRUMS.full, 4), ...repeatBar(DRUMS.hats, 2), DRUMS.four, DRUMS.end]),
  perc: entryVelocity(66, repeatBar(PERC, 4)),
});

const total = tracks.acid.length;
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
saveSong(out, 'night-shift.song', text);
console.log(`wrote ${out}/night-shift.song (${total} bars)`);
