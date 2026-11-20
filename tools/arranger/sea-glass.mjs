// Sea Glass, an original ambient piece by DeepSeek Flash & SZ for the Ambient style: 72 BPM in
// 6/8 in E-flat Lydian, 160 bars, 6:40. A slow, rocking piano figure over a choir pad and a low
// string bed, with glass bells and a soft rim pulse. The mood is calm and awake rather than a
// lullaby: the 6/8 pulse keeps a gentle clock, the piano keeps coming back, and the middle opens
// up before the theme returns. The harmony is one chord every four bars, mostly Ebmaj9, F9, Gm9 and
// Cm9, with Bb6 for the turn and Dm7 in the open middle.
//
// Built by its own script, tools/arranger/sea-glass.mjs, from tools/arranger/lib.mjs. Every
// musical choice is here: the chord table, the pad and bass voicings, the three themes, the bell
// ripples, the rim pulse, the velocities and the microtiming. The song file is generated from it
// and is never edited by hand.
//   node tools/arranger/sea-glass.mjs [outDir]
import {
  clampVelocity, FLATS, formHeader, noteName, noteText, offsetText, outDir, R, saveSong,
  sectionBuilder, times, transpose,
} from './lib.mjs';

const out = outDir();
const nm = (m) => noteName(m, FLATS);
const cap = (v) => clampVelocity(v, 118);
const bars = (from, count, fn) => times(count, (i) => fn(from + i, i));
const N = (name, dur, vel, off = 0) => noteText(name, dur, vel, off);

// --------------------------------------------------------------------------------------- harmony
// One entry for every chord symbol the song uses. `pad` is the choir's open voicing (root, fifth,
// octave, no third, so the piano keeps the colour tones). `strings` is the warm string pad's mid
// voicing. `bass` and `fifth` are the low string roots and answers. `bells` are the three high
// chord tones the glockenspiel ripples through.
const CHORD = {
  // Eb Lydian: Eb F G A Bb C D. The raised fourth, A, arrives through F9 and Dm7.
  Ebmaj9: {
    pad: [51, 58, 63], strings: [63, 67, 70], bass: 39, fifth: 46,
    bells: [70, 75, 79],
  },
  F9: {
    pad: [53, 60, 65], strings: [65, 69, 72], bass: 41, fifth: 48,
    bells: [72, 77, 81],
  },
  Gm9: {
    pad: [55, 62, 67], strings: [67, 70, 74], bass: 43, fifth: 50,
    bells: [74, 79, 82],
  },
  Cm9: {
    pad: [48, 55, 60], strings: [60, 63, 67], bass: 36, fifth: 43,
    bells: [72, 75, 79],
  },
  Bb6: {
    pad: [58, 65, 70], strings: [70, 74, 77], bass: 46, fifth: 53,
    bells: [74, 77, 79],
  },
  Dm7: {
    pad: [50, 57, 62], strings: [62, 65, 69], bass: 38, fifth: 45,
    bells: [74, 77, 81],
  },
};

// -------------------------------------------------------------------------------------------- form
// Four bars per chord, four chords per sixteen-bar section. The first eight sections and the coda
// change something at every sixteen bars; the open section at 81 drops the bass and the rim.
const prog = (...chords) => chords.flatMap((chord) => times(4, () => chord)).join(' ');
const FORM = [
  { name: 'First light: the pad, the low strings and a few high bells', bars: prog('Ebmaj9', 'F9', 'Gm9', 'Cm9') },
  { name: 'The piano enters with the first theme', bars: prog('Ebmaj9', 'F9', 'Gm9', 'Cm9') },
  { name: 'Glass bells answer the theme', bars: prog('Ebmaj9', 'F9', 'Gm9', 'Cm9') },
  { name: 'The turn: Bb6 and a new, brighter phrase', bars: prog('Bb6', 'F9', 'Gm9', 'Cm9') },
  { name: 'The strings join under the turn', bars: prog('Bb6', 'F9', 'Gm9', 'Cm9') },
  { name: 'Open water: the bass and the rim rest, the piano leaves space', bars: prog('Ebmaj9', 'Dm7', 'F9', 'Cm9') },
  { name: 'The first theme returns with the rim', bars: prog('Ebmaj9', 'F9', 'Gm9', 'Cm9') },
  { name: 'The theme an octave up, the strings underneath', bars: prog('Ebmaj9', 'F9', 'Gm9', 'Cm9') },
  { name: 'The turn returns, full', bars: prog('Bb6', 'F9', 'Gm9', 'Cm9') },
  { name: 'Coda: the theme lets go and the pad fades', bars: prog('Ebmaj9', 'F9', 'Gm9', 'Cm9') },
];
const HEAD = formHeader(FORM);
const TOTAL = HEAD.chords.length;
if (TOTAL !== 160) throw new Error(`the form is ${TOTAL} bars, wanted 160`);
const at = HEAD.at;
const BAR_TICKS = 2880;

