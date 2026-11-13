// Nocturne in E-flat, Op. 9 No. 2 (Chopin, 1832), arranged for the Orchestral style. The notes follow
// Chopin's score bar for bar (checked against the Mutopia Project engraving of the 1881 Schirmer
// edition): the violins play the right hand, the cellos the left hand's bass notes, and the piano its
// chords. A soft string pad holds each chord, and the cadenza runs up and down before the last chords.
// The bass sits an octave low where Chopin's is high, so it also hits hard when remixed into Techno.
// The tempo is an eighth at 108 (quarter 54), slower than Chopin's marked 132, like most recordings.
//   node tools/arranger/nocturne.mjs [outDir]
import {
  barMarks, MIXED, noteMidi, noteName, outDir, R, repeatBar, saveSong, writeBlock,
} from './lib.mjs';

const out = outDir();

const nm = (n) => noteName(n, MIXED);

// The left hand, bar by bar: twelve eighths, chord notes joined with dots. A single note on a beat
// is a bass note; everything else is the chords between.
const LH = [
  'Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 Ab3.D4 B3.D4.Ab4 Eb2 G3.Eb4 Bb3.Eb4.G4 D2 G3.Eb4 Bb3.Eb4.G4', // 1
  'C2 G3.E4 Bb3.E4.G4 C3 G3.E4 C4.E4.Bb4 F2 F3.C#4 Bb3.C#4.E4 F2 F3.C4 Ab3.C4.F4', // 2
  'Bb2 F3.D4 Bb3.D4.Ab4 B2 G3.F4 D4.F4.G4 C3 G3.Eb4 C4.Eb4.G4 A2 F#3.Eb4 C4.Eb4.F#4', // 3
  'Bb2 F3.Eb4 Bb3.Eb4.Ab4 Bb1 F3.D4 Bb3.Ab4 Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 4
  'Eb3 G3.Eb4 Bb3.Eb4.G4 Eb3 Ab3.D4 B3.D4.Ab4 Eb3 G3.Eb4 Bb3.Eb4.G4 D3 G3.Eb4 Bb3.Eb4.G4', // 5
  'C3 G3.E4 Bb3.E4.G4 C3 G3.E4 C4.E4.Bb4 F2 F3.C#4 Bb3.C#4.E4 F2 F3.C4 Ab3.C4.F4', // 6
  'Bb2 F3.D4 Bb3.D4.Ab4 B2 G3.F4 D4.F4.G4 C3 G3.Eb4 C4.Eb4.G4 A2 F#3.Eb4 C4.Eb4.F#4', // 7
  'Bb2 F3.Eb4 Bb3.Eb4.Ab4 Bb1 F3.D4 Bb3.Ab4 Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 8
  'Bb2 F3.D4 Bb3.D4.F4 Bb2 F3.D4 Bb3.D4.F4 A2 F3.C4 C4.F4 A2 F3.C4 C4.F4', // 9
  'Ab2 Eb3.C4 Ab3.C4.Eb4 Ab1 Eb3.B3 Ab3.B3.Eb4 Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 10
  'E2 E3.C#4 Bb3.C#4.G4 E2 E3.C4 Bb3.C4.G4 F2 F3.Eb4 C4.Eb4.F4 G2 G3.D4 Bb3.D4.G4', // 11
  'C2 G3.Eb4 C4.Eb4.G4 F2 F3.Eb4 C4.Eb4.F4 Bb3.D4 A3.Eb4 Ab3 G3 F3.C4.Eb4 Bb3.F4', // 12
  'Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 Ab3.D4 Bb3.D4.Ab4 Eb3 G3.Eb4 Bb3.G4 D3 G3.Eb4 Bb3.Eb4.G4', // 13
  'C3 G3.E4 Bb3.E4.G4 C3 G3.E4 C4.E4.Bb4 F2 F3.C#4 Bb3.C#4.E4 F2 F3.C4 Ab3.C4.F4', // 14
  'Bb2 F3.D4 Bb3.D4.Ab4 B2 G3.F4 D4.F4.G4 C3 G3.Eb4 C4.Eb4.G4 A2 F#3.Eb4 C4.Eb4.F#4', // 15
  'Bb2 F3.Eb4 Bb3.Eb4.Ab4 Bb1 F3.D4 Bb3.D4.Ab4 Eb2 G3.Eb4 Bb3.G4 Eb3 G3.Eb4 Bb3.G4', // 16
  'Bb2 F3.D4 Bb3.D4.F4 Bb2 F3.D4 Bb3.D4.F4 A2 F3.C4 C4.F4 A2 F3.C4 C4.F4', // 17
  'Ab2 Eb3.C4 Ab3.C4.Eb4 Ab1 Eb3.B3 Ab3.B3.Eb4 Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 18
  'E2 E3.C#4 Bb3.C#4.G4 E2 E3.C4 Bb3.C4.G4 F2 F3.Eb4 C4.Eb4.A4 G2 G3.D4 Bb3.D4.Bb4', // 19
  'C2 G3.Eb4 C4.Eb4.G4 F2 F3.Eb4 C4.Eb4.F4 Bb3.D4 A3.Eb4 Ab3 G3 F3.C4.Eb4 Bb3.F4', // 20
  'Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 Ab3.D4 Bb3.D4.Ab4 Eb3 G3.Eb4 Bb3.Eb4.G4 D3 G3.Eb4 Bb3.Eb4.G4', // 21
  'C3 G3.E4 Bb3.E4.G4 C3 G3.E4 C4.E4.Bb4 F2 F3.Bb3.C#4 Bb3.C#4.E4 F2 F3.C4 Ab3.C4.F4', // 22
  'Bb2 F3.D4 Bb3.D4.Ab4 B2 G3.F4 D4.F4.G4 C3 G3.Eb4 C4.Eb4.G4 A2 F#3.Eb4 C4.Eb4.F#4', // 23
  'Bb2 F3.Eb4 Bb3.Eb4.Ab4 Bb1 F3.D4 Bb3.D4.Ab4 Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 24
  'Eb2 Ab3.B3.Eb4 B3.Eb4.Ab4 Eb3 Ab3.B3.Eb4 B3.Eb4.Ab4 Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 25
  'Eb2 Ab3.B3.Eb4 B3.Eb4.Ab4 Eb3 Ab3.B3.Eb4 B3.Eb4.Ab4 Eb2 G3.Bb3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 26
  'Eb3 F3.D4 Bb3.Ab4 Eb3 F3.D4 Bb3.Ab4 Eb3 G3.Eb4 Bb3.G4 A2 F3.Eb4 C4.Eb4.F4', // 27
  'Bb2 F3.Eb4 Bb3.Eb4.Ab4 Bb1 F3.D4 Bb3.D4.Ab4 Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 28
  'Ab1 Eb3.Ab3.B3 Ab3.B3.Eb4 B3.Eb4.Ab4 Ab3.B3.Eb4 Eb3.Ab3.B3 Eb2 G3.Eb4 Bb3.Eb4.G4 Eb3 G3.Eb4 Bb3.Eb4.G4', // 29
  'Ab1 Eb3.Ab3.B3 Ab3.B3.Eb4 Eb3.Ab3.B3 Ab3.B3.Eb4 Eb3.Ab3.B3 Eb2 G3.Eb4 Bb3.Eb4.G4 A2 F3.Eb4 B3.Eb4.F4', // 30
  'Bb2 F3.Bb3.Eb4 Bb3.Eb4.Ab4 B2 G3.F4 D4.F4.G4 C3 G3.Eb4 C4.G4 A2 C4.Eb4 C4.Eb4.F4', // 31
];

