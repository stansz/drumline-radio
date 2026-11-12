// Sunliner: an original italo-disco synthwave track for the Synthwave style, by Arena Agent and SZ.
// A wordless vox-lead hook sings the choruses over four-on-the-floor gated drums, an octave-bouncing
// synth bass, bright poly-stab chords on the off-beats, a pluck arpeggio, and the bank choirs (ooh
// under the verses, aah lifting the choruses and the breakdown). The saw lead answers the hook
// between its phrases instead of doubling it. 118 BPM in D major, sunny and made to dance to; the
// last chorus goes up a whole step to E major.
//
// This script lays every part out bar by bar. The harmony is one map (FORM below, mirrored in the
// song's `# chords:` lines), one chord a bar, and every pitched part follows it: the pad holds a
// root and fifth, the choirs and stabs spell the triads in the middle, the arp climbs the chord, and
// the bass bounces its root in octaves.
//   node tools/arranger/sunliner.mjs [outDir]
import {
  chordText, clampVelocity, formHeader, noteName, offsetText, outDir, R, repeatBar, saveSong,
  sectionBuilder, SHARPS,
} from './lib.mjs';

const out = outDir();

// ---------------------------------------------------------------- pitches and the chord table
const nm = (n) => noteName(n, SHARPS);
const vel = (v) => clampVelocity(v, 126);

// One row per chord: the bass root (octave 1) and the voicings every part plays over it. The choirs
// and stabs sit in the middle (F#3-E4), the pad below them holding only a root and a fifth, so a
// held colour tone in the hook has room, and the arp runs from B3 to G#5 above the groove.
const CH = {
  D: { bass: 26, pad: [50, 57], ooh: [54, 57, 62], aah: [54, 57, 62], stab: [50, 54, 57], arp: [62, 69, 74, 78] },
  G: { bass: 31, pad: [43, 50], ooh: [55, 59, 62], aah: [55, 59, 62], stab: [47, 50, 55], arp: [55, 62, 67, 71] },
  Bm: { bass: 35, pad: [47, 54], ooh: [54, 59, 62], aah: [54, 59, 62], stab: [47, 50, 54], arp: [59, 66, 71, 74] },
  A: { bass: 33, pad: [45, 52], ooh: [52, 57, 61], aah: [52, 57, 61], stab: [49, 52, 57], arp: [57, 64, 69, 73] },
  Em: { bass: 28, pad: [52, 59], ooh: [55, 59, 64], aah: [55, 59, 64], stab: [47, 52, 55], arp: [59, 64, 71, 76] },
  'F#m': { bass: 30, pad: [42, 49], ooh: [54, 57, 61], aah: [54, 57, 61], stab: [49, 54, 57], arp: [54, 61, 66, 69] },
  B: { bass: 35, pad: [47, 54], ooh: [54, 59, 63], aah: [54, 59, 63], stab: [47, 51, 54], arp: [59, 66, 71, 75] },
  'G#m': { bass: 32, pad: [44, 51], ooh: [56, 59, 63], aah: [56, 59, 63], stab: [47, 51, 56], arp: [59, 63, 68, 71] },
  // The hook holds the seventh over some iii and vi bars, so those bars are m7 chords: the choirs
  // and stabs spell the triad and the vocal supplies the seventh.
  'F#m7': { bass: 30, pad: [42, 49], ooh: [54, 57, 61], aah: [54, 57, 61], stab: [49, 54, 57], arp: [54, 61, 66, 69] },
  'G#m7': { bass: 32, pad: [44, 51], ooh: [56, 59, 63], aah: [56, 59, 63], stab: [47, 51, 56], arp: [59, 63, 68, 71] },
  'Bm7': { bass: 35, pad: [47, 54], ooh: [54, 59, 62], aah: [54, 59, 62], stab: [47, 50, 54], arp: [59, 66, 71, 74] },
  E: { bass: 28, pad: [52, 59], ooh: [56, 59, 64], aah: [56, 59, 64], stab: [52, 56, 59], arp: [64, 71, 76, 80] },
  'C#m': { bass: 25, pad: [49, 56], ooh: [56, 61, 64], aah: [56, 61, 64], stab: [49, 52, 56], arp: [61, 68, 73, 76] },
};

