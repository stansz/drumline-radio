// Swan Lake: the Scène from Act II (Tchaikovsky, 1876), arranged for the Orchestral style. The
// melody follows Tchaikovsky's oboe line bar for bar (read from the oboe part of an IMSLP oboe and
// piano edition of the suite): the oboe's theme over harp and strings, the build, the theme again for
// full orchestra, the falling triplet lament, and a last fortissimo statement of the theme.
//   node tools/arranger/swan-lake.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { noteName, SHARPS, writeBlock } from './lib.mjs';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10] };
const nm = (n) => noteName(n, SHARPS);
const chord = (sym) => {
  const m = /^([A-G]#?)(m|7)?$/.exec(sym);
  return { pc: PC[m[1]], iv: QUALITY[m[2] ?? ''] };
};

// The oboe's melody, bar by bar.
const M = {
  intro: 'r/1',
  a1: 'F#5/2 B4/8 C#5/8 D5/8 E5/8',
  a2: 'F#5/4. D5/8 F#5/4. D5/8',
  a3: 'F#5/4. B4/8 D5/8 B4/8 G4/8 D5/8',
  a4: 'B4/2 B4/8 C#5/8 D5/8 E5/8',
  a4b: 'B4/2 B4/8 E5/8 D5/8 C#5/8',
  a8: 'B4/2. B4/4',
  b1: 'C#5/4 D5/4 E5/4 F#5/8 G5/8',
  b2: 'A5/4. G5/8 F#5/4 G5/8 A5/8',
  b3: 'B5/4. A5/8 G5/4 A5/8 B5/8',
  b4: 'C#6/4. B5/8 F#5/8 D5/8 C#5/8 B4/8',
  b8: 'C6/4. G5/8 E5/4 G5/8 A5/8',
  b9: 'C#6/4. A#5/8 C#6/4. A#5/8',
  t1: 'C6/4t G5/4t C6/4t B5/2t B5/4t',
  t2: 'A#5/4t F#5/4t A#5/4t B5/2t B4/4t',
  t3: 'C5/4t G4/4t C5/4t B4/2t B4/4t',
  t4: 'A#4/4t F#4/4t A#4/4t B4/2t B4/4t',
  end: 'B4/1',
};
// The harmony under each bar.
const H = {
  intro: 'Bm', a1: 'Bm', a2: 'Bm', a3: 'Bm G', a4: 'Bm', a4b: 'Bm', a8: 'Bm',
  b1: 'A7', b2: 'D', b3: 'G', b4: 'F#7', b8: 'C', b9: 'F#7',
  t1: 'C Em', t2: 'F#7 Bm', t3: 'C Em', t4: 'F#7 Bm', end: 'Bm',
};
const THEME = ['a1', 'a2', 'a3', 'a4', 'a1', 'a2', 'a3', 'a8'];
const THEME_B = ['a1', 'a2', 'a3', 'a4b', 'a1', 'a2', 'a3', 'a8'];
const BUILD = ['b1', 'b2', 'b3', 'b4', 'b1', 'b2', 'b3', 'b8', 'b9'];
const BUILD_B = ['b1', 'b2', 'b3', 'b4', 'b1', 'b2', 'b3'];
const LAMENT = ['t1', 't2', 't3', 't4'];

const spans = (bar) => H[bar].split(' ').map((s) => ({ c: chord(s), half: H[bar].split(' ').length === 2 }));
const each = (bars, fn) => bars.map((bar) => spans(bar).map(({ c, half }) => fn(c, half)).join(' '));
const T = {
  // strings hold the chord (Tchaikovsky's tremolo, smoothed)
  pad: (c, half) => `[${c.iv.slice(0, 3).map((i) => nm(52 + ((c.pc + i - 4 + 12) % 12))).join(' ')}]${half ? '/2' : '/1'}`,
  // the harp rolls up through the chord in eighths
  harp: (c, half) => {
    const base = 36 + c.pc; // C2 .. B2
    const tones = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => base + c.iv[k % 3] + 12 * Math.floor(k / 3));
    return tones.slice(0, half ? 4 : 8).map((n) => `${nm(n)}/8`).join(' ');
  },
  // cellos and basses on the root, low: twice a bar
  bass: (c, half) => {
    const r = 35 + ((c.pc - 11 + 12) % 12); // B1 .. A#2
    return half ? `${nm(r)}/2` : `${nm(r)}/2 ${nm(r)}/2`;
  },
};