// -------------------------------------------------------------------------------------- the feel
// The piano leans a few ticks behind the pulse, never early on a bar that changes chord. The bells
// are almost on the grid so their ring stays clear; the rim sways the other way.
const LEAD_OFF = [8, 11, 6, 13, 9, 15, 7, 12];
const BELL_OFF = [4, 6, 2, 8, 5, 3, 7, 4];
const RIM_OFF = [10, 6, 14, 8, 12, 5, 9, 7];

// -------------------------------------------------------------------------------------- patterns
// A held voicing, one dotted-half per bar, tied from bar to bar so it lasts the whole chord.
function sustain(pitches, count, base, { off = 8, drop = 0 } = {}) {
  const text = `[${pitches.map(nm).join(' ')}]`;
  return times(count, (i) => {
    const first = i === 0;
    const last = i === count - 1;
    if (!first) return `${text}/2.${last ? '' : '~'}`;
    return `${text}/2.${offsetText(off)}:${cap(base)}${last ? '' : '~'}`;
  });
}

// The low strings: the root for two bars, the fifth for two, so the bass breathes once per chord.
function bassRegion(symbol, base) {
  const { bass, fifth } = CHORD[symbol];
  return [
    `${noteText(nm(bass), '2.', cap(base + 3), 12)}~`,
    `${nm(bass)}/2.`,
    `${noteText(nm(fifth), '2.', cap(base), 9)}~`,
    `${nm(fifth)}/2.`,
  ];
}

// Three high chord tones as a quick ripple, then a long rest. Variant 1 puts a second ripple in
// the middle of the chord; variant 2 leaves more air.
function bellRegion(symbol, base, variant) {
  const [a, b, c] = CHORD[symbol].bells;
  const ripple = (notes, velocity, bar) => {
    const [x, y, z] = notes;
    const off = BELL_OFF[bar % BELL_OFF.length];
    return [
      N(nm(x), '8', cap(velocity), off),
      N(nm(y), '8', cap(velocity - 6), off + 2),
      N(nm(z), '8', cap(velocity + 4), off + 4),
      'r/4.',
    ].join(' ');
  };
  const first = ripple([a, b, c], base, 0);
  const second = ripple([c, b, a], base - 7, 2);
  if (variant === 1) return [first, R, second, R];
  if (variant === 2) return [first, R, R, R];
  return [first, R, R, R];
}

// The FM bells: one high chord tone per chord, left to ring.
function droneRegion(symbol, base) {
  const note = { Ebmaj9: 'F5', F9: 'C6', Gm9: 'A5', Cm9: 'D6', Bb6: 'G5', Dm7: 'A5' }[symbol];
  return [`${N(note, '2.', cap(base), 10)}`, R, R, R];
}

// The dusty kit's side stick on the second pulse, quiet and loose.
function rimBar(on, bar, base) {
  if (!on) return R;
  const off = RIM_OFF[bar % RIM_OFF.length];
  const vel = cap(base + ((bar * 3) % 5) * 2 - 3);
  return `r/4. ${noteText('rim', '8', vel, off)} r/4`;
}