// The form, section by section, with each section's bars. The verse is I-IV-vi-V, the pre-chorus
// climbs Em-F#m-G-A, and the chorus is I-iii-vi-IV | I-V-IV-V: the iii under the hook's held E and
// C# keeps it off the I-V-vi-IV that Starlight Drive already owns.
const FORM = [
  { name: 'Intro: drums and bass, then the arp', bars: 'D D G A D D G A' },
  { name: 'Verse 1: the ooh choir swells under the phrase', bars: 'D G Bm A D G Em A D G Bm A D G Em A' },
  { name: 'Pre-chorus 1: Em-F#m-G-A climbing, the pad swells in', bars: 'Em F#m G A Em F#m G A' },
  { name: 'Chorus 1: the vox hook, the aah choir, the saw answering', bars: 'D F#m7 Bm G D A G A D F#m7 Bm G D A G A' },
  { name: 'Verse 2: the arp turns to sixteenths, the hook comes back', bars: 'D G Bm A D G Em A' },
  { name: 'Pre-chorus 2: the same climb, louder', bars: 'Em F#m G A Em F#m G A' },
  { name: 'Chorus 2: the hook again, the ooh choir under it', bars: 'D F#m7 Bm G D A G A D F#m7 Bm G D A G A' },
  { name: 'Breakdown: the kick drops, choirs and pad under the slow hook', bars: 'D D Bm7 Bm7 G G A A' },
  { name: 'Build: the kick returns and the harmony climbs to B, the dominant of E', bars: 'Em F#m G A Em F#m B B' },
  { name: 'Last chorus: the whole hook up a whole step in E major', bars: 'E G#m7 C#m A E B A B E G#m7 C#m A E B A B' },
  { name: 'Outro: the tag, the saw answer, one last E', bars: 'E B C#m A E B A E' },
];

const { chords: CHORDS, starts, chordRange, chordLines, formLines } = formHeader(FORM);
const TOTAL = CHORDS.length; // 120 bars = 4:04 at 118 BPM
const chordAt = (bar) => CH[CHORDS[bar - 1]];

// ---------------------------------------------------------------- note and bar helpers
const n = (pitch, dur, v = 100, at = 0, dv = 0) => `${nm(pitch)}/${dur}${offsetText(at)}:${vel(v + dv)}`;
const chd = (pitches, dur, v, at = 0) => `${chordText(pitches, nm)}/${dur}${offsetText(at)}:${vel(v)}`;

// A melody bar from [pitch, duration, offset, velocity delta] entries. Pitches are MIDI numbers so
// the last chorus can be the same line transposed by a whole step.
// Phrase shape on top of the written dynamics: the first note of a bar leans in, the last one eases
// off, so no two bars of the same line read at exactly the same level.
const line = (notes, v) => notes.map(([pitch, dur, at = 0, dv = 0], index) =>
  pitch === null
    ? `r/${dur}`
    : n(pitch, dur, v, at, dv + (index === 0 ? 4 : 0) + (index === notes.length - 1 ? -4 : 0))).join(' ');

// ---------------------------------------------------------------- the vocals (the song)
// The chorus hook, eight bars: three bars of phrase, a bar for the saw, three bars back, a bar for
// the saw. It sits on A3-A4, the warm top of the vox lead's register, and every held note is a chord
// tone of the bar under it. Micro-timing: phrase starts lean in (+12), the inner pushes come a touch
// early (-4), and the long notes settle late (+8..+10), so the line breathes instead of marching.
const HOOK = [
  [[62, '8', 12, 0], [64, '8', -4, -6], [66, '4', 8, 2], [69, '2', 10, 4]], // D   "dum-da, DAA, DAA-ah"
  [[64, '8', 12, 0], [66, '8', -4, -6], [69, '4', 8, 2], [66, '2', 10, 4]], // F#m7
  [[66, '8', 12, 0], [64, '8', -4, -6], [62, '4', 8, 2], [59, '2', 10, 4]], // Bm
  null, //                                                                     G   (the saw answers)
  [[62, '8', 12, 0], [64, '8', -4, -6], [66, '4', 8, 2], [69, '2', 10, 4]], // D
  [[64, '8', 12, 0], [66, '8', -4, -6], [64, '4', 8, 2], [61, '2', 10, 4]], // A
  [[59, '8', 12, 0], [62, '8', -4, -6], [67, '4', 8, 2], [62, '2', 10, 4]], // G
  null, //                                                                     A   (the saw answers)
];
const hookBar = (index, v, up = 0) => {
  const bar = HOOK[index];
  if (!bar) return null;
  return line(bar.map(([pitch, dur, at, dv]) => [pitch + up, dur, at, dv]), v);
};

// The verse melody: lower and sparser than the hook, leaving bars 13-14 and 21-22 to the saw.
const VERSE = [
  [[57, '4', 10, 0], [59, '8', -4, -6], [61, '8', -2, -4], [62, '4', 8, 2], [66, '4', 10, 4]], // D
  [[59, '4', 10, 0], [62, '8', -4, -6], [64, '8', -2, -4], [62, '4', 8, 2], [59, '4', 10, 4]], // G
  [[62, '4', 10, 0], [66, '8', -4, -6], [64, '8', -2, -4], [62, '4', 8, 2], [59, '4', 10, 4]], // Bm
  [[61, '4', 10, 0], [64, '4', 8, 2], [57, '2', 10, 4]], //                                      A
  null,
  null,
  [[59, '4', 10, 0], [62, '8', -4, -6], [64, '8', -2, -4], [67, '4', 8, 2], [64, '4', 10, 4]], // Em
  [[61, '4', 10, 0], [57, '4', 8, -2], [61, '4', 10, 0], [64, '4', 8, 2]], //                    A
];
const verseBar = (index, v) => (VERSE[index] ? line(VERSE[index], v) : null);
const verseBars = (v) => VERSE.map((_, index) => verseBar(index, v));

