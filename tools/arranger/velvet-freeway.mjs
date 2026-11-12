// Velvet Freeway: an original melody-first synthwave song for the Synthwave style, by Arena Agent,
// Claude and SZ. A sunset-cruise tune at 104 BPM in G major, a tempo and key none of the other synthwave
// songs use: the saw lead sings a chorus hook built on a repeated two-note cell (B-D, B-D, then a
// leap to the held tonic), the square lead answers in the gaps the hook leaves and states the cell
// in half time in the bridge, the poly-stab chords push on the off-beats around the snare, the pluck
// arp plays a four-note interleaved figure, the warm pad holds the full chord, and the synth bass cruises under
// a gated kick. The last chorus goes up a whole step to A major and the outro ends on one big hit.
//
// This script lays every part out bar by bar. The harmony is one map (FORM below, mirrored in the
// song's `# chords:` lines), one chord a bar, and every pitched part follows it.
//   node tools/arranger/velvet-freeway.mjs [outDir]
import {
  chordText, clampVelocity, formHeader, noteName, offsetText, outDir, R, repeatBar, saveSong,
  sectionBuilder, SHARPS,
} from './lib.mjs';

const out = outDir();

// ---------------------------------------------------------------- pitches and the chord table
const nm = (n) => noteName(n, SHARPS);
const vel = (v) => clampVelocity(v, 126);

const n = (pitch, dur, v = 100, at = 0) => `${nm(pitch)}/${dur}${offsetText(at)}:${vel(v)}`;
const chd = (pitches, dur, v, at = 0) => `${chordText(pitches, nm)}/${dur}${offsetText(at)}:${vel(v)}`;

// One row per chord: the bass root, the pad's root and fifth (the rest of the pad's chord is built
// from the chord's name by padVoicing), the stab's triad in the middle (G3-E4), and the arp's four
// notes (C4-B5), which the figure interleaves rather than running up and down.
const CH = {
  G: { bass: 43, pad: [55, 62], stab: [59, 62, 67], arp: [67, 71, 74, 81] },
  G6: { bass: 43, pad: [55, 62], stab: [59, 62, 67], arp: [67, 71, 74, 76] },
  D: { bass: 38, pad: [50, 57], stab: [57, 62, 66], arp: [62, 66, 69, 76] },
  Em: { bass: 40, pad: [52, 59], stab: [55, 59, 64], arp: [64, 67, 71, 78] },
  C6: { bass: 36, pad: [48, 55], stab: [55, 60, 64], arp: [60, 64, 67, 74] },
  Am: { bass: 33, pad: [45, 52], stab: [57, 60, 64], arp: [57, 60, 64, 71] },
  Am7: { bass: 33, pad: [45, 52], stab: [57, 60, 64], arp: [57, 60, 64, 67] },
  Bm: { bass: 35, pad: [47, 54], stab: [59, 62, 66], arp: [59, 62, 66, 73] },
  Bm7: { bass: 35, pad: [47, 54], stab: [59, 62, 66], arp: [59, 62, 66, 69] },
  Em7: { bass: 40, pad: [52, 59], stab: [55, 59, 64], arp: [64, 67, 71, 74] },
  Em9: { bass: 40, pad: [52, 59], stab: [55, 59, 64], arp: [64, 67, 71, 78] },
  E: { bass: 40, pad: [52, 59], stab: [56, 59, 64], arp: [64, 68, 71, 76] },
  E6: { bass: 40, pad: [52, 59], stab: [56, 59, 64], arp: [64, 68, 71, 73] },
  Eadd9: { bass: 40, pad: [52, 59], stab: [56, 59, 64], arp: [64, 68, 71, 78] },
  Dmaj9: { bass: 38, pad: [50, 57], stab: [57, 62, 66], arp: [62, 66, 69, 73] },
  A: { bass: 45, pad: [57, 64], stab: [57, 61, 64], arp: [69, 73, 76, 83] },
  'F#m': { bass: 42, pad: [54, 61], stab: [54, 57, 61], arp: [66, 69, 73, 80] },
  'F#m7': { bass: 42, pad: [54, 61], stab: [54, 57, 61], arp: [66, 69, 73, 76] },
  'F#m9': { bass: 42, pad: [54, 61], stab: [54, 57, 61], arp: [66, 69, 73, 80] },
  D6: { bass: 38, pad: [50, 57], stab: [57, 62, 66], arp: [62, 66, 69, 76] },
  D7: { bass: 38, pad: [50, 57], stab: [57, 62, 66], arp: [62, 66, 69, 72] },
  Dadd9: { bass: 38, pad: [50, 57], stab: [57, 62, 66], arp: [62, 66, 69, 76] },
};

