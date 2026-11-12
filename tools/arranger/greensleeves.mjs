// Greensleeves (traditional English, 16th century), arranged for the Orchestral style from the
// four-part hymn setting in the Mutopia Project (soprano, alto, tenor, bass). Four verses: the flute
// alone over harp and cellos, the violins over the strings, everyone with the harp rolling the
// chords, then the flute again, slowing to the last chord.
//   node tools/arranger/greensleeves.mjs [outDir]
import {
  entryVelocity, MIXED, noteMidi, noteName, outDir, R, saveSong, sectionBuilder, transpose,
} from './lib.mjs';

const out = outDir();

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

const nm = (n) => noteName(n, MIXED);
const ends = (bar) => bar.replace(/ r\/8$/, '').replace(/\/4\. ([A-G][#b]?\d)\/4$/, '/4. $1/4.'); // last bar: hold the final chord

// The verse with its final bar, and the pickup into the next verse taken from the last 8th.
const verse = (voice, by, last) => {
  const bars = V[voice].slice(1).map((b) => transpose(b, by, nm));
  if (last) bars[15] = transpose(V[voice][16].replace(/ [A-G][#b]?\d\/4 r\/8$/, '').replace(/\/4\.$/, '/2.'), by);
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
      return ns.every(Boolean) ? ns.map((n) => `${nm(noteMidi(n) + by)}/8`).join(' ') : 'r/4.';
    });
    bars.push(beats.join(' '));
  }
  return bars;
}
// The pad holds alto and tenor, one chord per bar half.
const padBars = () => harpBars(0).map((bar) => bar.split(' ').length === 6
  ? (() => { const t = bar.split(' '); return `[${t[0].split('/')[0]} ${t[1].split('/')[0]}]/4. [${t[3].split('/')[0]} ${t[4].split('/')[0]}]/4.`; })()
  : bar);

const keys = ['flute', 'violins', 'harp', 'strings', 'cellos', 'timpani'];
const { tracks, section, block } = sectionBuilder(keys);

section('Verse 1: the flute over harp and cellos', 16, {
  flute: entryVelocity(70, verse('Soprano', 12), { afterRests: false }),
  harp: entryVelocity(56, harpBars(0), { afterRests: false }),
  cellos: entryVelocity(84, verse('Bass', 0), { afterRests: false }),
});
section('Verse 2: the violins over the strings', 16, {
  violins: entryVelocity(80, verse('Soprano', 12), { afterRests: false }),
  flute: entryVelocity(52, verse('Alto', 12), { afterRests: false }),
  strings: entryVelocity(46, padBars(), { afterRests: false }),
  cellos: entryVelocity(90, verse('Bass', 0), { afterRests: false }),
});
section('Verse 3: everyone', 16, {
  violins: entryVelocity(92, verse('Soprano', 12), { afterRests: false }),
  flute: entryVelocity(64, verse('Alto', 12), { afterRests: false }),
  harp: entryVelocity(66, harpBars(0), { afterRests: false }),
  strings: entryVelocity(58, padBars(), { afterRests: false }),
  cellos: entryVelocity(100, verse('Bass', 0), { afterRests: false }),
  timpani: entryVelocity(60, Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 'k/4. r/4.' : R)), { afterRests: false }),
});
section('Verse 4: the flute again, slowing to the end', 16, {
  flute: entryVelocity(80, verse('Soprano', 12, true), { afterRests: false }),
  harp: entryVelocity(60, [...harpBars(0).slice(0, 15), '[E3 G3 B3 E4]/2.'], { afterRests: false }),
  strings: entryVelocity(38, [...padBars().slice(0, 15), '[G3 B3]/2.'], { afterRests: false }),
  cellos: entryVelocity(80, verse('Bass', 0, true), { afterRests: false }),
});

const total = tracks.flute.length;
const pickup = (voice, by) => transpose(V[voice][0], by, nm);

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

track flute role=counter vol=0.6 pan=0.2
${block('flute', { first: `v=70 ${pickup('Soprano', 12)}` })}

track violins role=lead vol=0.9
${block('violins', { first: 'r/8' })}

track harp role=chords vol=0.7 pan=-0.2
${block('harp', { first: 'r/8' })}

track strings role=pad vol=0.86
${block('strings', { first: 'r/8' })}

track cellos role=bass vol=0.1
${block('cellos', { first: `v=84 ${pickup('Bass', 0)}` })}

track timpani role=drums vol=0.5
${block('timpani', { first: 'r/8' })}
`;
saveSong(out, 'greensleeves.song', text);
console.log(`wrote ${out}/greensleeves.song (${total} bars and a pickup)`);