// The pre-chorus climbs Em-F#m-G-A twice and holds an A4 over the roll, so the chorus has room to
// land on it.
const PRE = [
  [[64, '4', 10], [67, '8', -4], [64, '8', -2], [59, '4', 8], [64, '4', 10]], // Em
  [[66, '4', 10], [69, '8', -4], [66, '8', -2], [61, '4', 8], [66, '4', 10]], // F#m
  [[59, '4', 10], [62, '8', -4], [67, '8', -2], [62, '4', 8], [59, '4', 10]], // G
  [[61, '4', 10], [64, '4', 8], [69, '2', 10]], //                               A
  [[64, '4', 10], [67, '8', -4], [64, '8', -2], [59, '4', 8], [64, '4', 10]], // Em
  [[66, '4', 10], [69, '8', -4], [66, '8', -2], [61, '4', 8], [66, '4', 10]], // F#m
  [[59, '4', 10], [62, '4', 8], [67, '4', 10], [62, '4', 8]], //                 G
  [[69, '2', 10], [null, '2']], //                                              A, held under the roll
];

// The breakdown's half-time hook: the chorus line stretched to two bars a phrase, quiet, with the
// choirs and pad carrying the harmony behind it.
const BREAK = [
  [[62, '4', 14], [66, '4', 10], [69, '2', 14]], // D
  [[69, '1', 12]], //                               D
  [[66, '4', 14], [69, '4', 10], [66, '2', 14]], // Bm
  [[62, '1', 12]], //                               Bm
  [[62, '4', 14], [59, '4', 10], [67, '2', 14]], // G
  [[59, '1', 12]], //                               G
  [[61, '4', 14], [64, '4', 10], [69, '2', 14]], // A
  null,
];

// The build: two bars a chord, then the arpeggio in quarters, rising to B and the leading tone D#.
const BUILD = [
  [[64, '2', 10], [67, '2', 8]], // Em
  [[66, '2', 10], [69, '2', 8]], // F#m
  [[59, '2', 10], [62, '2', 8]], // G
  [[61, '2', 10], [64, '2', 8]], // A
  [[64, '4', 10], [67, '4', 8], [59, '4', 10], [64, '4', 8]], // Em
  [[66, '4', 10], [69, '4', 8], [61, '4', 10], [66, '4', 8]], // F#m
  [[63, '4', 10], [66, '4', 8], [59, '4', 10], [63, '4', 8]], // B: D# is the leading tone to E
  [[63, '2', 12], [null, '2']], //                                B, then air for the fill
];

// The outro sings the hook's first three bars in E, then a tag on A before the last E.
const OUTRO = [
  [[64, '8', 12], [68, '8', -4], [71, '4', 8], [71, '2', 10]], // E
  [[66, '8', 12], [68, '8', -4], [66, '4', 8], [63, '2', 10]], // B
  [[68, '8', 12], [71, '8', -4], [68, '4', 8], [64, '2', 10]], // C#m
  [[61, '8', 12], [64, '8', -4], [69, '4', 8], [64, '2', 10]], // A
  null,
  null,
  [[61, '2', 12], [64, '2', 10]], //                              A
  [[64, '1', 10]], //                                             E
];

// The saw lead's answers, in the gaps the hook leaves. They quote the hook's rhythm and climb above
// it (D5-G5) instead of doubling it. Every answer is [pitch, duration, offset, velocity delta].
const ANSWERS = {
  verseA: [
    [[69, '8', 10], [71, '8', -4], [74, '4', 8], [78, '4', 12], [74, '4', 8]], // D
    [[71, '4', 10], [74, '4', 8], [71, '2', 12]], //                                G
  ],
  verseB: [
    [[69, '8', 10], [74, '8', -4], [78, '4', 8], [74, '2', 12]], // D
    [[71, '8', 10], [74, '8', -4], [79, '4', 8], [74, '2', 12]], // G
  ],
  chorusA: [[[74, '8', 10], [79, '8', -4], [74, '4', 8], [71, '2', 12]]], // G
  chorusB: [[[76, '8', 10], [73, '8', -4], [69, '4', 8], [73, '2', 12]]], // A
  chorusC: [[[71, '8', 10], [74, '8', -4], [79, '4', 8], [74, '2', 12]]], // G
  chorusD: [[[69, '8', 10], [73, '8', -4], [76, '4', 8], [76, '2', 12]]], // A
  breakdown: [[[76, '4', 10], [73, '4', 8], [76, '2', 12]]], //              A
  buildA: [[[71, '8', 10], [75, '8', -4], [78, '8', 8], [75, '8', 12],
    [71, '8', 10], [75, '8', -2], [78, '8', 6], [75, '8', 14]]], //             B
  buildB: [[[78, '1', 14]]], //                                               B, held into the crash
  outroA: [[[76, '4', 10], [71, '4', 8], [76, '4', 10], [80, '4', 8]]], //    E
  outroB: [[[78, '4', 10], [75, '4', 8], [71, '4', 10], [75, '4', 8]]], //    B
};
// Each answer is a small arc of its own: the first note speaks, the middle settles, the last lets go,
// and the pair of answers in a chorus never sits at the same level.
const ANSWER_ARC = [5, -3, 2, -2, 4, -5];
const answered = (name, v, up = 0) =>
  ANSWERS[name].map((bar, barIndex) =>
    line(bar.map(([pitch, dur, at, dv = 0], index) =>
      [pitch + up, dur, at, dv + ANSWER_ARC[index % ANSWER_ARC.length] + (barIndex % 2 ? -3 : 0)]),
    v));

