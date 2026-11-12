// Swan Lake: the Scène from Act II (Tchaikovsky, 1876), arranged for the Orchestral style. The
// melody follows Tchaikovsky's oboe line bar for bar (read from the oboe part of an IMSLP oboe and
// piano edition of the suite): the oboe's theme over harp and strings, the build, the theme again for
// full orchestra, the falling triplet lament, and a last fortissimo statement of the theme.
//   node tools/arranger/swan-lake.mjs [outDir]
import {
  eachChord, entryVelocity, noteName, outDir, R, saveSong, sectionBuilder, SHARPS, transpose,
} from './lib.mjs';

const out = outDir();

const nm = (n) => noteName(n, SHARPS);

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

const T = {
  // strings hold the chord (Tchaikovsky's tremolo, smoothed)
  pad: (c, ticks) => `[${c.iv.slice(0, 3).map((i) => nm(52 + ((c.pc + i - 4 + 12) % 12))).join(' ')}]${ticks === 1920 ? '/2' : '/1'}`,
  // the harp rolls up through the chord in eighths
  harp: (c, ticks) => {
    const base = 36 + c.pc; // C2 .. B2
    const tones = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => base + c.iv[k % 3] + 12 * Math.floor(k / 3));
    return tones.slice(0, ticks === 1920 ? 4 : 8).map((n) => `${nm(n)}/8`).join(' ');
  },
  // cellos and basses on the root, low: twice a bar
  bass: (c, ticks) => {
    const r = 35 + ((c.pc - 11 + 12) % 12); // B1 .. A#2
    return ticks === 1920 ? `${nm(r)}/2` : `${nm(r)}/2 ${nm(r)}/2`;
  },
};

const keys = ['oboe', 'violins', 'brass', 'harp', 'strings', 'basses', 'timpani'];
const { tracks, section, block } = sectionBuilder(keys);
const mel = (bars, by = 0) => bars.map((b) => transpose(M[b], by, nm));
const roll = (n) => Array.from({ length: n }, () => Array(16).fill('k/16').join(' '));

section('Strings and harp set the lake', 1, {
  harp: entryVelocity(52, eachChord(['intro'].map((b) => H[b]), T.harp), { afterRests: false }),
  strings: entryVelocity(44, eachChord(['intro'].map((b) => H[b]), T.pad), { afterRests: false }),
  basses: entryVelocity(80, eachChord(['intro'].map((b) => H[b]), T.bass), { afterRests: false }),
});
section('The oboe sings the swan theme', THEME.length, {
  oboe: entryVelocity(84, mel(THEME), { afterRests: false }),
  harp: entryVelocity(56, eachChord(THEME.map((b) => H[b]), T.harp), { afterRests: false }),
  strings: entryVelocity(46, eachChord(THEME.map((b) => H[b]), T.pad), { afterRests: false }),
  basses: entryVelocity(88, eachChord(THEME.map((b) => H[b]), T.bass), { afterRests: false }),
});
section('The theme climbs', BUILD.length, {
  oboe: entryVelocity(92, mel(BUILD), { afterRests: false }),
  harp: entryVelocity(62, eachChord(BUILD.map((b) => H[b]), T.harp), { afterRests: false }),
  strings: entryVelocity(56, eachChord(BUILD.map((b) => H[b]), T.pad), { afterRests: false }),
  basses: entryVelocity(96, eachChord(BUILD.map((b) => H[b]), T.bass), { afterRests: false }),
  timpani: [...Array(7).fill(R), ...entryVelocity(66, roll(2), { afterRests: false })],
});
section('Full orchestra: the theme fortissimo', THEME_B.length, {
  violins: entryVelocity(108, mel(THEME_B, 12), { afterRests: false }),
  brass: entryVelocity(84, mel(THEME_B), { afterRests: false }),
  harp: entryVelocity(70, eachChord(THEME_B.map((b) => H[b]), T.harp), { afterRests: false }),
  strings: entryVelocity(70, eachChord(THEME_B.map((b) => H[b]), T.pad), { afterRests: false }),
  basses: entryVelocity(110, eachChord(THEME_B.map((b) => H[b]), T.bass), { afterRests: false }),
  timpani: entryVelocity(76, ['[k cr]/2 k/2', R, R, 'k/2 k/2', '[k cr]/2 k/2', R, R, 'k/2 k/2'], { afterRests: false }),
});
section('It climbs again', BUILD_B.length, {
  violins: entryVelocity(104, mel(BUILD_B), { afterRests: false }),
  oboe: entryVelocity(80, mel(BUILD_B, -12), { afterRests: false }),
  harp: entryVelocity(66, eachChord(BUILD_B.map((b) => H[b]), T.harp), { afterRests: false }),
  strings: entryVelocity(64, eachChord(BUILD_B.map((b) => H[b]), T.pad), { afterRests: false }),
  basses: entryVelocity(104, eachChord(BUILD_B.map((b) => H[b]), T.bass), { afterRests: false }),
});
section('The lament falls away', LAMENT.length, {
  oboe: entryVelocity(90, mel(LAMENT), { afterRests: false }),
  violins: entryVelocity(84, mel(LAMENT, 12), { afterRests: false }),
  strings: entryVelocity(60, eachChord(LAMENT.map((b) => H[b]), T.pad), { afterRests: false }),
  basses: entryVelocity(100, eachChord(LAMENT.map((b) => H[b]), T.bass), { afterRests: false }),
  timpani: [R, R, ...entryVelocity(70, roll(2), { afterRests: false })],
});
section('The swan theme, one last time', [...THEME_B.slice(0, 7), 'end'].length, {
  violins: entryVelocity(116, mel([...THEME_B.slice(0, 7), 'end'], 12), { afterRests: false }),
  brass: entryVelocity(96, mel([...THEME_B.slice(0, 7), 'end']), { afterRests: false }),
  oboe: entryVelocity(90, mel([...THEME_B.slice(0, 7), 'end']), { afterRests: false }),
  harp: entryVelocity(76, eachChord([...THEME_B.slice(0, 7), 'end'].map((b) => H[b]), T.harp), { afterRests: false }),
  strings: entryVelocity(76, eachChord([...THEME_B.slice(0, 7), 'end'].map((b) => H[b]), T.pad), { afterRests: false }),
  basses: entryVelocity(116, eachChord([...THEME_B.slice(0, 7), 'end'].map((b) => H[b]), T.bass), { afterRests: false }),
  timpani: entryVelocity(88, ['[k cr]/2 k/2', R, R, 'k/2 k/2', '[k cr]/2 k/2', R, ...roll(1), '[k cr]/1'], { afterRests: false }),
});

const total = tracks.oboe.length;
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
saveSong(out, 'swan-lake.song', text);
console.log(`wrote ${out}/swan-lake.song (${total} bars)`);