// The form. The verse is vi-IV-I-V (it starts on the relative minor, so the chorus's I has somewhere
// to lift to), the pre-chorus climbs Am-Bm-C-D, and the chorus is I-V-vi-IV | I-V-IV-V. The bridge
// walks C-D-Em-Em7 and the solo climbs to an E major, the dominant of A, for the key change.
const FORM = [
  { name: 'Intro: the pad and the arp, then the lead quotes the hook and breaks off', bars: 'G D Em C6 G D Em C6' },
  { name: 'Verse 1: the cell low in the voice, the square answering at the phrase ends', bars: 'Em C6 G D Em C6 G D Em7 C6 G D Em C6 G6 D' },
  { name: 'Pre-chorus 1: Am-Bm-C-D climbing, the arp into sixteenths', bars: 'Am Bm C6 D Am7 Bm7 C6 D' },
  { name: 'Chorus 1: the hook, the stabs pushing around the snare, the square in the gap', bars: 'G D Em C6 G Dadd9 C6 D G D Em C6 G Dadd9 C6 D' },
  { name: 'Verse 2: the second verse, the arp driving in sixteenths', bars: 'Em C6 G D Em C6 G D' },
  { name: 'Pre-chorus 2: the same climb, louder, into a roll', bars: 'Am Bm C6 D Am7 Bm7 C6 D' },
  { name: 'Chorus 2: the hook again, the pad and arp wider', bars: 'G D Em C6 G Dadd9 C6 D G D Em C6 G Dadd9 C6 D' },
  { name: 'Bridge: the kick drops, the square walks the cell up C-D-Em', bars: 'C6 D Em Em7' },
  { name: 'Solo: the cell in sixteenths, climbing to E major, the dominant of A', bars: 'C6 D Em7 Em9 C6 D7 D E6' },
  { name: 'Last chorus: the hook up a whole step in A major, the choir underneath', bars: 'A E F#m D6 A Eadd9 D6 E A E F#m D6 A Eadd9 D6 E' },
  { name: 'Outro: the motif in A, a snare roll, and one last hit on A', bars: 'A F#m9 Dmaj9 A' },
];

const { chords: CHORDS, starts, chordRange, chordLines, formLines } = formHeader(FORM);
for (const name of CHORDS) {
  if (!CH[name]) throw new Error(`no voicing for chord '${name}'`);
}
const TOTAL = CHORDS.length; // 112 bars = about 4:18 at 104 BPM

// ---------------------------------------------------------------- the melody
// A line from [pitch, duration, offset, velocity delta]. A null pitch is a rest. The first note of a
// bar leans in and the last one eases off, so no two bars read at exactly the same level; the
// offsets never start a bar early, so a bar's first note can't sit under the previous bar's chord.
const ACCENT = { '1': 7, '2': 5, '4': 2, '8': -4, '16': -7 };
const line = (notes, v) =>
  notes
    .map(([pitch, dur, at = 0, dv = 0], index) =>
      pitch === null
        ? `r/${dur}`
        : n(pitch, dur,
          v + dv + (ACCENT[dur] ?? 0) + (index === 0 ? 6 : 0) + (index === notes.length - 1 ? -6 : 0)
            + (index % 2 ? -3 : 2), at))
    .join(' ');

// The hook: eight bars. The two-note cell (B, D over the tonic) repeats, then rises through E and F#
// to a held G; the second phrase climbs to A over the IV and falls back. Bars 7-8 are the turnaround.
const HOOK = [
  [[71, '8', 12], [74, '8', -4], [71, '8', 2], [74, '8', -2], [76, '8', 6], [78, '8', 8], [79, '4', 10]], // G
  [[78, '2', 12], [76, '8', -4], [74, '8', -2], [69, '4', 8]], //                                 D
  [[71, '8', 12], [74, '8', -4], [71, '8', 2], [74, '8', -2], [76, '4', 6], [79, '4', 10]], //     Em
  [[81, '4', 12], [79, '8', -4], [76, '8', -2], [72, '2', 8]], //                                 C6
  [[71, '8', 12], [74, '8', -4], [76, '8', -2], [78, '8', 2], [79, '4', 8], [79, '4', 10]], //     G
  [[78, '2', 12], [76, '4', 6], [74, '4', 4]], //                                                 Dadd9
  [[76, '8', 12], [79, '8', -4], [76, '8', 2], [79, '8', -2], [81, '4', 8], [79, '4', 6]], //     C6
  [[78, '2', 12], [null, '2']], //                                                                D
];
// The chorus's second pass turns the cell over at the top and ends on a falling tag.
const TURN = [
  [[79, '8', 12], [81, '8', -4], [79, '8', 2], [78, '8', -2], [79, '2', 10]], //                   G
  [[81, '8', 12], [79, '8', -4], [78, '4', 6], [74, '2', 10]], //                                  D
  [[76, '8', 12], [79, '8', -4], [81, '4', 8], [79, '4', 4], [76, '4', 8]], //                     C6
  [[78, '4', 12], [76, '8', -4], [74, '8', -2], [74, '2', 8]], //                                  D
];
const hookBar = (bar, v, up = 0) =>
  line(bar.map(([pitch, dur, at, dv]) => (pitch === null ? [null, dur] : [pitch + up, dur, at, dv])), v);