// The right hand, bar by bar. Trills are written out; grace notes are left out.
const TRILL = 'F5/32 G5/32 F5/32 G5/32 F5/32 G5/32 F5/32 G5/32 F5/32 G5/32 E5/32 F5/32';
const M = {
  a1: 'G5/2 F5/8 G5/8 F5/4. Eb5/4 Bb4/8',
  a2: 'G5/4 C5/8 C6/4 G5/8 Bb5/4. Ab5/4 G5/8',
  a3: 'F5/4. G5/4 D5/8 Eb5/4. C5/4.',
  a4: 'Bb4/8 D6/8 C6/8 Bb5/16 Ab5/16 G5/16 Ab5/16 C5/16 D5/16 Eb5/4. r/4 Bb4/8',
  a5: 'G5/4. F5/16 G5/16 F5/16 E5/16 F5/16 G5/16 F5/8 Eb5/4~ Eb5/16 F5/16 Eb5/16 D5/16 Eb5/16 F5/16',
  a6: 'G5/16 B4/16 C5/16 Db5/16 C5/16 F5/16 E5/16 Ab5/16 G5/16 Db6/16 C6/16 G5/16 Bb5/4. Ab5/4 G5/8',
  a7: `${TRILL} G5/8 G5/8 D5/8 Eb5/4. C5/4.`,
  a8: 'Bb4/8 D6/8 C6/8 Bb5/16 Ab5/16 G5/16 Ab5/16 C5/16 D5/16 Eb5/4.~ Eb5/8 D5/8 Eb5/8',
  b1: 'F5/4. G5/4 F5/8 F5/4. C5/4.',
  b2: 'Eb5/16. Eb5/16. Eb5/16. Eb5/16. Eb5/8 D5/16 Eb5/16 F5/16. Eb5/32 Eb5/4. Bb4/4.',
  b3: 'Bb5/4. A5/4 G5/8 [A4 F5]/4. [Bb4 D5]/4.',
  b4: '[G4 Eb5]/4. [A4 D5]/8 [A4 C5]/8 [A4 D5]/8 [F4 Bb4]/8 [F#4 B4]/8 [E4 B4]/8 [E4 Bb4 C5]/8 [F4 A4 C5]/8 [Ab4 D5]/8',
  a5b: 'G5/4 A4/16 Bb4/16 B4/16 Bb4/16 C#5/16 D5/16 G5/16. F5/32 F5/4 Eb5/8~ Eb5/16 F5/16 Eb5/16 D5/16 Eb5/16 F5/16',
  a8b: 'Bb4/8 D6/8 C#6/8 C6/32 B5/32 Bb5/32 A5/32 Ab5/32 F5/32 D5/32 B4/32 Bb4/32 D5/32 G5/32t F5/32t Eb5/32t Eb5/4.~ Eb5/8 D5/8 Eb5/8',
  a8c: 'Bb4/16 D6/8 C#6/16 C6/16 B5/32 Bb5/16 A5/16 Ab5/32 A4/32 Bb4/32 B4/32 C5/32 C#5/32 D5/32 G5/32t F5/32t Eb5/32t Eb5/2.',
  k1: 'Eb5/4. F5/8 Eb5/8 F5/8 G5/2.',
  k2: 'Eb5/4.~ Eb5/16 F5/16 Eb5/16 F5/16 Eb5/16 F5/16 G5/4 Eb5/8 Eb6/8 D6/8 C6/8',
  k3: 'Bb5/4 A5/8 Ab5/8 C5/8 D5/8 Eb5/8 F5/16 Eb5/16 D5/16 Eb5/16 G6/8 F6/16 Eb6/16 D6/16 C6/16',
  k4: 'B5/8 Bb5/8 A5/8 A5/16 Ab5/16 Ab5/16 G5/16 G5/16. F5/32 Eb5/2.',
  k5: 'Eb5/4.~ Eb5/32. F5/32. Eb5/32. F5/32. Eb5/32. F5/32. Eb5/32. F5/32. G5/4. r/4 r/8',
  k6: 'Eb5/8 Ab4/16 Bb4/16 Ab4/16 G4/16 Ab4/16 B4/16 Eb5/16 Ab5/16 Eb6/16 r/32 F6/32 G6/8 Eb6/8 Eb6/4 D6/8 C6/8',
  k7: '[B5 B6]/8 [Bb5 Bb6]/8 [A5 A6]/8 [Ab5 Ab6]/8 [G5 G6]/8 [D5 D6]/8 [Eb5 Eb6]/8 Eb6/4. [F5 F6]/8 [C6 C7]/8',
  // the cadenza: two held octaves, then the run, written in sixteenths over three bars
  c0: '[B5 B6]/2. [Bb5 Bb6]/2.',
  c1: Array(6).fill('B6/16 Bb6/16 C7/16 A6/16').join(' '),
  c2: Array(6).fill('B6/16 Bb6/16 C7/16 A6/16').join(' '),
  c3: 'B6/16 Bb6/16 C7/16 A6/16 B6/16 Bb6/16 C7/16 B6/16 Bb6/16 A6/16 Ab6/16 G6/16 F6/16 D6/16 Eb6/16 B5/16 Bb5/8 Ab5/8 C5/8 D5/8',
  e1: Array(4).fill('[G4 Eb5]/8 Bb4/8 G5/8').join(' '),
  e2: '[G4 Eb5]/4. [G5 Eb6]/4. [G3 Eb4]/2.',
};
const RH = [
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', // 1-8: the theme, then ornamented
  'b1', 'b2', 'b3', 'b4', // 9-12: the second theme
  'a5b', 'a6', 'a7', 'a8b', // 13-16: the theme
  'b1', 'b2', 'b3', 'b4', // 17-20: the second theme
  'a5b', 'a6', 'a7', 'a8c', // 21-24: the theme
  'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', // 25-31: the coda, building to the climax
  'c0', 'c1', 'c2', 'c3', // 32-35: the cadenza
  'e1', 'e2', // 36-37: the last chords
].map((k) => M[k]);