// ---------------------------------------------------------------- generated parts
// The bass: root and octave on eighth notes, the downbeats on the grid and every octave pushed six
// ticks early, so it leans into the kick instead of lagging behind it. A fifth-and-octave turn
// fills the bar before a section change.
function bassBar(chordName, { v = 104, fill = false } = {}) {
  const { bass } = CH[chordName];
  const low = (d, at = 0, dv = 0) => n(bass, '8', v + dv, at);
  const high = (at = -6, dv = -18) => n(bass + 12, '8', v + dv, at);
  if (fill) return [low(0), high(), low(0, -4), high(), low(0), low(-4, -10), n(bass + 7, '8', v - 8, -4), high(-4, -4)].join(' ');
  return [low(0), high(), low(0, -4), high(), low(0), high(), low(0, -4), high()].join(' ');
}

// The arp climbs the chord in sixteenths or eighths, with an uneven accent every fourth note.
const arpBar = (chordName, v, shape, note = '16') => {
  const notes = CH[chordName].arp;
  const uneven = [0, -7, 3, -4, 2, -6, 4, -5];
  const repeats = note === '16' ? 4 : 2;
  const slots = [];
  for (let repeat = 0; repeat < repeats; repeat++) {
    for (const index of shape) slots.push(n(notes[index], note, v + uneven[slots.length % 8], 0));
  }
  return slots.join(' ');
};

// Chord stabs from a list of [slot, velocity delta] over the bar's eight eighths. Every hit leans
// late, but never by the same amount twice: the four off-beats sit at +12 to +22, so the part
// breathes instead of reading as one delayed chord.
const STAB_OFFSET = [22, 12, 18, 14, 20, 16, 12, 20];
const stabBar = (chordName, hits, v) => {
  const map = new Map(hits);
  const slots = [];
  for (let slot = 0; slot < 8; slot++) {
    if (map.has(slot)) slots.push(chd(CH[chordName].stab, '8', v + map.get(slot), STAB_OFFSET[slot]));
    else slots.push('r/8');
  }
  return slots.join(' ');
};

const padBar = (chordName, v) => chd(CH[chordName].pad, '1', v);
const choirBar = (voice, chordName, v) => chd(CH[chordName][voice], '1', v);

// ---------------------------------------------------------------- drums
// Eight eighth-note slots a bar. The open hats push six ticks early, the claps drag eight to ten
// behind, the kick stays on the grid, and the closed hats never repeat the same velocity.
const hat = (v) => `h/8-6:${vel(v)}`;
const get = (v) => `[k h]/8:${vel(v)}`;
const drums = {
  introA: (v) => [get(v), hat(v - 44), get(v - 2), hat(v - 38), get(v), hat(v - 48), get(v - 4), hat(v - 40)].join(' '),
  introB: (v) => [get(v), `oh/8-6:${vel(v - 30)}`, `[k cl]/8+8:${vel(v - 2)}`, `oh/8-6:${vel(v - 24)}`,
    get(v), `oh/8-6:${vel(v - 32)}`, `[k cl]/8+10:${vel(v - 4)}`, `oh/8-6:${vel(v - 26)}`].join(' '),
  verse: (v) => [get(v), `oh/8-6:${vel(v - 30)}`, `[k cl]/8+8:${vel(v - 2)}`, `oh/8-6:${vel(v - 24)}`,
    get(v), `oh/8-6:${vel(v - 32)}`, `[k cl]/8+10:${vel(v - 4)}`, `oh/8-6:${vel(v - 26)}`].join(' '),
  chorus: (v) => [get(v), `oh/8-6:${vel(v - 28)}`, `[k s cl]/8+8:${vel(v - 2)}`, `oh/8-6:${vel(v - 22)}`,
    get(v - 2), `oh/8-6:${vel(v - 30)}`, `[k s cl]/8+10:${vel(v - 4)}`, `oh/8-6:${vel(v - 24)}`].join(' '),
  crashChorus: (v) => drums.chorus(v).replace('[k h]/8:', '[k cr]/8:'),
  breakdown: (v) => `r/4 [cl h]/4+8:${vel(v)} r/4 [cl h]/4+10:${vel(v - 4)}`,
  crash: (v) => `cr/1:${vel(v)}`,
  // a sixteenth-note snare roll climbing from v to v + climb, with the kick on each beat
  roll: (v, climb = 42) =>
    Array.from({ length: 16 }, (_, i) => {
      const level = v + (climb * i) / 15;
      return i % 4 === 0 ? `[k s]/16:${vel(level)}` : `s/16:${vel(level)}`;
    }).join(' '),
  // the last bar of a section: a roll and a tom fill down the kit
  fill: (v) => {
    const hit = (names, dv) => `[${names}]/16:${vel(v + dv)}`;
    return [hit('k s', 0), hit('s', 6), hit('s', 10), hit('s', 4), hit('k s', 8), hit('s', 14), hit('s', 18), hit('s', 12),
      hit('th', 10), hit('th', 14), hit('tm', 18), hit('tm', 22), hit('tl', 16), hit('tl', 20), hit('k tl', 24), hit('k cr', 28)].join(' ');
  },
  final: (v) => `[k cr]/1:${vel(v)}`,
};