// The verse: its own tune, lower than the hook, in four-bar phrases that end on a held note or a
// rest. Phrases 1 and 2 answer each other; phrase 3 climbs; phrase 4 folds back for the pre-chorus.
const VERSE = [
  [[64, '8', 12], [67, '8', -4], [71, '4', 6], [69, '8', -2], [67, '8', 2], [64, '4', 8]], //     Em
  [[72, '4', 12], [71, '8', -4], [69, '8', -2], [67, '2', 8]], //                                 C6
  [[69, '8', 12], [71, '8', -4], [74, '4', 8], [71, '8', -2], [69, '8', 2], [67, '4', 6]], //     G
  [[66, '4', 12], [69, '4', 4], [62, '4', 8], [null, '4']], //                                    D
  [[64, '8', 12], [67, '8', -4], [71, '8', -2], [72, '8', 2], [71, '4', 8], [69, '8', 4], [67, '8', 2]], // Em
  [[72, '4', 12], [74, '8', -4], [72, '8', -2], [69, '2', 8]], //                                 C6
  [[74, '8', 12], [71, '8', -4], [69, '8', -2], [71, '8', 2], [74, '2', 8]], //                   G
  [[74, '2', 12], [69, '4', 6], [null, '4']], //                                                  D
  [[67, '8', 12], [71, '8', -4], [74, '4', 8], [76, '8', -2], [74, '8', 2], [71, '4', 6]], //     Em
  [[76, '4', 12], [74, '8', -4], [72, '8', -2], [69, '2', 8]], //                                 C6
  [[74, '8', 12], [76, '8', -4], [79, '4', 8], [76, '8', -2], [74, '8', 2], [71, '4', 6]], //     G
  [[78, '2', 12], [76, '8', -4], [74, '8', -2], [74, '4', 8]], //                                 D
  [[71, '8', 12], [74, '8', -4], [76, '4', 8], [74, '8', -2], [71, '8', 2], [67, '4', 6]], //     Em
  [[72, '4', 12], [76, '4', 6], [79, '2', 10]], //                                                C6
  [[74, '8', 12], [76, '8', -4], [79, '4', 8], [76, '4', 6], [74, '4', 4]], //                    G
  [[78, '8', 12], [76, '8', -4], [74, '2', 8], [null, '4']], //                                   D
];
const verseBars = (from, count, v) =>
  VERSE.slice(from, from + count).map((bar) => line(bar, v));

// The pre-chorus climbs a step a bar and holds the fifth of D under the roll, so the chorus can lift.
const PRE = [
  [[69, '8', 12], [72, '8', -4], [76, '4', 8], [74, '8', -2], [72, '8', 2], [69, '4', 6]], //     Am
  [[71, '8', 12], [74, '8', -4], [78, '4', 8], [76, '8', -2], [74, '8', 2], [71, '4', 6]], //     Bm
  [[72, '4', 12], [76, '4', 6], [79, '4', 8], [76, '4', 4]], //                                   C6
  [[78, '2', 12], [74, '4', 6], [69, '4', 4]], //                                                 D
  [[72, '8', 12], [74, '8', -4], [76, '4', 8], [79, '4', 6], [76, '4', 4]], //                    Am
  [[74, '8', 12], [76, '8', -4], [78, '4', 8], [81, '4', 6], [78, '4', 4]], //                    Bm7
  [[79, '4', 12], [81, '4', 6], [79, '4', 8], [76, '4', 4]], //                                   C6
  [[78, '4', 12], [76, '8', -4], [74, '8', -2], [74, '2', 8]], //                                 D
];
const preBars = (v) => PRE.map((bar) => line(bar, v));

// The bridge, on the square lead: the two-note cell in half time, walked up C-D-Em, then a fall into
// the solo.
const BRIDGE = [
  [[72, '4', 10], [76, '4', 4], [72, '4', 6], [76, '4', 2]], //                                   C6
  [[74, '4', 10], [78, '4', 4], [74, '4', 6], [78, '4', 2]], //                                   D
  [[71, '4', 10], [76, '4', 4], [71, '4', 6], [76, '4', 2]], //                                   Em
  [[79, '2', 10], [78, '8', -2], [76, '8', 0], [74, '4', 4]], //                                  Em7
];

// The solo: the cell climbing through the chords in eighths, a run over the IV, and a bend into the
// new key on the last bar.
const SOLO = [
  [[72, '8', 12], [76, '8', -4], [72, '8', 0], [76, '8', -2], [79, '4', 8], [76, '4', 4]], //     C6
  [[74, '8', 12], [78, '8', -4], [74, '8', 0], [78, '8', -2], [81, '4', 8], [78, '4', 4]], //     D
  [[76, '8', 12], [79, '8', -4], [76, '8', 0], [79, '8', -2], [83, '4', 8], [79, '4', 4]], //     Em7
  [[83, '2', 12], [81, '8', -4], [79, '8', -2], [78, '4', 8]], //                                 Em9
  [[84, '8', 12], [81, '8', -4], [79, '8', 0], [76, '8', -2], [79, '4', 8], [76, '4', 4]], //     C6
  [[86, '8', 12], [84, '8', -4], [81, '8', 0], [78, '8', -2], [81, '4', 8], [78, '4', 4]], //     D7
  [[81, '2', 12], [78, '4', 6], [81, '4', 4]], //                                                 D
];
// The last bar of the solo: G#, then B bent up to C#, held over E major into A major.
const SOLO_BEND = `${n(80, '4', 106, 12)} ${nm(83)}/8-2^ ${nm(85)}/8~ ${nm(85)}/2:104`;

// The outro: the motif in A, then the tag that lands on A.
const OUTRO = [
  [[73, '8', 12], [76, '8', -4], [73, '8', 0], [76, '8', -2], [78, '8', 6], [80, '8', 8], [81, '4', 10]], // A
  [[81, '2', 12], [78, '8', -4], [76, '8', -2], [73, '4', 8]], //                                 F#m9
  [[78, '4', 12], [76, '8', -4], [74, '8', -2], [69, '2', 8]], //                                 Dmaj9
  [[69, '2', 10], [null, '2']], //                                                              A
];

