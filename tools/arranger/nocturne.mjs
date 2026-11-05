// Nocturne in E-flat, Op. 9 No. 2 (Chopin, 1832), arranged for the Orchestral style: the violins sing
// the melody over the harp and cellos playing the left hand's bass-and-chords. The form follows
// Chopin's: the theme, the theme ornamented, the middle in B-flat, the theme again, a C-minor climax,
// the theme in full, and the coda with its climbing cadenza. The bass sits low on the beat so it also
// hits hard when remixed into Techno.
//   node tools/arranger/nocturne.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6] };
const nm = (n) => `${SHARP[n % 12]}${Math.floor(n / 12) - 1}`;
const BAR = 5760; // 12/8
const HELD = { 1: '/4.', 2: '/2.', 4: '/1.' }; // a chord held for 1, 2 or 4 dotted-quarter beats

function chord(sym) {
  const [main, slash] = sym.split('/');
  const m = /^([A-G](?:#|b)?)(maj7|m7|m|7|dim)?$/.exec(main);
  if (!m) throw new Error(`bad chord ${sym}`);
  const pc = PC[m[1]];
  return { pc, iv: QUALITY[m[2] ?? ''], bass: slash ? PC[slash] : pc };
}
// One bar of chords ('Eb/Bb Bb7') -> one entry per chord, each lasting an equal share of the bar.
const spans = (bar) => bar.split(' ').map((s) => ({ c: chord(s), beats: 4 / bar.split(' ').length }));
const each = (bars, fn) => bars.map((bar) => spans(bar).map(({ c, beats }) => fn(c, beats)).join(' '));
const times = (n, s) => Array(n).fill(s).join(' ');

const bassNote = (c) => (c.bass >= 8 ? 24 + c.bass : 36 + c.bass); // Ab1-G2: low enough to thump
const voicing = (c) => c.iv.slice(0, 3).map((i) => 55 + ((c.pc + i - 7 + 12) % 12)); // G3-F#4

// Left-hand textures, per dotted-quarter beat.
const T = {
  // the bass on every beat, the first of each pair the strongest
  bass: (c, beats) => (beats === 1 ? `${nm(bassNote(c))}/4.` : times(beats / 2, `${nm(bassNote(c))}/4. ${nm(bassNote(c))}/4.:84`)),
  // the chord on the second and third eighths of every beat
  harp: (c, beats) => times(beats, `r/8 [${voicing(c).map(nm).join(' ')}]/8 [${voicing(c).map(nm).join(' ')}]/8`),
  pad: (c, beats) => `[${c.iv.map((i) => nm(48 + c.pc + i - (c.pc >= 8 ? 12 : 0))).join(' ')}]${HELD[beats]}`,
  // bells sparkle: the chord tones climbing, one per eighth
  bells: (c, beats) => {
    const tones = [...c.iv.slice(0, 3).map((i) => 72 + c.pc + i), 84 + c.pc];
    return Array.from({ length: beats * 3 }, (_, i) => `${nm(tones[i % 4] - (c.pc >= 8 ? 12 : 0))}/8`).join(' ');
  },
};

// A slow counter-line of chord tones, a dotted half per chord, moving as little as possible.
function counterLine(bars, start = 67) {
  let prev = start;
  return each(bars, (c, beats) => {
    const pool = [];
    for (let n = 60; n <= 79; n++) if (c.iv.includes((((n - c.pc) % 12) + 12) % 12)) pool.push(n);
    prev = pool.reduce((best, n) => (Math.abs(n - prev) < Math.abs(best - prev) ? n : best), pool[0]);
    return `${nm(prev)}${HELD[beats]}`;
  });
}

// The melody, bar by bar (12 eighths each). A bar ending in B-flat 4 leads into the next phrase.
const M = {
  a1: 'G5/4 F5/8 G5/2~ G5/8 F5/8 Eb5/4 Bb4/8',
  a1o: 'G5/4 F5/8 G5/4 Ab5/16 G5/16 F5/8 G5/8 F5/8 Eb5/4 Bb4/8',
  a1oo: 'G5/4 F5/8 G5/8 Ab5/16 G5/16 F#5/16 G5/16 Bb5/8 G5/8 F5/8 Eb5/4 Bb4/8',
  a2: 'G5/4 C5/8 C6/2~ C6/8 G5/8 Bb5/4 Ab5/8',
  a2o: 'G5/4 C5/8 C6/4 D6/16 C6/16 B5/8 C6/8 G5/8 Bb5/4 Ab5/8',
  a3: 'G5/4 F5/8 G5/4 C5/8 D5/4. Eb5/8 D5/8 C5/8',
  a3o: 'G5/4 F5/8 G5/4 C5/8 D5/8 Eb5/16 D5/16 C#5/16 D5/16 Eb5/8 D5/8 C5/8',
  a4: 'Bb4/4. Bb5/8 Ab5/8 G5/8 F5/8 G5/8 C5/8 D5/8 Eb5/8 Bb4/8', // leads on
  a4end: 'Bb4/4. Bb5/8 Ab5/8 G5/8 F5/4 D5/8 Eb5/4.', // comes home
  b1: 'F5/4. D5/8 Eb5/8 F5/8 Bb5/4. Ab5/8 G5/8 F5/8',
  b2: 'G5/4. Eb5/8 F5/8 G5/8 C6/4 Bb5/8 A5/4 G5/8',
  b3: 'F5/4. D5/8 Eb5/8 F5/8 D6/4. C6/8 Bb5/8 G5/8',
  b4: 'F5/4. Eb5/8 D5/8 C5/8 Bb4/4. r/4 Bb4/8',
  c1: 'Eb5/4. G5/8 C6/8 Eb6/8 D6/4. C6/8 B5/8 C6/8',
  c2: 'Ab5/4. F5/8 Ab5/8 C6/8 B5/4. G5/8 B5/8 D6/8',
  c3: 'Eb6/4. C6/8 Ab5/8 Eb6/8 F6/4. Eb6/8 D6/8 C6/8',
  c4: 'Bb5/4. Ab5/8 G5/8 F5/8 D5/4 Eb5/8 C5/4 Bb4/8',
  // the coda: the trill-like turn on B-flat, the climb to B-flat 6, and the long way down
  k1: 'Bb5/8 B5/8 Bb5/8 B5/8 Bb5/8 B5/8 Bb5/8 C6/8 Bb5/8 Db6/8 C6/8 Bb5/8',
  k2: 'Bb5/16 B5/16 C6/16 Db6/16 D6/16 Eb6/16 E6/16 F6/16 Gb6/16 G6/16 Ab6/16 A6/16 Bb6/2.',
  k3: 'Ab6/8 G6/8 F6/8 Eb6/8 D6/8 C6/8 Bb5/8 Ab5/8 G5/8 F5/8 Eb5/8 D5/8',
  k4: 'Eb6/4. Bb5/8 G5/8 Eb5/8 G5/4. F5/8 Eb5/8 D5/8',
  k5: 'G5/4. F5/4. Eb5/4. D5/4.',
  k6: 'Eb5/2.~ Eb5/2.',
  k7: 'r/1.',
};
const A = ['Eb', 'Ab', 'Eb/Bb Bb7', 'Eb Bb7'];
const A_HOME = ['Eb', 'Ab', 'Eb/Bb Bb7', 'Bb7 Eb'];
const B = ['Bb', 'Eb F7', 'Bb/D Gm', 'F7 Bb7'];
const C = ['Cm G7', 'Fm G7', 'Ab Fm', 'Bb7'];
const CODA = ['Eb/Bb', 'Bb7', 'Bb7', 'Eb Bb7', 'Eb/Bb Eb/Bb Eb/Bb Bb7', 'Eb', 'Eb'];

const keys = ['violins', 'flute', 'bells', 'harp', 'pad', 'cellos', 'drums'];
const tracks = Object.fromEntries(keys.map((k) => [k, []]));
const marks = [];
const R = 'R';
const rep = (bar, n) => Array(n).fill(bar);
const v = (vel, bars) => bars.map((bar, i) => (bar === null || bar === R ? R : i === 0 || (bars[i - 1] ?? R) === R ? `v=${vel} ${bar}` : bar));
function section(name, n, parts) {
  marks.push([tracks.violins.length, name]);
  for (const key of keys) {
    const bars = parts[key];
    if (bars && bars.length > n) throw new Error(`${name}: ${key} has ${bars.length} bars`);
    for (let b = 0; b < n; b++) tracks[key].push(bars?.[b] ?? R);
  }
}
const melody = (...names) => names.map((n) => M[n]);

section('Intro: the harp sets the rocking left hand', 1, {
  violins: v(84, ['r/2. r/4. r/4 Bb4/8']),
  harp: v(62, each(['Eb'], T.harp)),
  cellos: v(84, each(['Eb'], T.bass)),
});
section('The theme', 4, {
  violins: v(86, melody('a1', 'a2', 'a3', 'a4')),
  harp: v(64, each(A, T.harp)),
  cellos: v(92, each(A, T.bass)),
});
section('The theme, ornamented', 4, {
  violins: v(92, melody('a1o', 'a2o', 'a3', 'a4end')),
  flute: v(52, counterLine(A_HOME)),
  harp: v(68, each(A_HOME, T.harp)),
  pad: v(40, each(A_HOME, T.pad)),
  cellos: v(96, each(A_HOME, T.bass)),
});
section('The middle, in B-flat', 4, {
  violins: v(96, melody('b1', 'b2', 'b3', 'b4')),
  harp: v(72, each(B, T.harp)),
  pad: v(46, each(B, T.pad)),
  cellos: v(100, each(B, T.bass)),
});
section('The theme returns', 4, {
  violins: v(94, melody('a1o', 'a2o', 'a3o', 'a4')),
  flute: v(56, counterLine(A)),
  harp: v(70, each(A, T.harp)),
  pad: v(48, each(A, T.pad)),
  cellos: v(100, each(A, T.bass)),
});
section('Climax in C minor', 4, {
  violins: v(112, melody('c1', 'c2', 'c3', 'c4')),
  flute: v(70, counterLine(C, 72)),
  harp: v(82, each(C, T.harp)),
  pad: v(64, each(C, T.pad)),
  cellos: v(110, each(C, T.bass)),
  drums: v(70, ['k/4. r/4. r/4. r/4.', 'k/4. r/4. r/4. r/4.', 'k/4. r/4. k/4. r/4.', 'k/4. r/4. [k cr]/4. r/4.']),
});
section('The theme in full', 4, {
  violins: v(104, melody('a1oo', 'a2o', 'a3o', 'a4end')),
  flute: v(62, counterLine(A_HOME)),
  harp: v(76, each(A_HOME, T.harp)),
  pad: v(56, each(A_HOME, T.pad)),
  cellos: v(106, each(A_HOME, T.bass)),
  drums: v(60, ['k/4. r/4. r/4. r/4.', null, 'k/4. r/4. r/4. r/4.', null]),
});
section('Coda: the cadenza and the last chords', 7, {
  violins: v(94, melody('k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7')),
  bells: [null, ...v(40, each(CODA.slice(1, 3), T.bells))],
  harp: v(66, [...each(CODA.slice(0, 6), T.harp), '[Eb3 G3 Bb3 Eb4 G4]/1.']),
  pad: v(44, each(CODA, T.pad)),
  cellos: v(96, [...each(CODA.slice(0, 6), T.bass), 'Eb2/1.']),
});

const total = tracks.violins.length;
const HEADER = [
  ['violins', 'track violins role=lead vol=0.9'],
  ['flute', 'track flute role=counter vol=0.5 pan=0.3'],
  ['bells', 'track bells role=arp vol=0.3 pan=-0.3'],
  ['harp', 'track harp role=chords vol=0.75 pan=-0.2'],
  ['pad', 'track strings role=pad vol=0.55'],
  ['cellos', 'track cellos role=bass vol=0.7'],
  ['drums', 'track drums role=drums vol=0.6'],
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

const text = `# Nocturne in E-flat, Op. 9 No. 2 by Frédéric Chopin (1832), arranged by Claude and SZ for the
# Orchestral style: violins sing the melody over harp and cellos, through Chopin's form to the coda.
title: Nocturne in E-flat
composer: Frédéric Chopin
arranger: Claude & SZ
about: Chopin wrote his three Op. 9 nocturnes around 1830 to 1831 and published them in 1832, dedicated to the pianist Marie Pleyel. The second, in E-flat, became his most famous: a singing melody over a rocking left hand, ornamented a little more each time it comes back.
year: 1832
source: public-domain
category: classics
key: Eb major
style: orchestral
tempo: 66
time: 12/8

@bars ${total - 3}-${total} tempo=66..46

${HEADER.map(([key, head]) => `${head}\n${block(key)}`).join('\n\n')}
`;
writeFileSync(join(out, 'nocturne.song'), text);
console.log(`wrote ${out}/nocturne.song (${total} bars)`);