// --------------------------------------------------------------------------------------- themes
// The first theme: four bars on each chord, mostly stepwise, the long note at the end of each
// phrase. Every note is a chord tone, so the off-chord report stays empty.
const THEME_A = [
  `${N('G4', '4', 88, 8)} ${N('Bb4', '8', 74, 3)} ${N('Bb4', '4.', 82, 12)}`,
  `${N('Bb4', '4', 84, 6)} ${N('G4', '8', 73, 2)} ${N('F4', '4.', 80, 11)}`,
  `${N('Eb4', '4.', 86, 9)} ${N('F4', '4', 77, 4)} ${N('G4', '8', 81, 13)}`,
  `${N('Eb4', '2.', 82, 7)}`,
  `${N('A4', '4', 90, 10)} ${N('C5', '8', 76, 3)} ${N('C5', '4.', 84, 12)}`,
  `${N('C5', '4', 86, 8)} ${N('A4', '8', 75, 2)} ${N('G4', '4.', 81, 13)}`,
  `${N('F4', '4.', 88, 11)} ${N('G4', '4', 78, 6)} ${N('A4', '8', 83, 14)}`,
  `${N('F4', '2.', 84, 8)}`,
  `${N('Bb4', '4', 86, 9)} ${N('A4', '8', 74, 3)} ${N('A4', '4.', 82, 12)}`,
  `${N('G4', '4', 84, 7)} ${N('D4', '8', 72, 2)} ${N('F4', '4.', 80, 11)}`,
  `${N('G4', '4.', 86, 10)} ${N('A4', '4', 77, 5)} ${N('Bb4', '8', 81, 14)}`,
  `${N('G4', '2.', 82, 8)}`,
  `${N('Eb4', '4', 86, 9)} ${N('G4', '8', 75, 3)} ${N('G4', '4.', 82, 12)}`,
  `${N('Bb4', '4', 84, 7)} ${N('G4', '8', 74, 2)} ${N('Eb4', '4.', 80, 11)}`,
  `${N('G4', '4.', 85, 10)} ${N('Eb4', '4', 76, 5)} ${N('D4', '8', 79, 13)}`,
  `${N('C5', '2.', 82, 8)}`,
];

// The turn: Bb6 opens the phrase, then F9, Gm9 and Cm9 answer it. The contour is deliberately
// wider than the first theme, but the phrases still end on long chord tones.
const THEME_B = [
  `${N('D5', '4', 88, 9)} ${N('F5', '8', 76, 3)} ${N('F5', '4.', 84, 12)}`,
  `${N('G5', '4', 86, 7)} ${N('F5', '8', 75, 2)} ${N('D5', '4.', 82, 11)}`,
  `${N('D5', '4', 84, 10)} ${N('Bb4', '8', 73, 4)} ${N('Bb4', '4.', 80, 13)}`,
  `${N('Bb4', '2.', 82, 8)}`,
  `${N('C5', '4', 86, 9)} ${N('Eb5', '8', 75, 3)} ${N('Eb5', '4.', 82, 12)}`,
  `${N('F5', '4', 88, 7)} ${N('Eb5', '8', 76, 2)} ${N('C5', '4.', 83, 11)}`,
  `${N('C5', '4.', 86, 10)} ${N('A4', '4', 77, 5)} ${N('G4', '8', 81, 14)}`,
  `${N('F4', '2.', 82, 8)}`,
  `${N('D5', '4', 87, 9)} ${N('F5', '8', 76, 3)} ${N('F5', '4.', 83, 12)}`,
  `${N('G5', '4', 88, 7)} ${N('F5', '8', 77, 2)} ${N('D5', '4.', 84, 11)}`,
  `${N('D5', '4.', 86, 10)} ${N('Bb4', '4', 76, 5)} ${N('A4', '8', 80, 14)}`,
  `${N('G4', '2.', 82, 8)}`,
  `${N('G5', '4', 87, 9)} ${N('Eb5', '8', 76, 3)} ${N('Eb5', '4.', 83, 12)}`,
  `${N('D5', '4', 85, 7)} ${N('C5', '8', 74, 2)} ${N('C5', '4.', 81, 11)}`,
  `${N('Bb4', '4.', 85, 10)} ${N('G4', '4', 76, 5)} ${N('Eb4', '8', 80, 13)}`,
  `${N('C5', '2.', 82, 8)}`,
];

// The open middle: long notes with space between them, so the pad and the bells carry the section.
const THEME_C = [
  `${N('G5', '2.', 80, 10)}`, R,
  `${N('Bb4', '4.', 78, 8)} ${N('F5', '4.', 74, 12)}`, R,
  `${N('D5', '2.', 80, 9)}`, R,
  `${N('F5', '4.', 78, 7)} ${N('A5', '4.', 75, 11)}`, R,
  `${N('A4', '2.', 80, 10)}`, R,
  `${N('C5', '4.', 78, 8)} ${N('Eb5', '4.', 74, 12)}`, R,
  `${N('G4', '2.', 79, 9)}`, R,
  `${N('Bb4', '4.', 77, 7)} ${N('C5', '4.', 75, 11)}`, R,
];

// The first theme an octave up for the full statement; the velocities come down a touch so the
// high register does not turn brittle.
const high = (bar) => transpose(bar, 12, nm).replace(/:(\d+)/g, (match, value) => `:${Math.max(60, Number(value) - 6)}`);
const THEME_A_HIGH = THEME_A.map(high);