// The square lead's answers: beats 3-4 of a bar the hook or verse leaves open. They quote the cell's
// rhythm in the answers and stay under the lead.
const ANSWERS = {
  intro: [[72, '8', 10], [76, '8', -4], [79, '4', 6]], //                                        C6
  verseA: [[74, '8', 10], [78, '8', -4]], //                                                     D
  verseB: [[78, '8', 10], [81, '8', -4]], //                                                     D
  chorus: [[74, '8', 10], [78, '8', -4], [81, '4', 6]], //                                       D
};
const answerBar = (name, v, rest = 'r/2') => `${rest} ${line(ANSWERS[name], v)}`;

// ---------------------------------------------------------------- generated parts
// The bass: a laid-back cruise in the verse (on, off, on, on, on, off, on, on) and a rolling eighth
// note chorus. Downbeats stay on the grid, the octaves push six ticks early, and the last bar of a
// section turns up to the fifth.
function bassBar(chordName, { v = 100, pattern = 'cruise', fill = false } = {}) {
  const { bass } = CH[chordName];
  const root = (slot, dv = 0, at = 0) => n(bass, '8', v + dv, at);
  const oct = (dv = -14, at = -6) => n(bass + 12, '8', v + dv, at);
  const fifth = (dv = -10, at = -4) => n(bass + 7, '8', v + dv, at);
  if (fill) return [root(0), root(-4), root(0, -4), oct(-10), root(0), fifth(), root(-4), oct(-6)].join(' ');
  if (pattern === 'drive') return [root(0), root(-6), root(-2), oct(), root(-4), root(-8), fifth(), oct(-4)].join(' ');
  if (pattern === 'hold') return `${nm(bass)}/1:${vel(v)}`;
  return [root(0), root(-10), root(-2), oct(), root(0), root(-12), root(-4), oct(-4)].join(' ');
}

// The arp: four chord notes interleaved as 0-2-1-3-0-2-3-1, so it turns back on itself instead of
// running up and down the triad. In sixteenths the figure runs twice, the second pass from the top.
const FIG = [0, 2, 1, 3, 0, 2, 3, 1];
const FIG_R = [1, 3, 2, 0, 3, 1, 2, 0];
const ARP_AT = [0, -3, 2, -2, 0, -3, 3, -2];
const ARP_DV = [6, -10, -2, 2, 4, -12, 0, -4];
const ARP_BOOST = 9;
const arpBar = (chordName, v0, note = '8') => {
  const v = v0 + ARP_BOOST;
  const notes = CH[chordName].arp;
  const order = note === '16' ? [...FIG, ...FIG_R] : FIG;
  return order
    .map((index, slot) => n(notes[index], note, v + ARP_DV[slot % 8], ARP_AT[slot % 8]))
    .join(' ');
};

// The stabs push on the off-beats around the snare instead of on it: beat 1, the "and" of 2 and the
// "and" of 3, with the "and" of 4 pushing into the next bar every other bar. They land late and
// never by the same amount twice. The pre-chorus pulses them on every eighth but the snare's.
const STAB_AT = [18, 12, 22, 14, 20, 16, 12, 20];
const PUSH = [[0, -2], [3, 0], [5, -4]];
const PUSH_ON = [...PUSH, [7, -6]];
const PULSE = [[0, 0], [1, -10], [3, -4], [4, -2], [5, -10], [7, -6]];
const stabBar = (chordName, hits, v) => {
  const map = new Map(hits);
  const slots = [];
  for (let slot = 0; slot < 8; slot++) {
    if (map.has(slot)) slots.push(chd(CH[chordName].stab, '8', v + map.get(slot), STAB_AT[slot]));
    else slots.push('r/8');
  }
  return slots.join(' ');
};

// The pad plays the whole chord, spread wide under the tune: the root and fifth low, the third an
// octave up as a tenth, and a 6th or a flat 7th between the fifth and the tenth when the chord's name
// asks for one. Major 7ths and 9ths stay in the arp, where they don't sit a half step under the
// stabs' root or the minor tenth.
const padVoicing = (chordName) => {
  const root = CH[chordName].pad[0];
  const minor = /^[A-G]#?m(?!aj)/.test(chordName);
  const colour = /maj/.test(chordName) ? [] : /7/.test(chordName) ? [10] : /6/.test(chordName) ? [9] : [];
  return [root, root + 7, ...colour.map((c) => root + c), root + 12 + (minor ? 3 : 4)];
};
const padBar = (chordName, v, at = 0) => chd(padVoicing(chordName), '1', v, at);
const choirBar = (chordName, v) => chd(CH[chordName].stab.slice(0, 2).concat(CH[chordName].stab[2]), '1', v);

