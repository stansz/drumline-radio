// Last Stop: slow lo-fi hip-hop for the Lo-fi style. One four-bar minor loop all the way through,
// like a sampled record: chopped Rhodes, a lazy swung kick and snare, and an upright bass playing the
// melody in short repeating phrases (it doubles as the bass line). Written out by hand here.
//   node tools/arranger/last-stop.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// The loop: Fm7 | Bbm | Db | C7.
const KEYS = {
  // a chop on the one, a softer re-hit on the and of two, then space
  chop: ['[F3 Ab3 C4 Eb4]/4. [F3 Ab3 C4 Eb4]/8:54 r/2', '[F3 Bb3 Db4]/4. [F3 Bb3 Db4]/8:54 r/2',
    '[F3 Ab3 Db4]/4. [F3 Ab3 Db4]/8:54 r/2', '[E3 G3 Bb3 C4]/4. [E3 G3 Bb3 C4]/8:54 r/2'],
  // the hook adds a high stab on the and of four
  stab: ['[F3 Ab3 C4 Eb4]/4. [F3 Ab3 C4 Eb4]/8:54 r/4 r/8 [Ab4 C5]/8:58', '[F3 Bb3 Db4]/4. [F3 Bb3 Db4]/8:54 r/4 r/8 [F4 Bb4]/8:58',
    '[F3 Ab3 Db4]/4. [F3 Ab3 Db4]/8:54 r/4 r/8 [F4 Ab4]/8:58', '[E3 G3 Bb3 C4]/4. [E3 G3 Bb3 C4]/8:54 r/4 r/8 [E4 G4]/8:58'],
  // held chords for the break
  hold: ['[F3 Ab3 C4 Eb4]/1', '[F3 Bb3 Db4]/1', '[F3 Ab3 Db4]/1', '[E3 G3 Bb3 C4]/1'],
};

// Swung eighths as triplets. The snare drags 18 ticks and the off-hats push 8 early.
const DRUMS = {
  hats: 'h/4t:70 h/8t-8:52 h/4t:66 h/8t-8:52 h/4t:70 h/8t-8:52 h/4t:66 h/8t-8:52',
  kickHats: 'k/4t h/8t-8:52 h/4t:66 h/8t-8:52 k/4t k/8t:78 h/4t:66 h/8t-8:52',
  a: 'k/4t h/8t-8:52 [s h]/4t+18 h/8t-8:52 k/4t k/8t:78 [s h]/4t+18 h/8t-8:52',
  b: 'k/4t h/8t-8:52 [s h]/4t+18 k/8t:74 r/4t k/8t:80 [s h]/4t+18 h/8t-8:52',
  fill: 'k/4t h/8t-8:52 [s h]/4t+18 h/8t-8:52 k/4t s/8t+10:56 s/4t+12:70 s/8t+18:88',
};
const groove = (n, fill = true) => Array.from({ length: n }, (_, i) =>
  fill && i === n - 1 ? DRUMS.fill : i % 2 ? DRUMS.b : DRUMS.a);

// The upright bass: two short phrases (the patch sounds them an octave down), a little behind the beat.
const VERSE = ['r/4 Ab3/8+12 C4/8+12 Eb4/4+12 C4/4+12', 'Db4/4.+12 C4/8+12 Bb3/4+12 r/4',
  'r/4 Ab3/8+12 C4/8+12 F4/4+12 Eb4/8+12 Db4/8+12', 'C4/2+12 r/4 G3/8+12 Bb3/8+12'];
const HOOK = ['F4/8+12 Eb4/8+12 C4/4+12 r/8 F4/8+12 Eb4/8+12 C4/8+12', 'Db4/4+12 Bb3/4+12 r/2',
  'F4/8+12 Eb4/8+12 Db4/4+12 r/8 F4/8+12 Eb4/8+12 Db4/8+12', 'C4/4+12 Bb3/8+12 G3/8+12 E3/4+12 r/4'];

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
  ['keys', 'track keys role=chords vol=0.75 pan=-0.15'],
  ['drums', 'track drums role=drums vol=0.9'],
];
const block = (key) => {
  const lines = [];
  const at = new Map(marks);
  let row = [];
  const flush = () => { if (row.length) lines.push(`| ${row.join(' | ')} |`); row = []; };
  tracks[key].forEach((bar, i) => {
    if (at.has(i)) { flush(); lines.push(`# ${at.get(i)}`); }
    row.push(bar);
    if (row.length === 4) flush();
  });
  flush();
  return lines.join('\n');
};

const text = `# Last Stop, by Claude and SZ. Slow lo-fi hip-hop: one minor loop like a sampled record, chopped
# keys, a lazy swung beat, and an upright bass playing short phrases.
title: Last Stop
composer: Claude & SZ
year: 2026
source: original
category: originals
key: F minor
style: lofi
tempo: 72
time: 4/4
about: The last bus home, half asleep: one dusty loop, a lazy kick and snare, and an upright bass humming the same few notes to itself.

@bars ${total - 3}-${total} tempo=72..62

${HEADER.map(([key, head]) => `${head}\n${block(key)}`).join('\n\n')}
`;
writeFileSync(join(out, 'last-stop.song'), text);
console.log(`wrote ${out}/last-stop.song (${total} bars)`);