// --------------------------------------------------------------------------------------- assemble
const KEYS = ['lead', 'bells', 'arp', 'pad', 'chords', 'bass', 'kit'];
const b = sectionBuilder(KEYS, {
  exact: true,
  barTicks: BAR_TICKS,
  label: (name, start, end) => `${start}-${end}: ${name}`,
});

const padBars = (from, base) => times(4, (i) => sustain(CHORD[at(from + i * 4)].pad, 4, base)).flat();
const stringBars = (from, base) => times(4, (i) =>
  sustain(CHORD[at(from + i * 4)].strings, 4, base, { off: 12, drop: 2 })).flat();
const bassBars = (from, base) => times(4, (i) => bassRegion(at(from + i * 4), base)).flat();
const bellBars = (from, base, variant) => times(4, (i) => bellRegion(at(from + i * 4), base, variant)).flat();
const droneBars = (from, base) => times(4, (i) => droneRegion(at(from + i * 4), base)).flat();
const rimBars = (from, base, on = true) => bars(from, 16, (bar) => rimBar(on, bar, base));

// 1-16: the pad fades in, the low strings enter under it, and a few high bells mark the changes.
b.section(FORM[0].name, 16, {
  pad: padBars(1, 74),
  bass: bassBars(1, 62),
  arp: bellBars(1, 58, 2),
});

// 17-32: the first theme on the piano, with the bells still sparse.
b.section(FORM[1].name, 16, {
  pad: padBars(17, 76),
  bass: bassBars(17, 64),
  arp: bellBars(17, 58, 2),
  lead: THEME_A,
});

// 33-48: the bells answer the theme, the FM bells start their long high notes, the pad lifts.
b.section(FORM[2].name, 16, {
  pad: padBars(33, 78),
  bass: bassBars(33, 66),
  arp: bellBars(33, 62, 1),
  lead: THEME_A,
  bells: droneBars(33, 52),
});

// 49-64: the turn; the rim arrives on the second pulse of every other bar.
b.section(FORM[3].name, 16, {
  pad: padBars(49, 78),
  bass: bassBars(49, 66),
  arp: bellBars(49, 58, 2),
  lead: THEME_B,
  bells: droneBars(49, 52),
  kit: rimBars(49, 38, true).map((bar, i) => (i % 2 === 0 ? bar : R)),
});

// 65-80: the strings join under the turn, the rim settles onto every other bar.
b.section(FORM[4].name, 16, {
  pad: padBars(65, 80),
  bass: bassBars(65, 68),
  arp: bellBars(65, 60, 1),
  lead: THEME_B,
  bells: droneBars(65, 54),
  chords: stringBars(65, 56),
  kit: rimBars(65, 40, true).map((bar, i) => (i % 2 === 0 ? bar : R)),
});

// 81-96: open water. The bass and the rim rest, the pad holds, and the piano leaves long gaps.
// The tempo eases back a little, then returns at 97.
b.section(FORM[5].name, 16, {
  pad: padBars(81, 78),
  arp: bellBars(81, 60, 2),
  lead: THEME_C,
  bells: droneBars(81, 56),
});

// 97-112: the first theme returns, the rim with it, the strings out.
b.section(FORM[6].name, 16, {
  pad: padBars(97, 80),
  bass: bassBars(97, 68),
  arp: bellBars(97, 62, 1),
  lead: THEME_A,
  bells: droneBars(97, 54),
  kit: rimBars(97, 42, true),
});

// 113-128: the theme an octave up, the strings and the rim full. The highest point of the song.
b.section(FORM[7].name, 16, {
  pad: padBars(113, 82),
  bass: bassBars(113, 70),
  arp: bellBars(113, 64, 1),
  lead: THEME_A_HIGH,
  bells: droneBars(113, 56),
  chords: stringBars(113, 60),
  kit: rimBars(113, 44, true),
});

// 129-144: the turn returns full, then the strings start to thin.
b.section(FORM[8].name, 16, {
  pad: padBars(129, 80),
  bass: bassBars(129, 68),
  arp: bellBars(129, 62, 1),
  lead: THEME_B,
  bells: droneBars(129, 54),
  chords: stringBars(129, 58),
  kit: rimBars(129, 42, true),
});