// ---------------------------------------------------------------- the arrangement
const keys = ['vox', 'saw', 'aah', 'ooh', 'pad', 'stabs', 'arp', 'bass', 'drums'];
const { tracks, section, block } = sectionBuilder(keys);

// --- 1-8: intro. Drums and bass, then the arp; the pad swells in at bar 5 and the saw picks up
// into the verse.
section('Intro: drums and bass, then the arp', 8, {
  drums: [drums.introA(96), drums.introA(100), drums.introB(104), drums.introB(108),
    drums.introB(110), drums.introB(112), drums.introB(113), drums.chorus(114)],
  bass: chordRange(1, 8).map((c, i) => bassBar(c, { v: 100 + i * 2, fill: i === 7 })),
  arp: [null, null, null, null, ...chordRange(5, 4).map((c, i) => arpBar(c, 78 + i * 2, [0, 2, 1, 2], '8'))],
  pad: [null, null, null, null, ...chordRange(5, 4).map((c, i) => padBar(c, 60 + i * 2))],
  stabs: [null, null, null, null, null, null,
    stabBar(CHORDS[6], [[1, -6], [5, 0]], 70), stabBar(CHORDS[7], [[1, -6], [5, 0]], 74)],
  saw: [null, null, null, null, null, null, null,
    line([[69, '8', 10], [73, '8', -4], [76, '4', 8], [73, '8', 6], [69, '8', 12], [64, '4', 14]], 88)],
});

// --- 9-24: verse 1. The verse phrase, the ooh choir swelling under it, stabs on the second and
// fourth off-beats, the arp in eighths, and the saw in the two two-bar gaps.
section('Verse 1: the ooh choir swells under the phrase', 16, {
  vox: [...verseBars(94), ...verseBars(96)],
  saw: [null, null, null, null, ...answered('verseA', 88), null, null,
    null, null, null, null, ...answered('verseB', 90), null, null],
  ooh: chordRange(9, 16).map((c, i) => choirBar('ooh', c, 66 + Math.min(12, i))),
  pad: chordRange(9, 16).map((c) => padBar(c, 62)),
  stabs: chordRange(9, 16).map((c, i) => stabBar(c, [[1, -6], [5, 0]], 78 + (i % 2) * 4)),
  arp: chordRange(9, 16).map((c, i) => arpBar(c, 76 + (i % 4) * 2, [0, 1, 2, 1], '8')),
  bass: chordRange(9, 16).map((c, i) => bassBar(c, { v: 102 + (i % 4) * 2, fill: i === 7 || i === 15 })),
  drums: [drums.verse(106), drums.verse(108), drums.verse(108), drums.verse(110),
    drums.verse(108), drums.verse(110), drums.verse(110), drums.verse(112),
    drums.verse(110), drums.verse(112), drums.verse(112), drums.verse(112),
    drums.verse(112), drums.verse(112), drums.verse(113), drums.roll(96, 22)],
});

// --- 25-32: pre-chorus. The pad swells in, the arp turns to sixteenths, the stabs hit every
// off-beat, and a roll builds under the last two bars.
section('Pre-chorus 1: Em-F#m-G-A climbing, the pad swells in', 8, {
  vox: PRE.map((bar, i) => line(bar, 98 + (i >= 4 ? 2 : 0))),
  aah: chordRange(25, 8).map((c, i) => choirBar('aah', c, 62 + i * 2)),
  ooh: chordRange(25, 8).map((c, i) => choirBar('ooh', c, 60 + i * 2)),
  pad: chordRange(25, 8).map((c, i) => padBar(c, 70 + i * 3)),
  stabs: chordRange(25, 8).map((c, i) => stabBar(c, [[1, -6], [3, 0], [5, -4], [7, 2]], 80 + i * 2)),
  arp: chordRange(25, 8).map((c, i) => arpBar(c, 74 + i * 2, [0, 1, 2, 1])),
  bass: chordRange(25, 8).map((c, i) => bassBar(c, { v: 104 + i, fill: i === 3 || i === 7 })),
  drums: [drums.verse(108), drums.verse(110), drums.verse(110), drums.roll(94, 20),
    drums.verse(112), drums.verse(113), drums.verse(114), drums.roll(100, 26)],
});

