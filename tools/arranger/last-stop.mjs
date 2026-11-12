// Last Stop: slow lo-fi hip-hop for the Lo-fi style. One four-bar minor loop all the way through,
// like a sampled record: chopped Rhodes, a lazy straight kick and rim click, and an upright bass playing the
// melody in short repeating phrases (it doubles as the bass line). Written out by hand here.
//   node tools/arranger/last-stop.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeBlock } from './lib.mjs';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// The loop: Fm7 | Eb | Db | Eb. A modal loop with no dominant chord, so it never resolves; Third
// Rail's i-iv-VI-V7 turnaround does, which keeps the two songs apart.
const CH = { fm: '[F3 Ab3 C4 Eb4]', eb: '[G3 Bb3 Eb4]', db: '[F3 Ab3 Db4]' };
const LOOP = [CH.fm, CH.eb, CH.db, CH.eb];
const KEYS = {
  // a short hit on the one, then the chord pushed in early on the and of three and held
  chop: LOOP.map((c) => `${c}/8 r/8 r/4 r/8 ${c}/4.:54`),
  // the hook adds a high stab on the and of two
  stab: LOOP.map((c, i) => `${c}/8 r/8 r/8 ${['[Ab4 C5]', '[G4 Bb4]', '[F4 Ab4]', '[G4 Bb4]'][i]}/8:58 r/8 ${c}/4.:54`),
  // held chords for the break
  hold: LOOP.map((c) => `${c}/1`),
};

// Straight eighths, not swung, with a rim click instead of a snare. The rim drags 30 ticks; the hats
// stay on the grid and alternate loud and soft.
const DRUMS = {
  hats: 'h/8:56 h/8:44 h/8:56 h/8:44 h/8:56 h/8:44 h/8:56 h/8:44',
  kickHats: 'k/8 h/8:44 h/8:56 h/8:44 h/8:56 k/8:84 h/8:56 h/8:44',
  a: 'k/8 h/8:44 [rim h]/8+30 h/8:44 h/8:56 k/8:84 [rim h]/8+30 h/8:44',
  b: 'k/8 h/8:44 [rim h]/8+30 k/8:76 h/8:56 h/8:44 [rim h]/8+30 k/8:80',
  fill: 'k/8 h/8:44 [rim h]/8+30 h/8:44 k/8 rim/16+20:60 rim/16+20:70 [s h]/8+30:96 r/8',
};
const groove = (n, fill = true) => Array.from({ length: n }, (_, i) =>
  fill && i === n - 1 ? DRUMS.fill : i % 2 ? DRUMS.b : DRUMS.a);

// The upright bass: two short phrases (the patch sounds them an octave down), a little behind the beat.
const VERSE = ['r/4 Ab3/8+12 C4/8+12 Eb4/4+12 C4/4+12', 'Db4/4.+12 C4/8+12 Bb3/4+12 r/4',
  'r/4 Ab3/8+12 C4/8+12 F4/4+12 Eb4/8+12 Db4/8+12', 'C4/2+12 r/4 G3/8+12 Bb3/8+12'];
const HOOK = ['F4/8+12 Eb4/8+12 C4/4+12 r/8 F4/8+12 Eb4/8+12 C4/8+12', 'Db4/4+12 Bb3/4+12 r/2',
  'F4/8+12 Eb4/8+12 Db4/4+12 r/8 F4/8+12 Eb4/8+12 Db4/8+12', 'C4/4+12 Bb3/8+12 G3/8+12 Eb3/4+12 r/4'];

const tracks = { lead: [], keys: [], drums: [] };
const marks = [];
// Adds a section of n bars; each part is a list of bars (null or missing for rests).
function section(name, n, parts) {
  marks.push([tracks.lead.length, name]);
  for (const key of Object.keys(tracks)) {
    for (let b = 0; b < n; b++) tracks[key].push(parts[key]?.[b] ?? 'R');
  }
}
const v = (vel, bars) => bars.map((bar, i) => (bar === null ? null : i === 0 ? `v=${vel} ${bar}` : bar));
const loop = (bars, times) => Array.from({ length: times }, () => bars).flat();

section('Intro: the record starts', 4, {
  keys: v(60, KEYS.chop),
});
section('The beat drops in', 4, {
  keys: v(64, KEYS.chop),
  drums: v(92, [DRUMS.hats, DRUMS.kickHats, DRUMS.kickHats, DRUMS.fill]),
});
section('Verse', 8, {
  lead: v(84, loop(VERSE, 2)),
  keys: v(66, loop(KEYS.chop, 2)),
  drums: v(100, groove(8)),
});
section('Hook', 8, {
  lead: v(90, loop(HOOK, 2)),
  keys: v(68, loop(KEYS.stab, 2)),
  drums: v(104, groove(8)),
});
section('Break: keys and crackle', 4, {
  lead: v(70, [VERSE[0], VERSE[1], null, null]),
  keys: v(54, KEYS.hold),
});
section('Verse 2', 8, {
  lead: v(86, loop(VERSE, 2)),
  keys: v(66, loop(KEYS.chop, 2)),
  drums: v(100, groove(8)),
});
section('Last hook', 8, {
  lead: v(92, loop(HOOK, 2)),
  keys: v(70, loop(KEYS.stab, 2)),
  drums: v(106, groove(8)),
});
section('Outro: the record runs out', 4, {
  keys: v(58, [...KEYS.chop.slice(0, 3), '[F3 Ab3 C4 Eb4]/1']),
  drums: v(84, [DRUMS.a, DRUMS.b, DRUMS.kickHats, 'k/1']),
});

const total = tracks.lead.length;
const HEADER = [
  ['lead', 'track upright role=lead inst=upright-bass vol=0.7'],
  ['keys', 'track keys role=chords vol=0.9 pan=-0.15'],
  ['drums', 'track drums role=drums vol=0.9'],
];
const block = (key) => writeBlock(tracks[key], marks);

const text = `# Last Stop, by Claude and SZ. Slow lo-fi hip-hop: one minor loop like a sampled record, chopped
# keys, a lazy kick and rim click, and an upright bass playing short phrases.
title: Last Stop
composer: Claude & SZ
year: 2026
source: original
category: originals
key: F minor
style: lofi
tempo: 72
time: 4/4
about: The last bus home, half asleep: one dusty loop, a lazy kick and rim click, and an upright bass humming the same few notes to itself.

@bars ${total - 3}-${total} tempo=72..62

${HEADER.map(([key, head]) => `${head}\n${block(key)}`).join('\n\n')}
`;
writeFileSync(join(out, 'last-stop.song'), text);
console.log(`wrote ${out}/last-stop.song (${total} bars)`);