// ---------------------------------------------------------------- drums
// Eight eighth-note slots. The hats push six or seven ticks early, the snare and clap drag ten to
// twelve behind the kick, the kick stays on the grid, and no two hats repeat a velocity.
const hats = (v) => [
  `[k h]/8:${vel(v)}`, `h/8-7:${vel(v - 44)}`, `[s cl h]/8+10:${vel(v - 8)}`, `h/8-6:${vel(v - 38)}`,
  `[k h]/8:${vel(v - 3)}`, `h/8-7:${vel(v - 42)}`, `[s cl h]/8+12:${vel(v - 6)}`, `oh/8-6:${vel(v - 28)}`,
];
const drums = {
  // hats and clap only, no kick: the intro's second bar
  lift: (v) => `r/4 [cl oh]/4+10:${vel(v - 10)} r/4 [cl h]/4+12:${vel(v - 16)}`,
  verse: (v) => hats(v).join(' '),
  // the chorus pushes a kick onto the "and" of 2 and opens the hat there
  chorus: (v) => [
    `[k h]/8:${vel(v)}`, `h/8-7:${vel(v - 40)}`, `[s cl h]/8+10:${vel(v - 6)}`, `[k oh]/8-6:${vel(v - 24)}`,
    `[k h]/8:${vel(v - 2)}`, `h/8-7:${vel(v - 38)}`, `[s cl h]/8+12:${vel(v - 4)}`, `oh/8-6:${vel(v - 20)}`,
  ].join(' '),
  crash: (v) => `cr/1:${vel(v)}`,
  crashChorus: (v) => `[k cr]/8:${vel(v)} oh/8-6:${vel(v - 30)} [s cl h]/8+10:${vel(v - 6)} [k oh]/8-6:${vel(v - 24)} [k h]/8:${vel(v - 2)} h/8-7:${vel(v - 38)} [s cl h]/8+12:${vel(v - 4)} oh/8-6:${vel(v - 20)}`,
  // the bridge: claps and hats, no kick, the pad carrying the bar
  bridge: (v) => `h/4-7:${vel(v - 40)} [cl h]/4+10:${vel(v - 14)} h/4-7:${vel(v - 44)} [cl h]/4+12:${vel(v - 10)}`,
  // a sixteenth-note snare roll climbing from v
  roll: (v, climb = 40) =>
    Array.from({ length: 16 }, (_, i) => {
      const level = v + (climb * i) / 15;
      return i % 4 === 0 ? `[k s]/16:${vel(level)}` : `s/16:${vel(level)}`;
    }).join(' '),
  // the last bar before a chorus: a roll and a tom fill down the kit
  fill: (v) => {
    const hit = (names, dv) => `[${names}]/16:${vel(v + dv)}`;
    return [hit('k s', 0), hit('s', 4), hit('s', 8), hit('s', 2), hit('k s', 10), hit('s', 12), hit('s', 16), hit('s', 10),
      hit('th', 12), hit('th', 16), hit('tm', 18), hit('tm', 22), hit('tl', 16), hit('tl', 20), hit('k tl', 24), hit('k cr', 26)].join(' ');
  },
  final: (v) => `[k cr]/2:${vel(v)} r/2`,
};

// ---------------------------------------------------------------- the arrangement
const keys = ['lead', 'answer', 'pad', 'choir', 'stabs', 'arp', 'bass', 'drums'];
const { tracks, section, block } = sectionBuilder(keys);
const chordBars = (from, count, make) => chordRange(from, count).map(make);

// --- 1-8: intro. Pad and arp alone, then hats and clap, then the groove; the lead quotes the hook's
// first two bars at bar 5 and breaks off at 7.
section('Intro: the pad and the arp, then the lead quotes the hook and breaks off', 8, {
  lead: [null, null, null, null, hookBar(HOOK[0], 92), hookBar(HOOK[1], 94),
    line([[71, '8', 12], [74, '8', -4], [71, '8', 0], [74, '8', -2], [null, '2']], 92), null],
  answer: [null, null, null, null, null, null, null, answerBar('intro', 82)],
  pad: chordBars(1, 8, (c, i) => padBar(c, i < 4 ? 56 + i * 4 : 68)),
  stabs: [null, null, null, null, null, null,
    stabBar(CHORDS[6], [[3, -6]], 68), stabBar(CHORDS[7], [[3, -4], [5, -8]], 72)],
  arp: chordBars(1, 8, (c, i) => arpBar(c, i < 4 ? 66 + i * 4 : 78, i < 4 ? '8' : '16')),
  bass: [...repeatBar(R, 2), ...chordBars(3, 6, (c, i) => bassBar(c, { v: 74 + i * 2, fill: i === 5 }))],
  drums: [null, null, drums.lift(92), drums.lift(96), drums.crash(112), drums.verse(98),
    drums.verse(100), drums.fill(102)],
});

// --- 9-24: verse 1. The verse tune with the square answering at the phrase ends, the pad holding the
// chord, light stabs on the "and"s of 2 and 3, and the arp turning to sixteenths in the second half.
section('Verse 1: the cell low in the voice, the square answering at the phrase ends', 16, {
  lead: verseBars(0, 16, 96),
  answer: [null, null, null, answerBar('verseA', 80, 'r/2.'), null, null, null, answerBar('verseB', 82, 'r/2.'),
    null, null, null, answerBar('verseA', 82, 'r/2.'), null, null, null, answerBar('verseB', 84, 'r/2.')],
  pad: chordBars(9, 16, (c, i) => padBar(c, 62 + Math.min(10, i))),
  stabs: chordBars(9, 16, (c, i) => stabBar(c, i % 4 === 3 ? [[3, -2], [5, -6], [7, -8]] : [[3, -2], [5, -6]], 80 + (i % 4) * 2)),
  arp: chordBars(9, 16, (c, i) => arpBar(c, 74 + (i % 4) * 3, i < 8 ? '8' : '16')),
  bass: chordBars(9, 16, (c, i) => bassBar(c, { v: 98 + (i % 4) * 2, fill: i === 15 })),
  drums: chordBars(9, 16, (c, i) => (i === 15 ? drums.fill(102) : drums.verse(98 + (i % 4) * 2))),
});