// --- 33-48: chorus 1. The hook, the aah choir, the ooh choir from the second half, stabs on every
// off-beat, sixteenth arps, and the saw in the two gaps.
const chorusVox = (v, up = 0) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => hookBar(i, v, up));
const chorusSaw = (v, up = 0, pair = 'A') => {
  const [first, second] = pair === 'A' ? ['chorusA', 'chorusB'] : ['chorusC', 'chorusD'];
  return [null, null, null, ...answered(first, v, up), null, null, null, ...answered(second, v + 2, up)];
};
section('Chorus 1: the vox hook, the aah choir, the saw answering', 16, {
  vox: [...chorusVox(100), ...chorusVox(102)],
  saw: [...chorusSaw(90, 0, 'A'), ...chorusSaw(92, 0, 'B')],
  aah: chordRange(33, 16).map((c, i) => choirBar('aah', c, 78 + Math.min(10, i))),
  ooh: chordRange(33, 16).map((c, i) => (i >= 8 ? choirBar('ooh', c, 66 + Math.min(8, i - 8)) : 'R')),
  pad: chordRange(33, 16).map((c) => padBar(c, 72)),
  stabs: chordRange(33, 16).map((c, i) => stabBar(c, [[1, -6], [3, 0], [5, -4], [7, 2]], 86 + (i % 2) * 3)),
  arp: chordRange(33, 16).map((c, i) => arpBar(c, 80 + (i % 4) * 2, [0, 1, 2, 3])),
  bass: chordRange(33, 16).map((c, i) => bassBar(c, { v: 108 + (i % 4) * 2, fill: i % 8 === 7 })),
  drums: chordRange(33, 16).map((c, i) => (i === 15 ? drums.fill(112)
    : i === 0 || i === 8 ? drums.crashChorus(116) : drums.chorus(112 + (i % 4) * 2))),
});

// --- 49-56: verse 2. The same verse with the arp in sixteenths and a little more lift.
section('Verse 2: the arp turns to sixteenths, the hook comes back', 8, {
  vox: verseBars(96),
  saw: [null, null, null, null, ...answered('verseA', 90), null, null],
  ooh: chordRange(49, 8).map((c, i) => choirBar('ooh', c, 74 + i)),
  pad: chordRange(49, 8).map((c) => padBar(c, 66)),
  stabs: chordRange(49, 8).map((c, i) => stabBar(c, [[1, -6], [5, 0]], 82 + (i % 2) * 4)),
  arp: chordRange(49, 8).map((c, i) => arpBar(c, 76 + (i % 4) * 2, [0, 1, 2, 1])),
  bass: chordRange(49, 8).map((c, i) => bassBar(c, { v: 106 + (i % 4) * 2, fill: i === 7 })),
  drums: [drums.verse(110), drums.verse(112), drums.verse(112), drums.verse(112),
    drums.verse(112), drums.verse(112), drums.verse(113), drums.roll(98, 22)],
});

// --- 57-64: pre-chorus 2, the same climb with the choirs already open.
section('Pre-chorus 2: the same climb, louder', 8, {
  vox: PRE.map((bar) => line(bar, 100)),
  aah: chordRange(57, 8).map((c, i) => choirBar('aah', c, 72 + i * 2)),
  ooh: chordRange(57, 8).map((c, i) => choirBar('ooh', c, 66 + i * 2)),
  pad: chordRange(57, 8).map((c, i) => padBar(c, 72 + i * 3)),
  stabs: chordRange(57, 8).map((c, i) => stabBar(c, [[1, -6], [3, 0], [5, -4], [7, 2]], 84 + i * 2)),
  arp: chordRange(57, 8).map((c, i) => arpBar(c, 78 + i * 2, [0, 1, 2, 3])),
  bass: chordRange(57, 8).map((c, i) => bassBar(c, { v: 106 + i, fill: i === 3 || i === 7 })),
  drums: [drums.verse(112), drums.verse(113), drums.verse(114), drums.roll(98, 22),
    drums.verse(114), drums.verse(115), drums.verse(116), drums.roll(104, 22)],
});

// --- 65-80: chorus 2, the hook with the ooh choir under the aah and the saw's second pair of
// answers.
section('Chorus 2: the hook again, the ooh choir under it', 16, {
  vox: [...chorusVox(102), ...chorusVox(104)],
  saw: [...chorusSaw(92, 0, 'B'), ...chorusSaw(94, 0, 'A')],
  aah: chordRange(65, 16).map((c, i) => choirBar('aah', c, 82 + Math.min(8, i))),
  ooh: chordRange(65, 16).map((c, i) => choirBar('ooh', c, 72 + Math.min(8, i))),
  pad: chordRange(65, 16).map((c) => padBar(c, 74)),
  stabs: chordRange(65, 16).map((c, i) => stabBar(c, [[1, -6], [3, 0], [5, -4], [7, 2]], 88 + (i % 2) * 3)),
  arp: chordRange(65, 16).map((c, i) => arpBar(c, 82 + (i % 4) * 2, [0, 1, 2, 3])),
  bass: chordRange(65, 16).map((c, i) => bassBar(c, { v: 110 + (i % 4) * 2, fill: i % 8 === 7 })),
  drums: chordRange(65, 16).map((c, i) => (i === 15 ? drums.fill(114)
    : i === 0 || i === 8 ? drums.crashChorus(118) : drums.chorus(114 + (i % 4) * 2))),
});

