// Greensleeves (traditional English, 16th century), arranged for the Orchestral style from the
// four-part hymn setting in the Mutopia Project (soprano, alto, tenor, bass). Four verses: the flute
// alone over harp and cellos, the violins over the strings, everyone with the harp rolling the
// chords, then the flute again, slowing to the last chord.
//   node tools/arranger/greensleeves.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

// Bar 0 is the pickup; bars 1-16 are the verse. The last bar holds the final chord.
const V = {
 "Soprano": [
  "E4/8",
  "G4/4 A4/8 B4/8. C5/16 B4/8",
  "A4/4 F#4/8 D4/8. E4/16 F#4/8",
  "G4/4 E4/8 E4/8. Eb4/16 E4/8",
  "F#4/4. B3/4 E4/8",
  "G4/4 A4/8 B4/8. C5/16 B4/8",
  "A4/4 F#4/8 D4/8. E4/16 F#4/8",
  "G4/8. F#4/16 E4/8 Eb4/8. C#4/16 Eb4/8",
  "E4/4. E4/4 r/8",
  "D5/4. D5/8. C#5/16 B4/8",
  "A4/4 F#4/8 D4/8. E4/16 F#4/8",
  "G4/4 E4/8 E4/8. Eb4/16 E4/8",
  "F#4/4 Eb4/8 B3/4 r/8",
  "D5/4. D5/8. C5/16 B4/8",
  "A4/4 F#4/8 D4/8. E4/16 F#4/8",
  "G4/8. F#4/16 E4/8 Eb4/8. C#4/16 Eb4/8",
  "E4/4. E4/4 r/8"
 ],
 "Alto": [
  "B3/8",
  "E4/4 D4/8 D4/8. C5/16 G4/8",
  "F#4/4 D4/8 D4/8. E4/16 C4/8",
  "B3/4 B3/8 A3/8. Eb4/16 E4/8",
  "Eb4/4. B3/4 B3/8",
  "E4/4 D4/8 D4/8. C5/16 G4/8",
  "F#4/4 D4/8 D4/8. E4/16 C4/8",
  "B3/8. F#4/16 C4/8 B3/8. C#4/16 B3/8",
  "B3/4. B3/4 r/8",
  "F#4/4. B4/8. A4/16 G4/8",
  "F#4/4 D4/8 D4/8. E4/16 C4/8",
  "B3/4 B3/8 A3/8. Eb4/16 E4/8",
  "Eb4/4 B3/8 B3/4 r/8",
  "F#4/4. B4/8. A4/16 G4/8",
  "F#4/4 D4/8 D4/4 C4/8",
  "B3/8. F#4/16 C4/8 B3/8. C#4/16 B3/8",
  "B3/4. B3/4 r/8"
 ],
 "Tenor": [
  "G3/8",
  "B3/4 A3/8 G3/4 B3/8",
  "D4/8 D4/8 A3/8 F#3/4 A3/8",
  "G3/4 G3/8 A3/4 E3/8",
  "B3/4. B3/4 G3/8",
  "B3/4 A3/8 G3/4 B3/8",
  "D4/4 A3/8 F#3/4 A3/8",
  "G3/4 A3/8 F#3/4 F#3/8",
  "G3/4. G3/4 r/8",
  "B3/4. D4/4 D4/8",
  "D4/4 A3/8 F#3/4 A3/8",
  "G3/4 G3/8 A3/4 E3/8",
  "B3/4 F#3/8 B3/4 r/8",
  "B3/4. D4/4 D4/8",
  "D4/4 A3/8 F#3/4 A3/8",
  "G3/4 A3/8 F#3/4 F#3/8",
  "G3/4. G3/4 r/8"
 ],
 "Bass": [
  "E3/8",
  "E3/4 F#3/8 G3/4 G3/8",
  "D3/4 D3/8 D3/4 Eb3/8",
  "E3/4 E3/8 C3/4 C3/8",
  "B2/4. B2/4 E3/8",
  "E3/4 F#3/8 G3/4 G3/8",
  "D3/8 D3/8 D3/8 D3/4 F#3/8",
  "E3/4 A2/8 B2/4 B2/8",
  "E3/4. E3/4 r/8",
  "B3/4. G3/4 G3/8",
  "D3/4 D3/8 D3/4 Eb3/8",
  "E3/4 E3/8 C3/4 C3/8",
  "B2/4 B2/8 B2/4 r/8",
  "B3/4. G3/4 G3/8",
  "D3/8 D3/8 D3/8 D3/4 Eb3/8",
  "E3/4 A2/8 B2/4 B2/8",
  "E3/4. E3/4 r/8"
 ]
};

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const midi = (n) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  return (Number(m[3]) + 1) * 12 + LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const nm = (n) => `${SHARP[n % 12]}${Math.floor(n / 12) - 1}`;
const shift = (bar, by) => (bar === 'R' ? bar : bar.replace(/\b[A-G](#|b)?\d\b/g, (n) => nm(midi(n) + by)));
const R = 'R';
const ends = (bar) => bar.replace(/ r\/8$/, '').replace(/\/4\. ([A-G][#b]?\d)\/4$/, '/4. $1/4.'); // last bar: hold the final chord

// The verse with its final bar, and the pickup into the next verse taken from the last 8th.
const verse = (voice, by, last) => {
  const bars = V[voice].slice(1).map((b) => shift(b, by));
  if (last) bars[15] = shift(V[voice][16].replace(/ [A-G][#b]?\d\/4 r\/8$/, '').replace(/\/4\.$/, '/2.'), by);
  return bars;
};
// The harp rolls the chord on each dotted-quarter beat: tenor, alto, soprano as three eighths.
function harpBars(by) {
  const at = (voice, bar, pos) => {
    let t = 0;
    for (const tok of V[voice][bar].split(' ')) {
      const [p, d] = tok.split('/');
      const len = { '4.': 1440, '4': 960, '8.': 720, '8': 480, '16': 240 }[d];
      if (pos < t + len) return p === 'r' ? null : p;
      t += len;
    }
    return null;
  };
  const bars = [];
  for (let bar = 1; bar <= 16; bar++) {
    const beats = [0, 1440].map((pos) => {
      const ns = ['Tenor', 'Alto', 'Soprano'].map((v) => at(v, bar, pos));
      return ns.every(Boolean) ? ns.map((n) => `${nm(midi(n) + by)}/8`).join(' ') : 'r/4.';
    });
    bars.push(beats.join(' '));
  }
  return bars;
}
// The pad holds alto and tenor, one chord per bar half.
const padBars = () => harpBars(0).map((bar) => bar.split(' ').length === 6
  ? (() => { const t = bar.split(' '); return `[${t[0].split('/')[0]} ${t[1].split('/')[0]}]/4. [${t[3].split('/')[0]} ${t[4].split('/')[0]}]/4.`; })()
  : bar);

const parts = { flute: [], violins: [], harp: [], strings: [], cellos: [], timpani: [] };
const marks = [];
const v = (vel, bars) => bars.map((b, i) => (b === R ? R : i === 0 ? `v=${vel} ${b}` : b));
function section(name, n, p) {
  marks.push([parts.flute.length, name]);
  for (const key of Object.keys(parts)) for (let i = 0; i < n; i++) parts[key].push(p[key]?.[i] ?? R);
}

section('Verse 1: the flute over harp and cellos', 16, {
  flute: v(70, verse('Soprano', 12)),
  harp: v(56, harpBars(0)),
  cellos: v(84, verse('Bass', -12)),
});
section('Verse 2: the violins over the strings', 16, {
  violins: v(80, verse('Soprano', 12)),
  flute: v(52, verse('Alto', 12)),
  strings: v(46, padBars()),
  cellos: v(90, verse('Bass', -12)),
});
section('Verse 3: everyone', 16, {
  violins: v(92, verse('Soprano', 12)),
  flute: v(64, verse('Alto', 12)),
  harp: v(66, harpBars(0)),
  strings: v(58, padBars()),
  cellos: v(100, verse('Bass', -12)),
  timpani: v(60, Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 'k/4. r/4.' : R))),
});
section('Verse 4: the flute again, slowing to the end', 16, {
  flute: v(80, verse('Soprano', 12, true)),
  harp: v(60, [...harpBars(0).slice(0, 15), '[E3 G3 B3 E4]/2.']),
  strings: v(38, [...padBars().slice(0, 15), '[G3 B3]/2.']),
  cellos: v(80, verse('Bass', -12, true)),
});

const total = parts.flute.length;
const pickup = (voice, by) => shift(V[voice][0], by);
const block = (key, pick) => {
  const lines = [`| ${pick} |`];
  const at = new Map(marks);
  let row = [];
  const flush = () => { if (row.length) lines.push(`| ${row.join(' | ')} |`); row = []; };
  parts[key].forEach((bar, i) => {
    if (at.has(i)) { flush(); lines.push(`# ${at.get(i)}`); }
    row.push(bar);
    if (row.length === 4) flush();
  });
  flush();
  return lines.join('\n');
};

const text = `# Greensleeves, arranged by Claude and SZ for the Orchestral style from a four-part setting of the
# traditional tune: four verses, passing the melody between flute and violins.
title: Greensleeves
composer: Traditional (English)
arranger: Claude & SZ
about: An English ballad from the 1500s. Legend says Henry VIII wrote it for Anne Boleyn, but its style points to a later, unknown composer. The same tune carries the carol What Child Is This?
year: traditional
source: public-domain
category: classics
key: E minor
style: orchestral
tempo: 72
time: 6/8
pickup: /8

@bars ${total - 3}-${total} tempo=72..50

track flute role=counter vol=0.75 pan=0.2
${block('flute', `v=70 ${pickup('Soprano', 12)}`)}

track violins role=lead vol=0.9
${block('violins', 'r/8')}

track harp role=chords vol=0.7 pan=-0.2
${block('harp', 'r/8')}

track strings role=pad vol=0.86
${block('strings', 'r/8')}

track cellos role=bass vol=0.13
${block('cellos', `v=84 ${pickup('Bass', -12)}`)}

track timpani role=drums vol=0.5
${block('timpani', 'r/8')}
`;
writeFileSync(join(out, 'greensleeves.song'), text);
console.log(`wrote ${out}/greensleeves.song (${total} bars and a pickup)`);