// Splits the left hand into the cellos' bass notes, the piano's chords, and a pad chord per beat.
const lowBass = (n) => (noteMidi(n) >= 48 ? nm(noteMidi(n) - 12) : n); // keep the bass at B2 or lower
const notes = (ev) => ev.split('.');
const eventText = (ev) => (notes(ev).length > 1 ? `[${notes(ev).join(' ')}]` : ev);
function splitBar(bar) {
  const evs = bar.split(' ');
  const cellos = [];
  const harp = [];
  const pad = [];
  for (let beat = 0; beat < 4; beat++) {
    const group = evs.slice(beat * 3, beat * 3 + 3);
    const [first, ...rest] = group;
    if (notes(first).length === 1) {
      cellos.push(`${lowBass(first)}/4.`);
      harp.push('r/8', ...rest.map((e) => `${eventText(e)}/8`));
    } else {
      cellos.push('r/4.');
      harp.push(...group.map((e) => `${eventText(e)}/8`));
    }
    const held = group[2];
    pad.push(notes(held).length > 1 ? `${eventText(held)}/4.` : 'r/4.');
  }
  return { cellos: cellos.join(' '), harp: harp.join(' '), pad: pad.join(' ') };
}
const left = LH.map(splitBar);
const lh = (part, from, to) => left.slice(from - 1, to).map((bar) => bar[part]);