// --- 25-32: pre-chorus 1. The line climbs Am-Bm-C-D, the arp goes to sixteenths, the bass drives and
// the last two bars roll into the chorus.
section('Pre-chorus 1: Am-Bm-C-D climbing, the arp into sixteenths', 8, {
  lead: preBars(96).map((bar, i) => (i >= 4 ? bar : bar)),
  answer: [null, null, null, null, null, null,
    line(PRE[6].map(([pitch, dur, at, dv = 0]) => [pitch - 12, dur, at, dv]), 84),
    line(PRE[7].map(([pitch, dur, at, dv = 0]) => [pitch - 12, dur, at, dv]), 86)],
  pad: chordBars(25, 8, (c, i) => padBar(c, 68 + i * 2)),
  stabs: chordBars(25, 8, (c, i) => stabBar(c, PULSE, 82 + i * 2)),
  arp: chordBars(25, 8, (c, i) => arpBar(c, 78 + i * 2, '16')),
  bass: chordBars(25, 8, (c, i) => bassBar(c, { v: 100 + i, pattern: i < 4 ? 'cruise' : 'drive', fill: i === 7 })),
  drums: [drums.verse(104), drums.verse(106), drums.chorus(108), drums.chorus(110),
    drums.chorus(112), drums.chorus(112), drums.roll(100, 26), drums.fill(110)],
});

// --- 33-48: chorus 1. The hook twice, the square answering in the gap at bar 40, the stabs pushing
// around the snare, the bass rolling, and a crash on each eight.
section('Chorus 1: the hook, the stabs pushing around the snare, the square in the gap', 16, {
  lead: [...HOOK.map((bar) => hookBar(bar, 100)), ...HOOK.slice(0, 4).map((bar) => hookBar(bar, 102)),
    ...TURN.map((bar, i) => hookBar(bar, 102 + i))],
  answer: [null, null, null, null, null, null, null, answerBar('chorus', 86),
    null, null, null, null, null, null, null, null],
  pad: chordBars(33, 16, (c, i) => padBar(c, 74 + (i % 4))),
  stabs: chordBars(33, 16, (c, i) => stabBar(c, i % 2 === 0 ? PUSH : PUSH_ON, 82 + (i % 4) * 2)),
  arp: chordBars(33, 16, (c, i) => arpBar(c, 82 + (i % 4) * 2, '16')),
  bass: chordBars(33, 16, (c, i) => bassBar(c, { v: 104 + (i % 4) * 2, pattern: 'drive', fill: i === 15 })),
  drums: chordBars(33, 16, (c, i) => (i === 15 ? drums.fill(108)
    : i === 0 || i === 8 ? drums.crashChorus(112) : drums.chorus(108 + (i % 4) * 2))),
});

// --- 49-56: verse 2. The first two phrases again, the arp driving in sixteenths throughout and the
// square answering at every phrase end.
section('Verse 2: the second verse, the arp driving in sixteenths', 8, {
  lead: verseBars(0, 8, 98),
  answer: [null, null, null, answerBar('verseA', 84, 'r/2.'), null, null, null, answerBar('verseB', 86, 'r/2.')],
  pad: chordBars(49, 8, (c, i) => padBar(c, 66 + i)),
  stabs: chordBars(49, 8, (c, i) => stabBar(c, [[3, -2], [5, -6]], 84 + (i % 4) * 2)),
  arp: chordBars(49, 8, (c, i) => arpBar(c, 80 + (i % 4) * 2, '16')),
  bass: chordBars(49, 8, (c, i) => bassBar(c, { v: 100 + (i % 4) * 2, fill: i === 7 })),
  drums: chordBars(49, 8, (c, i) => (i === 7 ? drums.fill(104) : drums.verse(100 + (i % 4) * 2))),
});

// --- 57-64: pre-chorus 2, the same climb a little louder, the roll longer.
section('Pre-chorus 2: the same climb, louder, into a roll', 8, {
  lead: preBars(100),
  answer: [null, null, null, null, null, null,
    line(PRE[6].map(([pitch, dur, at, dv = 0]) => [pitch - 12, dur, at, dv]), 88),
    line(PRE[7].map(([pitch, dur, at, dv = 0]) => [pitch - 12, dur, at, dv]), 90)],
  pad: chordBars(57, 8, (c, i) => padBar(c, 72 + i)),
  stabs: chordBars(57, 8, (c, i) => stabBar(c, PULSE, 86 + i * 2)),
  arp: chordBars(57, 8, (c, i) => arpBar(c, 82 + i * 2, '16')),
  bass: chordBars(57, 8, (c, i) => bassBar(c, { v: 104 + i, pattern: i < 4 ? 'cruise' : 'drive', fill: i === 7 })),
  drums: [drums.verse(108), drums.chorus(108), drums.chorus(110), drums.chorus(112),
    drums.chorus(112), drums.chorus(114), drums.roll(104, 28), drums.fill(112)],
});