// --- 81-88: breakdown. The kick and bass drop; the pad holds two-bar chords, both choirs swell
// under the half-time hook, and rolls on the last two bars hand over to the build.
section('Breakdown: the kick drops, choirs and pad under the slow hook', 8, {
  vox: BREAK.map((bar) => (bar ? line(bar, 88) : 'R')),
  saw: [null, null, null, null, null, null, null, ...answered('breakdown', 90)],
  aah: chordRange(81, 8).map((c, i) => choirBar('aah', c, 84 + i)),
  ooh: chordRange(81, 8).map((c, i) => choirBar('ooh', c, 78 + i)),
  pad: chordRange(81, 8).map((c, i) => padBar(c, 76 + i)),
  stabs: chordRange(81, 8).map((c, i) => (i % 2 === 0 ? chd(CH[c].stab, '1', 74 + i) : 'R')),
  // the arp comes back in the breakdown's second half, eighths turning to sixteenths as the roll
  // climbs, so the build has something to land on
  arp: [...repeatBar(R, 4), arpBar(CHORDS[84], 72, [0, 1, 2, 1], '8'), arpBar(CHORDS[85], 76, [0, 1, 2, 1], '8'),
    arpBar(CHORDS[86], 80, [0, 1, 2, 3]), arpBar(CHORDS[87], 84, [0, 1, 2, 3])],
  bass: repeatBar(R, 8),
  drums: [drums.crash(96), drums.breakdown(78), drums.breakdown(80), drums.breakdown(82),
    drums.breakdown(84), drums.breakdown(86), drums.roll(76, 30), drums.roll(86, 34)],
});

// --- 89-96: build. The kick and bass return, the arp in sixteenths, the harmony climbs to B, and
// the last bar is a tom fill into the new key.
section('Build: the kick returns and the harmony climbs to B, the dominant of E', 8, {
  vox: BUILD.map((bar, i) => line(bar, 96 + (i >= 4 ? 4 : 0))),
  saw: [null, null, null, null, null, null, ...answered('buildA', 92), ...answered('buildB', 94)],
  aah: chordRange(89, 8).map((c, i) => choirBar('aah', c, 74 + i * 3)),
  ooh: chordRange(89, 8).map((c, i) => choirBar('ooh', c, 70 + i * 2)),
  pad: chordRange(89, 8).map((c, i) => padBar(c, 74 + i * 2)),
  stabs: chordRange(89, 8).map((c, i) => stabBar(c, [[1, -6], [3, 0], [5, -4], [7, 2]], 84 + i * 3)),
  arp: chordRange(89, 8).map((c, i) => arpBar(c, 80 + i * 2, [0, 1, 2, 3])),
  bass: chordRange(89, 8).map((c, i) => bassBar(c, { v: 108 + i * 2, fill: i === 7 })),
  drums: [drums.verse(114), drums.verse(115), drums.verse(116), drums.chorus(116),
    drums.chorus(118), drums.chorus(118), drums.chorus(119), drums.fill(118)],
});

// --- 97-112: last chorus, the hook up a whole step in E major, the choirs open, the bass driving,
// the saw answering above it all.
section('Last chorus: the whole hook up a whole step in E major', 16, {
  vox: [...chorusVox(106, 2), ...chorusVox(108, 2)],
  saw: [...chorusSaw(94, 2, 'A'), ...chorusSaw(96, 2, 'B')],
  aah: chordRange(97, 16).map((c, i) => choirBar('aah', c, 86 + Math.min(8, i))),
  ooh: chordRange(97, 16).map((c, i) => choirBar('ooh', c, 76 + Math.min(8, i))),
  pad: chordRange(97, 16).map((c) => padBar(c, 78)),
  stabs: chordRange(97, 16).map((c, i) => stabBar(c, [[1, -6], [3, 0], [5, -4], [7, 2]], 92 + (i % 2) * 3)),
  arp: chordRange(97, 16).map((c, i) => arpBar(c, 86 + (i % 4) * 2, [0, 1, 2, 3])),
  bass: chordRange(97, 16).map((c, i) => bassBar(c, { v: 112 + (i % 4) * 2, fill: i % 8 === 7 })),
  drums: chordRange(97, 16).map((c, i) => (i === 15 ? drums.fill(118)
    : i === 0 || i === 8 ? drums.crashChorus(120) : drums.chorus(116 + (i % 4) * 2))),
});