// Velocity per bar range: [first bar, last bar, velocity].
function shaped(bars, ranges) {
  return bars.map((bar, i) => {
    const n = i + 1;
    const range = ranges.find(([a, b]) => n >= a && n <= b);
    return bar === R || !range ? bar : `v=${range[2]} ${bar}`;
  });
}

const violins = shaped(RH, [
  [1, 3, 84], [4, 4, 96], [5, 5, 82], [6, 6, 90], [7, 7, 84], [8, 8, 96],
  [9, 10, 78], [11, 12, 98], [13, 15, 86], [16, 16, 100], [17, 18, 80], [19, 20, 100],
  [21, 23, 88], [24, 24, 100], [25, 25, 80], [26, 27, 72], [28, 29, 80], [30, 30, 104], [31, 31, 112],
  [32, 32, 116], [33, 34, 96], [35, 35, 84], [36, 36, 64], [37, 37, 56],
]);
const cellosBars = [
  ...lh('cellos', 1, 31),
  'Bb1/1.', R, R, R,
  'Eb2/4. Eb2/4. Eb2/4. Eb2/4.',
  'Eb2/4. r/4. Eb1/2.',
];
const harpBars = [
  ...lh('harp', 1, 31),
  'Bb2/8 F3/8 Ab3/8 D4/8 Bb3/8 F4/8 Ab4/8 D5/8~ D5/2', R, R, R,
  Array(4).fill('r/8 Bb3/8 Bb2/8').join(' '),
  '[Eb3 Bb3]/4. [Eb4 Bb4]/4. [Eb2 Bb2]/2.',
];
const padBars = [
  ...repeatBar(R, 4),
  ...lh('pad', 5, 31),
  R, '[Bb2 F3 Ab3 D4]/1.', '[Bb2 F3 Ab3 D4]/1.', '[Bb2 F3 Ab3 D4]/1.',
  '[Eb3 G3 Bb3]/1.', '[Eb3 G3 Bb3]/1.',
];
const cellos = shaped(cellosBars, [[1, 8, 96], [9, 24, 100], [25, 29, 94], [30, 32, 112], [36, 37, 90]]);
const harp = shaped(harpBars, [[1, 8, 60], [9, 24, 64], [25, 29, 58], [30, 32, 76], [36, 37, 50]]);
const pad = shaped(padBars, [[5, 24, 64], [25, 29, 61], [30, 31, 93], [33, 35, 67], [36, 37, 54]]);
// Soft timpani only at the climaxes, so the Techno remix gets a beat there too.
const drumBars = repeatBar(R, 37);
drumBars[15] = 'k/4. r/4. r/4. r/4.';
drumBars[23] = 'k/4. r/4. r/4. r/4.';
drumBars[29] = 'k/4. r/4. k/4. r/4.';
drumBars[30] = 'k/4. r/4. k/4. k/4.';
drumBars[31] = '[k cr]/2. k/2.';
const drums = shaped(drumBars, [[1, 37, 66]]);