const keys = ['oboe', 'violins', 'brass', 'harp', 'strings', 'basses', 'timpani'];
const tracks = Object.fromEntries(keys.map((k) => [k, []]));
const marks = [];
const R = 'R';
const v = (vel, bars) => bars.map((b, i) => (b === R ? R : i === 0 ? `v=${vel} ${b}` : b));
const up = (bar, by) => bar.replace(/\b([A-G]#?)(\d)\b/g, (_, n, o) => nm((Number(o) + 1) * 12 + PC[n] + by));
function section(name, bars, parts) {
  marks.push([tracks.oboe.length, name]);
  for (const key of keys) {
    const list = parts[key] ?? [];
    for (let i = 0; i < bars.length; i++) tracks[key].push(list[i] ?? R);
  }
}
const mel = (bars, by = 0) => bars.map((b) => up(M[b], by));
const roll = (n) => Array.from({ length: n }, () => Array(16).fill('k/16').join(' '));

section('Strings and harp set the lake', ['intro'], {
  harp: v(52, each(['intro'], T.harp)),
  strings: v(44, each(['intro'], T.pad)),
  basses: v(80, each(['intro'], T.bass)),
});
section('The oboe sings the swan theme', THEME, {
  oboe: v(84, mel(THEME)),
  harp: v(56, each(THEME, T.harp)),
  strings: v(46, each(THEME, T.pad)),
  basses: v(88, each(THEME, T.bass)),
});
section('The theme climbs', BUILD, {
  oboe: v(92, mel(BUILD)),
  harp: v(62, each(BUILD, T.harp)),
  strings: v(56, each(BUILD, T.pad)),
  basses: v(96, each(BUILD, T.bass)),
  timpani: [...Array(7).fill(R), ...v(66, roll(2))],
});
section('Full orchestra: the theme fortissimo', THEME_B, {
  violins: v(108, mel(THEME_B, 12)),
  brass: v(84, mel(THEME_B)),
  harp: v(70, each(THEME_B, T.harp)),
  strings: v(70, each(THEME_B, T.pad)),
  basses: v(110, each(THEME_B, T.bass)),
  timpani: v(76, ['[k cr]/2 k/2', R, R, 'k/2 k/2', '[k cr]/2 k/2', R, R, 'k/2 k/2']),
});
section('It climbs again', BUILD_B, {
  violins: v(104, mel(BUILD_B)),
  oboe: v(80, mel(BUILD_B, -12)),
  harp: v(66, each(BUILD_B, T.harp)),
  strings: v(64, each(BUILD_B, T.pad)),
  basses: v(104, each(BUILD_B, T.bass)),
});
section('The lament falls away', LAMENT, {
  oboe: v(90, mel(LAMENT)),
  violins: v(84, mel(LAMENT, 12)),
  strings: v(60, each(LAMENT, T.pad)),
  basses: v(100, each(LAMENT, T.bass)),
  timpani: [R, R, ...v(70, roll(2))],
});
section('The swan theme, one last time', [...THEME_B.slice(0, 7), 'end'], {
  violins: v(116, mel([...THEME_B.slice(0, 7), 'end'], 12)),
  brass: v(96, mel([...THEME_B.slice(0, 7), 'end'])),
  oboe: v(90, mel([...THEME_B.slice(0, 7), 'end'])),
  harp: v(76, each([...THEME_B.slice(0, 7), 'end'], T.harp)),
  strings: v(76, each([...THEME_B.slice(0, 7), 'end'], T.pad)),
  basses: v(116, each([...THEME_B.slice(0, 7), 'end'], T.bass)),
  timpani: v(88, ['[k cr]/2 k/2', R, R, 'k/2 k/2', '[k cr]/2 k/2', R, ...roll(1), '[k cr]/1']),
});

const total = tracks.oboe.length;
const block = (key) => writeBlock(tracks[key], marks);

const text = `# Swan Lake, arranged by Claude and SZ for the Orchestral style: the Scène from Act II, with the
# oboe's swan theme bar for bar, the theme for full orchestra, the lament, and a last fortissimo.
title: Swan Lake
composer: Pyotr Ilyich Tchaikovsky
arranger: Claude & SZ
about: Tchaikovsky's first ballet, about a princess cursed to be a swan by day. Its 1877 premiere at the Bolshoi was not a success, and it only became famous after a new staging in 1895, two years after he died. This is the swan theme.
year: 1876
source: public-domain
category: classics
key: B minor
style: orchestral
tempo: 72
time: 4/4

@bars ${total - 2}-${total} tempo=72..50

track oboe role=counter vol=0.8 pan=0.15
${block('oboe')}

track violins role=lead vol=0.7
${block('violins')}

track brass role=lead2 vol=0.5 pan=-0.2
${block('brass')}

track harp role=chords vol=0.6 pan=-0.3
${block('harp')}

track strings role=pad vol=0.5
${block('strings')}

track basses role=bass vol=0.7
${block('basses')}

track timpani role=drums vol=0.6
${block('timpani')}
`;
writeFileSync(join(out, 'swan-lake.song'), text);
console.log(`wrote ${out}/swan-lake.song (${total} bars)`);