// --- 65-80: chorus 2, the hook with the pad and arp wider and a tom fill into the bridge.
section('Chorus 2: the hook again, the pad and arp wider', 16, {
  lead: [...HOOK.map((bar) => hookBar(bar, 102)), ...HOOK.slice(0, 4).map((bar) => hookBar(bar, 102)),
    ...TURN.map((bar, i) => hookBar(bar, 104 + i))],
  answer: [null, null, null, null, null, null, null, answerBar('chorus', 88),
    null, null, null, null, null, null, null, null],
  pad: chordBars(65, 16, (c, i) => padBar(c, 76 + (i % 4))),
  stabs: chordBars(65, 16, (c, i) => stabBar(c, i % 2 === 0 ? PUSH : PUSH_ON, 84 + (i % 4) * 2)),
  arp: chordBars(65, 16, (c, i) => arpBar(c, 84 + (i % 4) * 2, '16')),
  bass: chordBars(65, 16, (c, i) => bassBar(c, { v: 106 + (i % 4) * 2, pattern: 'drive', fill: i === 15 })),
  drums: chordBars(65, 16, (c, i) => (i === 15 ? drums.fill(110)
    : i === 0 || i === 8 ? drums.crashChorus(114) : drums.chorus(110 + (i % 4) * 2))),
});

// --- 81-84: bridge. The kick and arp drop out, the pad opens and the choir enters, and the square
// lead walks the two-note cell up C-D-Em.
section('Bridge: the kick drops, the square walks the cell up C-D-Em', 4, {
  lead: repeatBar(R, 4),
  answer: BRIDGE.map((bar, i) => line(bar, 88 + i)),
  pad: chordBars(81, 4, (c, i) => padBar(c, 84 + i * 2)),
  choir: chordBars(81, 4, (c, i) => choirBar(c, 58 + i * 3)),
  stabs: chordBars(81, 4, (c, i) => stabBar(c, [[3, -6]], 70 + i * 2)),
  arp: repeatBar(R, 4),
  bass: chordBars(81, 4, (c, i) => bassBar(c, { v: 84, pattern: 'hold' })),
  drums: [drums.crash(104), drums.bridge(84), drums.bridge(86), drums.roll(90, 24)],
});

// --- 85-92: solo. The saw lead takes the cell through the chords, a run over the IV, and a bend into
// the new key; the kick and arp return.
section('Solo: the cell in sixteenths, climbing to E major, the dominant of A', 8, {
  lead: [...SOLO.map((bar, i) => line(bar, 100 + i)), SOLO_BEND],
  answer: repeatBar(R, 8),
  pad: chordBars(85, 8, (c, i) => padBar(c, 78 + i)),
  choir: chordBars(85, 8, (c, i) => choirBar(c, 66 + i * 2)),
  stabs: chordBars(85, 8, (c, i) => stabBar(c, i % 2 === 0 ? PUSH : PUSH_ON, 84 + i * 2)),
  arp: chordBars(85, 8, (c, i) => arpBar(c, 84 + (i % 4) * 2, '16')),
  bass: chordBars(85, 8, (c, i) => bassBar(c, { v: 106 + i, pattern: 'drive', fill: i === 7 })),
  drums: chordBars(85, 8, (c, i) => (i === 7 ? drums.fill(112)
    : i === 0 ? drums.crashChorus(112) : drums.chorus(110 + (i % 4) * 2))),
});

// --- 93-108: last chorus. The whole hook up a whole step in A major with the choir underneath, the
// square doubling the tag an octave down, and the biggest drums in the song.
section('Last chorus: the hook up a whole step in A major, the choir underneath', 16, {
  lead: [...HOOK.map((bar) => hookBar(bar, 106, 2)), ...HOOK.slice(0, 4).map((bar) => hookBar(bar, 106, 2)),
    ...TURN.map((bar, i) => hookBar(bar, 108, 2))],
  answer: [null, null, null, null, null, null, null,
    `r/2 ${line(ANSWERS.chorus.map(([pitch, dur, at, dv = 0]) => [pitch + 2, dur, at, dv]), 90)}`,
    null, null, null, null, null, null,
    line(TURN[2].map(([pitch, dur, at, dv = 0]) => [pitch - 12 + 2, dur, at, dv]), 92),
    line(TURN[3].map(([pitch, dur, at, dv = 0]) => [pitch - 12 + 2, dur, at, dv]), 92)],
  pad: chordBars(93, 16, (c, i) => padBar(c, 78 + (i % 4))),
  choir: chordBars(93, 16, (c, i) => choirBar(c, 74 + Math.min(8, i))),
  stabs: chordBars(93, 16, (c, i) => stabBar(c, i % 2 === 0 ? PUSH : PUSH_ON, 88 + (i % 4) * 2)),
  arp: chordBars(93, 16, (c, i) => arpBar(c, 86 + (i % 4) * 2, '16')),
  bass: chordBars(93, 16, (c, i) => bassBar(c, { v: 108 + (i % 4) * 2, pattern: 'drive', fill: i === 15 })),
  drums: chordBars(93, 16, (c, i) => (i === 7 || i === 15 ? drums.fill(112)
    : i === 0 || i === 8 ? drums.crashChorus(118) : drums.chorus(112 + (i % 4) * 2))),
});