const SECTIONS = new Map([
  [1, 'The theme'], [5, 'The theme, ornamented'], [9, 'The second theme'], [13, 'The theme'],
  [17, 'The second theme'], [21, 'The theme'], [25, 'Coda'], [30, 'The climax'], [32, 'Cadenza'],
  [36, 'The last chords'],
]);
const block = (pickup, bars) => writeBlock(bars, barMarks(SECTIONS), { first: pickup });

const text = `# Nocturne in E-flat, Op. 9 No. 2 by Frédéric Chopin (1832), arranged by Claude and SZ for the
# Orchestral style. Chopin's notes bar for bar: violins on the right hand, cellos and piano on the left.
title: Nocturne in E-flat
composer: Frédéric Chopin
arranger: Claude & SZ
about: Chopin wrote his three Op. 9 nocturnes around 1830 to 1831 and published them in 1832, dedicated to the pianist Marie Pleyel. The second, in E-flat, became his most famous: a singing melody over a rocking left hand, ornamented a little more each time it comes back.
year: 1832
source: public-domain
category: classics
key: Eb major
style: orchestral
tempo: 54
time: 12/8
pickup: /8

@bar 32 tempo=38
@bars 33-35 tempo=136..92
@bars 36-37 tempo=48..34

track violins role=lead vol=0.9
${block('v=80 Bb4/8', violins)}

track piano role=chords inst=bank:grand-piano vol=0.6 pan=-0.2
${block('r/8', harp)}

track strings role=pad vol=1
${block('r/8', pad)}

track cellos role=bass vol=0.3
${block('r/8', cellos)}

track drums role=drums vol=0.6
${block('r/8', drums)}
`;
saveSong(out, 'nocturne.song', text);
console.log(`wrote ${out}/nocturne.song (${RH.length} bars and a pickup)`);