// --- 113-120: outro. The hook's tag, the saw's last answer, the choirs holding E, one final hit.
section('Outro: the tag, the saw answer, one last E', 8, {
  vox: OUTRO.map((bar) => (bar ? line(bar, 100) : 'R')),
  saw: [null, null, null, null, ...answered('outroA', 94), ...answered('outroB', 94), null, null],
  aah: chordRange(113, 8).map((c, i) => choirBar('aah', c, 84 - i * 2)),
  ooh: chordRange(113, 8).map((c, i) => choirBar('ooh', c, 74 - i * 2)),
  pad: chordRange(113, 8).map((c, i) => padBar(c, 76 - i * 2)),
  stabs: chordRange(113, 6).map((c, i) => stabBar(c, [[1, -6], [5, 0]], 86 - i * 2))
    .concat([chd(CH[CHORDS[118]].stab, '1', 66), chd(CH[CHORDS[119]].stab, '1', 74)]),
  arp: [arpBar(CHORDS[112], 84, [0, 1, 2, 3]), arpBar(CHORDS[113], 82, [0, 1, 2, 3]),
    arpBar(CHORDS[114], 80, [0, 1, 2, 3]), arpBar(CHORDS[115], 78, [0, 1, 2, 3]),
    arpBar(CHORDS[116], 76, [0, 1, 2, 1], '8'), arpBar(CHORDS[117], 74, [0, 1, 2, 1], '8'), null, null],
  bass: chordRange(113, 6).map((c, i) => bassBar(c, { v: 108 - i * 2 }))
    .concat([[n(CH[CHORDS[118]].bass, '2', 104), 'r/2'].join(' '), n(CH[CHORDS[119]].bass, '1', 108)]),
  drums: [drums.crashChorus(118), drums.chorus(116), drums.chorus(114), drums.verse(112),
    drums.verse(110), drums.verse(108), `${get(104)} oh/8-6:74 r/4 [cl h]/4+8:88 r/4`, drums.final(116)],
});

// ---------------------------------------------------------------- write the song
const HEADER_NOTE = `# Sunliner, by Arena Agent and SZ. An original italo-disco synthwave track for the Synthwave
# style: a wordless vox-lead hook (the bank vox-lead) sings the chorus over four-on-the-floor gated
# drums, an octave-bouncing synth bass, bright off-beat poly-stab chords, a pluck arpeggio, and the
# bank choirs, ooh under the verses and aah lifting the choruses and the breakdown. The saw lead
# answers the hook between its phrases instead of doubling it. 118 BPM in D major, sunny and made to
# dance to, with the last chorus up a whole step to E major. Midnight Arcade stays moody in E minor
# and Underpass heroic in F minor; this one never leaves the daylight.
#
# The harmony, one chord a bar. The verse is I-IV-vi-V, the pre-chorus climbs Em-F#m-G-A, the chorus
# is I-iii-vi-IV | I-V-IV-V (the iii under the hook's held E and C# keeps it off the I-V-vi-IV), the
# build ends on B, the dominant of E, and the last chorus and outro are in E. Every pitched part
# follows it bar by bar.`;

const FEEL = `# Human feel: the hook's phrase starts lean in twelve ticks, its inner pushes come a touch early,
# and its long notes settle late; the stabs land twelve to twenty-two ticks late and uneven; the open
# hats push six ticks early and the claps drag eight to ten behind the kick; the bass keeps its
# downbeats on the grid and pushes every octave six ticks early; the hats, stabs, and arp carry
# uneven velocities, and the claps and toms are louder in the last chorus than in the first.`;

const HEADER = [
  'title: Sunliner',
  'composer: Arena Agent & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: synthwave',
  'key: D major',
  'tempo: 118',
  'time: 4/4',
  'about: A sunny italo-disco drive: a wordless vocal hook over four-on-the-floor gated drums, an octave-bouncing bass, bright off-beat stabs, a pluck arp, and choirs swelling under it, with a kick-less breakdown and a last chorus up a whole step.',
];

const TRACKS = [
  ['vox', 'track vox role=lead inst=vox-lead inst.techno=analog-synth vol=1 vol.techno=2.8 pan=0'],
  ['saw', 'track saw role=lead2 inst=saw-lead vol=0.5 vol.altrock=1 pan=0.18'],
  ['aah', 'track aah role=pad inst=choir-aah vol=0.95 pan=-0.12'],
  ['ooh', 'track ooh role=pad inst=choir-ooh vol=0.95 pan=0.12'],
  ['pad', 'track pad role=pad vol=0.95 vol.altrock=0.45 pan=0'],
  ['stabs', 'track stabs role=chords vol=0.6 pan=-0.26'],
  ['arp', 'track arp role=arp vol=1 vol.altrock=0.5 pan=0.3'],
  ['bass', 'track bass role=bass vol=0.44 vol.altrock=0.085 vol.orchestral=0.28 vol.techno=0.155 pan=0'],
  ['drums', 'track drums role=drums vol=0.85 vol.altrock=0.38 vol.orchestral=0.54 pan=0'],
];

const text = `${HEADER_NOTE}
#
${chordLines.join('\n')}
#
# Form:
${formLines.join('\n')}
#
${FEEL}
${HEADER.join('\n')}

${TRACKS.map(([key, head]) => `${head}\n${block(key)}`).join('\n\n')}
`;

saveSong(out, 'sunliner.song', text);
console.log(`wrote ${out}/sunliner.song (${TOTAL} bars)`);