// 145-160: the coda. The theme comes back once, the rim leaves at 153, the pad and the bass fade,
// and the last bar is only the pad's chord and the high bells ringing out.
b.section(FORM[9].name, 16, {
  pad: padBars(145, 78),
  bass: bassBars(145, 66),
  arp: bellBars(145, 60, 2),
  lead: THEME_A,
  bells: droneBars(145, 54),
  chords: stringBars(145, 56),
  kit: rimBars(145, 40, true).map((bar, i) => (i < 8 ? bar : R)),
});

// ------------------------------------------------------------------------------------------- text
const FORM_NOTE = `# Sea Glass, by DeepSeek Flash & SZ. An original ambient piece for the Ambient
# style: 72 BPM in 6/8 in E-flat Lydian, 160 bars, 6:40. A slow piano figure rocks on the 6/8
# pulse over a choir pad and a low string bed, with glass bells, a high FM-bell drone and a soft
# side-stick on the second pulse. The harmony is one chord every four bars: Ebmaj9 and F9 open it,
# Gm9 and Cm9 answer, and the turn at 49 brings Bb6, and the open middle at 81 brings Dm7. The first theme enters at 17, the
# bells answer at 33, the turn at 49 adds strings and the rim, the middle at 81 drops the bass and
# the rim and leaves long gaps, the first theme returns at 97, rises an octave at 113, and the coda
# at 145 lets go over eight bars of fade. The 6/8 lilt keeps a quiet clock, so it is calm without
# becoming a lullaby.
#
# Lineup: piano (lead, grand-piano) carries the themes; glass bells (lead2, fm-bells) hold one high
# chord tone per chord; glockenspiel (arp, bank:glockenspiel) plays three-note ripples; choir (pad,
# choir-ooh) holds open fifths; warm strings (chords, bank:string-pad) join the turn and the full
# statement; low strings (bass, low-strings) breathe root-to-fifth under each chord; dusty kit
# (drums) is only the side stick. No music box, no FM Rhodes, no washed pad, no glass pad, no soft
# sub.
#
# The chord table below is the only place the harmony is written. Every pitched part reads its
# chord from it, and every long note is a chord tone, so the song has no off-chord notes. The pad
# is written without thirds, so the piano's ninths and the Lydian A stay clear; the low strings
# rest in the open section so the pad can be heard.
#
# Built by its own script, tools/arranger/sea-glass.mjs, from tools/arranger/lib.mjs: the chord
# table, the three themes, the bell ripples, the rim, the velocities and the microtiming all live
# there, and the song file is generated from it - never edited.`;

const TEXT = [
  FORM_NOTE,
  '#',
  ...HEAD.chordLines,
  '#',
  '# Form:',
  ...HEAD.formLines,
  '#',
  'title: Sea Glass',
  'composer: DeepSeek Flash & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: ambient',
  'key: E-flat Lydian',
  'tempo: 72',
  'time: 6/8',
  'about: A 6:40 ambient drift in 6/8 in E-flat Lydian: a slow piano theme over a choir pad and '
    + 'a low string bed, glass bells, a high FM-bell drone and a soft side stick. Calm and awake '
    + 'rather than sleepy, with an open middle and a gentle fade at the end.',
  '',
  '@bars 153-160 tempo=72..66',
].join('\n');

const TRACKS = [
  ['lead', 'track lead role=lead inst=grand-piano vol=0.78 pan=-0.08 vol@17-20=0..1'],
  ['bells', 'track bells role=lead2 inst=fm-bells vol=0.34 pan=0.2 vol@33-36=0..1'],
  ['arp', 'track arp role=arp inst=bank:glockenspiel vol=0.46 pan=0.3 vol@1-4=0..1 vol@157-160=1..0'],
  ['pad', 'track pad role=pad inst=choir-ooh vol=0.56 pan=-0.18 vol@1-4=0..1 vol@157-160=1..0'],
  ['chords', 'track chords role=chords inst=bank:string-pad vol=0.32 pan=0.12 vol@65-68=0..1 vol@145-160=1..0.7'],
  ['bass', 'track bass role=bass inst=low-strings vol=0.36 pan=0 vol@1-4=0..1 vol@153-160=1..0'],
  ['kit', 'track kit role=drums vol=0.4 pan=0.05'],
];

const text = `${TEXT}

${TRACKS.map(([key, head]) => `${head}\n${b.block(key, { perRow: 4, collapseRests: true })}`).join('\n\n')}
`;

const path = saveSong(out, 'sea-glass.song', text);
console.log(`wrote ${path} (${TOTAL} bars)`);