// --- 109-112: outro. The motif in A, the drums thinning to a snare roll, and everything hits the
// last A together on the downbeat and lets it ring out.
section('Outro: the motif in A, a snare roll, and one last hit on A', 4, {
  lead: OUTRO.map((bar, i) => line(bar, 100 - i * 2)),
  answer: repeatBar(R, 4),
  pad: chordBars(109, 4, (c, i) => (i === 3 ? `${chd(padVoicing(c), '2', 84)} r/2` : padBar(c, 78 - i * 2))),
  choir: chordBars(109, 4, (c, i) => (i === 3 ? `${chd(CH[c].stab, '2', 82)} r/2` : choirBar(c, 80 - i * 3))),
  stabs: [stabBar(CHORDS[108], PUSH, 84), stabBar(CHORDS[109], [[3, -4]], 80), stabBar(CHORDS[110], [[3, -6]], 78), stabBar(CHORDS[111], [[0, 4]], 92)],
  arp: [arpBar(CHORDS[108], 80, '8'), arpBar(CHORDS[109], 76, '8'), null, null],
  bass: [bassBar(CHORDS[108], { v: 104, pattern: 'hold' }), bassBar(CHORDS[109], { v: 100, pattern: 'hold' }),
    `${nm(CH[CHORDS[110]].bass)}/2:${vel(96)} r/2`, `${nm(CH[CHORDS[111]].bass)}/2:${vel(110)} r/2`],
  drums: [drums.crash(114), drums.verse(104), drums.roll(92, 26), drums.final(118)],
});

// ---------------------------------------------------------------- write the song
const HEADER_NOTE = `# Velvet Freeway, by Arena Agent, Claude and SZ. An original, melody-first synthwave song for the
# Synthwave style: a sunset cruise at 104 BPM in G major, with the last chorus up a whole step in A
# major and the outro ending on one big hit. The saw lead carries the tune; its hook is a two-note cell
# (B-D, B-D) that climbs to the tonic and holds, then a second phrase that reaches the sixth and
# falls back. The verse has a tune of its own, low and phrased in four-bar breaths; the pre-chorus
# climbs Am-Bm-C-D; the bridge states the cell in half time on the square lead, and the solo walks
# it through the changes in eighths and bends into the new key. The square answers the hook in the
# gaps rather than doubling it, the poly-stab chords push on beat 1 and the "and"s of 2 and 3 so they
# are heard around the gated snare instead of under it, the pluck arp plays an interleaved four-note
# figure (0-2-1-3-0-2-3-1, not a plain triad), the warm pad holds the full chord spread wide (root,
# fifth, any 6th or flat 7th, and the third as a tenth), and the synth bass cruises under the gated kit.
# One extra bank instrument: the ooh choir, from the bridge to the last chord, for the final lift.
#
# The harmony, one chord a bar. The verse is vi-IV-I-V, the pre-chorus Am-Bm-C-D, the chorus is
# I-V-vi-IV | I-V-IV-V, the bridge walks C-D-Em-Em7, the solo climbs C-D-Em-Em9 | C-D7-D-E and ends
# on the dominant of A, and the last chorus and outro are in A. Every pitched part follows it bar by
# bar.`;

const FEEL = `# Human feel: the lead's phrase starts lean in twelve ticks, its inner pushes come two to four
# ticks early, and its held notes settle eight to twelve late; the stabs land twelve to twenty-two
# ticks late and never twice the same; the closed hats push six or seven ticks early and the snare
# and clap drag ten to twelve behind the kick; the bass keeps its downbeats on the grid and pushes
# every octave six ticks early; the arp's accents and the hats' velocities never repeat, and the
# drums are quieter in the first verse than in the last chorus.`;

const HEADER = [
  'title: Velvet Freeway',
  'composer: Arena Agent, Claude & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: synthwave',
  'key: G major to A major',
  'tempo: 104',
  'time: 4/4',
  'about: A sunset-cruise synthwave tune at 104 BPM in G major: a saw-lead hook built on a two-note cell, a square lead answering in the gaps, pushing stabs over full pad chords, an interleaved pluck arp and a gated kit, with the last chorus up a whole step in A major and a big final hit.',
].join('\n');

const TRACKS = [
  ['lead', 'track lead role=lead inst=saw-lead vol=0.78 vol.altrock=1 vol.ambient=1.6 pan=-0.1'],
  ['answer', 'track answer role=lead2 inst=square-lead vol=0.84 vol.altrock=0.9 pan=0.34'],
  ['pad', 'track pad role=pad vol=0.9 vol.altrock=0.5 pan=-0.16'],
  ['choir', 'track choir role=pad inst=choir-ooh vol=0.62 pan=0.2'],
  ['stabs', 'track stabs role=chords vol=0.86 pan=-0.28'],
  ['arp', 'track arp role=arp vol=0.95 vol.altrock=0.5 pan=0.28'],
  ['bass', 'track bass role=bass vol=0.42 vol.altrock=0.09 vol.orchestral=0.26 vol.techno=0.16 pan=0'],
  ['drums', 'track drums role=drums vol=0.85 vol.altrock=0.4 vol.orchestral=0.55 pan=0'],
];

const text = `${HEADER_NOTE}
#
${chordLines.join('\n')}
#
# Form:
${formLines.join('\n')}
#
${FEEL}
${HEADER}


${TRACKS.map(([key, head]) => `${head}\n${block(key)}`).join('\n\n')}
`;

saveSong(out, 'velvet-freeway.song', text);
console.log(`wrote ${out}/velvet-freeway.song (${TOTAL} bars)`);
