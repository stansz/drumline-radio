// Reading Room, an original ambient piece by Qwen 4-Max & SZ for the Ambient style: calm,
// beatless study music in the spirit of Music for Airports and Hammock. 66 BPM in 4/4 in Bb
// major, 132 bars, 8:00.
//
// Plan (written before the notes):
// Lineup - guitar: lead, inst=shimmer-guitar (it sounds at the written pitch), sparse single
//   notes left to ring into the style's dotted-half delay and 5 s reverb; strings and strings2:
//   pad, inst=string-section, slow swells split into a low and a high track so chord entries
//   land a few ticks apart, middle register Bb2-F4; choir: lead2, inst=choir-aah, one long note
//   per chord in the middle third only; sub: bass, the style's soft sub, roots Bb1-F2, entering
//   late and leaving early. No music box, no Rhodes, no piano, no bells, no drums.
// Motif - three rising steps D4-Eb4-F4 (3-4-5 in Bb), about one note a bar, whole bars of
//   silence between phrases, a different ending each time (hold, step up, turn down, one leap
//   to C5, an octave-up answer at 57-60). Over Gm it starts G4-A4-Bb4, over Dm F4-G4-A4; the
//   Ebm shadow gets F4-Gb4-F4-Eb4.
// Arc - 1-8 strings alone, fading in; 9-24 the guitar enters; 25-44 the sub joins; 45-66 the
//   choir rises and the string voicings open up; 67-88 the one turn Bb-Gm-Eb-Ebm-Bb; 89-106
//   the choir and the sub leave; 107-120 the guitar leaves; 121-132 strings alone on the
//   opening Bbadd9, fading to silence so bar 132 leads into bar 1's swell with no bump.
// Harmony - one chord every 2-4 bars (a 6-bar tonic hold at the close), sus2 and add9 colour,
//   no four-chord loop. Voicings omit the tone that would smear a half step into the next
//   chord (Gm without its fifth before Eb, Dm without its ninth before Gm, the return Bb
//   without its fifth so the Ebm's Gb resolves cleanly). The one deliberate chromatic move is
//   the shadow itself: the strings' G3 falls to Gb3 in the same voice at bar 75.
//
// Built by its own script, from tools/arranger/lib.mjs. Everything musical is here: the chord
// spans and voicings, the guitar phrases, the choir's long notes, the sub's roots, the
// velocities, the microtiming and the fades. The song file is generated from it - never edited.
//   node tools/arranger/reading-room.mjs [outDir]
import {
  R, times, noteName, noteText, offsetText, durationText, splitDuration, chordText, barLength,
  formHeader, writeBlock, barMarks, outDir, saveSong, FLATS,
} from './lib.mjs';

const out = outDir();
const nm = (m) => noteName(m, FLATS);
const dur = (ticks) => durationText(ticks).slice(1);

// -------------------------------------------------------------------------------------- harmony
// One entry per chord span: [first bar, last bar, symbol]. 2-4 bars each, except the final
// 6-bar tonic hold that fades back into the loop.
const SPANS = [
  [1, 4, 'Bbadd9'], [5, 8, 'Ebadd9'], [9, 12, 'Bbadd9'], [13, 16, 'Gm'], [17, 20, 'Ebadd9'],
  [21, 24, 'Fsus2'], [25, 28, 'Bbadd9'], [29, 31, 'Cm'], [32, 34, 'Ebadd9'], [35, 36, 'Bbadd9'],
  [37, 40, 'Gm'], [41, 44, 'Fsus2'], [45, 48, 'Bbadd9'], [49, 52, 'Gm'], [53, 56, 'Ebadd9'],
  [57, 60, 'Bbadd9'], [61, 63, 'Fsus2'], [64, 66, 'Dm'], [67, 70, 'Gm'], [71, 74, 'Ebadd9'],
  [75, 78, 'Ebm'], [79, 82, 'Bbadd9'], [83, 86, 'Ebadd9'], [87, 88, 'Fsus2'], [89, 92, 'Bbadd9'],
  [93, 96, 'Cm'], [97, 99, 'Fsus2'], [100, 102, 'Dm'], [103, 106, 'Gm'], [107, 110, 'Fsus2'],
  [111, 114, 'Bbadd9'], [115, 118, 'Ebadd9'], [119, 122, 'Fsus2'], [123, 126, 'Ebadd9'],
  [127, 132, 'Bbadd9'],
];
const BARS = 132;
const chordAt = (bar) => SPANS.find(([a, b]) => bar >= a && bar <= b)[2];

// The string swells. `open` is the thin early voicing, `full` adds one tone on top from bar 45
// (the voicings open up with the choir) and thins back at bar 121 for the final fade. The first two voices go
// to the low track, the rest to the high track, so the two entries land a few ticks apart.
// Gm keeps no fifth (its D would smear into every following Eb), Dm keeps no ninth (its A
// would smear into Gm), the Eb before the shadow keeps no ninth (its F would smear into Gb),
// and the Bb that follows the shadow keeps no fifth (so the Gb resolves into open air).
const VOICING = {
  Bbadd9: { open: [46, 53, 60], full: [46, 53, 60, 65] },
  Ebadd9: { open: [39, 46, 53], full: [39, 46, 53, 55] },
  Gm: { open: [43, 46, 55], full: [43, 46, 55, 58] },
  Fsus2: { open: [41, 48, 55], full: [41, 48, 55, 60] },
  Cm: { open: [36, 43, 51], full: [36, 43, 51, 55] },
  Dm: { open: [38, 53, 62], full: [38, 53, 62, 65] },
  Ebm: { open: [39, 46, 54], full: [39, 46, 54] },
};
const voicingAt = (bar) => {
  const symbol = chordAt(bar);
  if (symbol === 'Ebadd9' && bar >= 71 && bar <= 74) return [39, 46, 55];
  if (symbol === 'Bbadd9' && bar >= 79 && bar <= 82) return [46, 58, 60];
  const era = bar >= 45 && bar <= 120 ? 'full' : 'open';
  return VOICING[symbol][era];
};

// The sub's root for each chord (it sounds at the written pitch; G1 is 49 Hz, above the 30 Hz
// floor). The soft sub swells in under the strings at bar 25 and leaves at bar 102.
const ROOT = { Bbadd9: 34, Ebadd9: 39, Gm: 31, Fsus2: 41, Cm: 36, Dm: 38, Ebm: 39 };

// ----------------------------------------------------------------------------------------- form
// The arc's phases, for the song's section marks. The chord spans cross some phase boundaries;
// the ties simply continue across them.
const PHASES = [
  [1, 8, 'Strings alone, swelling in'],
  [9, 24, 'The guitar enters'],
  [25, 44, 'The sub joins'],
  [45, 66, 'The choir rises; the voicings open'],
  [67, 88, 'The turn: Gm, Eb, Ebm, home'],
  [89, 106, 'The choir and the sub leave'],
  [107, 120, 'The guitar leaves'],
  [121, 132, 'Strings alone, fading to the loop'],
];
const FORM = PHASES.map(([a, b, name]) => ({
  name, bars: times(b - a + 1, (i) => chordAt(a + i)).join(' '),
}));
const header = formHeader(FORM);

// ---------------------------------------------------------------------------- the string swells
// One tied note per voice per chord span. The low track enters on or a few ticks after the
// beat, the high track 10-20 ticks later, so a chord blooms instead of landing. Velocities
// uneven, cycling through a fixed pattern so the file regenerates byte-identical.
const LOW_VEL = [65, 57, 68, 54, 62, 70, 53, 64];
const HIGH_VEL = [61, 53, 64, 50, 58, 66, 49, 60];
const LOW_OFF = [0, 4, 2, 6, 3, 5];
const HIGH_OFF = [14, 18, 12, 20, 16, 10];
const stringBars = (which) => {
  const bars = times(BARS, () => R);
  SPANS.forEach(([a, b], i) => {
    const pitches = voicingAt(a);
    const voices = which === 'low' ? pitches.slice(0, 2) : pitches.slice(2);
    if (!voices.length) return;
    const vel = (which === 'low' ? LOW_VEL : HIGH_VEL)[i % 8];
    const off = (which === 'low' ? LOW_OFF : HIGH_OFF)[i % 6];
    const name = chordText(voices, nm);
    for (let bar = a; bar <= b; bar += 1) {
      bars[bar - 1] = bar === a ? `${name}/1${offsetText(off)}:${vel}~`
        : bar === b ? `${name}/1` : `${name}/1~`;
    }
  });
  return bars;
};

// ---------------------------------------------------------------------------------- the guitar
// The motif and its phrases: [bar, midi, ticks, offset, velocity]. One note a bar on average,
// whole bars of silence between phrases. Every note is written a sixteenth into its bar and
// sounds 8-20 ticks later still, so the guitar floats in behind the beat and its 9ths, 11ths
// and 6ths are off-beat colour, never on-beat chord statements. Velocities uneven, settling
// softer as the piece lets go. D4=62 Eb4=63 F4=65 Gb4=66 G4=67 A4=69 Bb4=70 C5=72 D5=74
// Eb5=75 F5=77.
const PHRASES = [
  // D-Eb-F, the F held (bars 9-12, Bb)
  [[9, 62, 2880, 12, 64], [10, 63, 1920, 16, 58], [11, 65, 2880, 10, 70]],
  // G-A-Bb, stepping back down to A (13-16, Gm)
  [[13, 67, 2880, 14, 60], [14, 69, 1920, 18, 55], [15, 70, 2880, 8, 68], [16, 69, 960, 12, 52]],
  // D-Eb-F, the one leap up to C5 (17-20, Eb)
  [[17, 62, 2880, 10, 58], [18, 63, 1920, 14, 62], [19, 65, 2880, 16, 66], [20, 72, 1920, 12, 72]],
  // D-Eb-F, turning down Eb-D (21-24, F)
  [[21, 62, 2880, 16, 60], [22, 63, 1920, 10, 56], [23, 65, 2880, 14, 64],
    [24, 63, 960, 16, 50], [24, 62, 960, 10, 46]],
  // D-Eb-F held, after a bar of silence for the sub's entry (26-28, Bb)
  [[26, 62, 2880, 14, 62], [27, 63, 1920, 10, 58], [28, 65, 2880, 16, 68]],
  // a two-note answer Eb-F (30-31, Cm)
  [[30, 63, 2880, 12, 60], [31, 65, 1920, 16, 64]],
  // G-F-Eb, descending (32-34, Eb)
  [[32, 67, 2880, 10, 66], [33, 65, 1920, 14, 58], [34, 63, 2880, 18, 54]],
  // F-G (35-36, Bb)
  [[35, 65, 2880, 12, 62], [36, 67, 1920, 16, 58]],
  // A-Bb-A-G, an arch (37-40, Gm)
  [[37, 69, 2880, 10, 64], [38, 70, 1920, 14, 70], [39, 69, 2880, 16, 60], [40, 67, 1920, 12, 56]],
  // D-Eb-F (42-44, F)
  [[42, 62, 2880, 14, 58], [43, 63, 1920, 10, 54], [44, 65, 2880, 16, 62]],
  // F-G-A, rising with the choir (46-48, Bb)
  [[46, 65, 2880, 12, 66], [47, 67, 1920, 16, 62], [48, 69, 2880, 10, 70]],
  // G-A-Bb-C, ending up (49-52, Gm)
  [[49, 67, 2880, 14, 60], [50, 69, 1920, 18, 56], [51, 70, 2880, 12, 68], [52, 72, 1920, 10, 64]],
  // D-Eb-F (54-56, Eb)
  [[54, 62, 2880, 16, 58], [55, 63, 1920, 12, 54], [56, 65, 2880, 14, 62]],
  // the motif an octave up, the gentle peak, stepping back down (57-60, Bb)
  [[57, 74, 2880, 10, 54], [58, 75, 1920, 14, 50], [59, 77, 2880, 16, 56], [60, 75, 1920, 12, 46]],
  // Eb-F (62-63, F)
  [[62, 63, 2880, 12, 58], [63, 65, 1920, 16, 62]],
  // F-G-A (64-66, Dm)
  [[64, 65, 2880, 14, 60], [65, 67, 1920, 10, 56], [66, 69, 2880, 16, 64]],
  // Bb-A-G, the turn's sigh (67-69, Gm)
  [[67, 70, 2880, 12, 62], [68, 69, 1920, 16, 58], [69, 67, 2880, 10, 54]],
  // Eb-F-G (72-74, Eb)
  [[72, 63, 2880, 14, 52], [73, 65, 1920, 12, 56], [74, 67, 2880, 16, 58]],
  // F-Gb-F-Eb, the shadow, the softest phrase (75-78, Ebm)
  [[75, 65, 2880, 10, 58], [76, 66, 1920, 14, 54], [77, 65, 2880, 16, 50], [78, 63, 2880, 12, 46]],
  // D-Eb-F held, home (80-82, Bb)
  [[80, 62, 2880, 14, 60], [81, 63, 1920, 10, 56], [82, 65, 2880, 16, 64]],
  // G-F-Eb (83-85, Eb)
  [[83, 67, 2880, 12, 58], [84, 65, 1920, 16, 54], [85, 63, 2880, 10, 50]],
  // D-Eb (87-88, F)
  [[87, 62, 2880, 14, 56], [88, 63, 1920, 12, 52]],
  // F-Eb-D, descending home (90-92, Bb)
  [[90, 65, 2880, 16, 60], [91, 63, 1920, 10, 54], [92, 62, 2880, 14, 50]],
  // Eb-F-G (93-95, Cm)
  [[93, 63, 2880, 12, 56], [94, 65, 1920, 16, 52], [95, 67, 2880, 10, 58]],
  // D-Eb (98-99, F)
  [[98, 62, 2880, 14, 56], [99, 63, 1920, 12, 52]],
  // F-G-F (100-102, Dm)
  [[100, 65, 2880, 16, 58], [101, 67, 1920, 10, 54], [102, 65, 2880, 14, 50]],
  // G-A-Bb (104-106, Gm)
  [[104, 67, 2880, 12, 56], [105, 69, 1920, 16, 52], [106, 70, 2880, 10, 58]],
  // D-Eb-F (107-109, F)
  [[107, 62, 2880, 14, 54], [108, 63, 1920, 12, 50], [109, 65, 2880, 16, 56]],
  // the last motif, fading (111-113, Bb)
  [[111, 62, 2880, 10, 52], [112, 63, 1920, 14, 48], [113, 65, 2880, 16, 54]],
  // one last D, left to ring (115, Eb)
  [[115, 62, 2880, 12, 48]],
];
const guitarBars = () => {
  const bars = times(BARS, () => R);
  const byBar = new Map();
  for (const phrase of PHRASES) {
    for (const [bar, midi, ticks, off, vel] of phrase) {
      if (!byBar.has(bar)) byBar.set(bar, []);
      byBar.get(bar).push([midi, ticks, off, vel]);
    }
  }
  for (const [bar, notes] of byBar) {
    let used = 240;
    const tokens = ['r/16', ...notes.map(([midi, ticks, off, vel]) => {
      used += ticks;
      return noteText(nm(midi), dur(ticks), vel, off);
    })];
    if (used > 3840) throw new Error(`guitar bar ${bar} overflows`);
    for (const d of splitDuration(3840 - used)) tokens.push(`r${d}`);
    bars[bar - 1] = tokens.join(' ');
  }
  return bars;
};

// ----------------------------------------------------------------------------------- the choir
// One long note per chord span, bars 45-88 only, around and just above the strings: chord
// tones, stepwise or common-tone from one to the next (the leaps are the dip to C4 at 61 and
// the shadow's Gb). [first bar, last bar, midi]. C4=60 D4=62 Eb4=63 F4=65 Gb4=66.
// [first bar, last bar, midi, velocity]: the shadow's Gb is the choir's quietest note.
const CHOIR = [
  [45, 48, 62, 50], [49, 52, 62, 46], [53, 56, 63, 54], [57, 60, 65, 46],
  [61, 63, 60, 52], [64, 66, 62, 44], [67, 70, 62, 48], [71, 74, 63, 46],
  [75, 78, 66, 42], [79, 82, 65, 50], [83, 86, 63, 46], [87, 88, 65, 42],
];
const CHOIR_OFF = [10, 16, 8, 14, 12, 18];
const choirBars = () => {
  const bars = times(BARS, () => R);
  CHOIR.forEach(([a, b, midi, vel], i) => {
    const name = nm(midi);
    const off = CHOIR_OFF[i % 6];
    for (let bar = a; bar <= b; bar += 1) {
      bars[bar - 1] = bar === a ? noteText(name, '1', vel, off) + '~'
        : bar === b ? `${name}/1` : `${name}/1~`;
    }
  });
  return bars;
};

// ------------------------------------------------------------------------------------- the sub
// The chord's root, one tied note per span, bars 25-102: in late, out early.
const SUB_VEL = [57, 49, 62, 52, 59, 47];
const SUB_OFF = [0, 6, 3, 8, 2, 5];
const subBars = () => {
  const bars = times(BARS, () => R);
  let i = 0;
  for (const [a, b, symbol] of SPANS) {
    if (a < 25 || b > 102) continue;
    const name = nm(ROOT[symbol]);
    const vel = SUB_VEL[i % 6];
    const off = SUB_OFF[i % 6];
    i += 1;
    for (let bar = a; bar <= b; bar += 1) {
      bars[bar - 1] = bar === a ? noteText(name, '1', vel, off) + '~'
        : bar === b ? `${name}/1` : `${name}/1~`;
    }
  }
  return bars;
};

// ------------------------------------------------------------------------------------ assemble
const tracks = [
  { id: 'guitar', head: 'role=lead inst=shimmer-guitar vol=0.8 pan=0.2 vol@9-14=0..1 vol@115-120=1..0',
    bars: guitarBars() },
  { id: 'strings', head: 'role=pad inst=string-section vol=0.9 pan=-0.08 vol@1-8=0..1 vol@125-132=1..0',
    bars: stringBars('low') },
  { id: 'strings2', head: 'role=pad inst=string-section vol=0.9 pan=0.08 vol@1-8=0..1 vol@125-132=1..0',
    bars: stringBars('high') },
  { id: 'choir', head: 'role=lead2 inst=choir-aah vol=0.5 pan=-0.15 vol@45-52=0..1 vol@83-90=1..0',
    bars: choirBars() },
  { id: 'sub', head: 'role=bass vol=0.1 pan=0 vol@25-30=0..1 vol@97-104=1..0',
    bars: subBars() },
];
// Every bar of every track must be exactly one 4/4 bar.
for (const t of tracks) {
  t.bars.forEach((bar, i) => {
    const got = barLength(bar);
    if (got !== 3840) throw new Error(`${t.id} bar ${i + 1} is ${got} ticks: ${bar}`);
  });
}
const marks = barMarks(PHASES.map(([a, , name], i) => [a, header.formLines[i].slice(2)]));

const comment = [
  '# Reading Room, by Qwen 4-Max & SZ. An original beatless ambient piece for the Ambient style,',
  '# in the spirit of Music for Airports and Hammock: warm, slow, quiet study music. 66 BPM in',
  '# Bb major, 132 bars, 8:00. Lineup: a shimmer-guitar lead (single notes left to ring into the',
  "# style's delay and reverb), string-section swells split low/high so entries bloom a few ticks",
  '# apart, a wordless aah choir on long notes in the middle third, and the soft sub under it all.',
  '# Motif: three rising steps D-Eb-F, about one note a bar, whole bars of silence between',
  '# phrases, a different ending each time. Arc: strings alone 1-8, guitar in 9-24, sub in',
  '# 25-44, choir and open voicings 45-66, the one turn Bb-Gm-Eb-Ebm-Bb 67-88, choir and sub out',
  '# 89-106, guitar out 107-120, strings alone on the opening Bbadd9 fading to silence 121-132.',
  '# Made to loop: the fade-out mirrors the fade-in, so bar 132 leads into bar 1 with no bump.',
  '# The one deliberate chromatic move is the shadow: the strings\' G3 falls to Gb3 in the same',
  '# voice at bar 75, and the return Bb keeps no fifth so the Gb resolves into open air.',
  '# Built by its own script, tools/arranger/reading-room.mjs, from tools/arranger/lib.mjs.',
];
const meta = [
  'title: Reading Room',
  'composer: Qwen 4-Max & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: ambient',
  'key: Bb major',
  'tempo: 66',
  'time: 4/4',
  'about: A quiet reading room: one guitar left to ring over slow string swells, a wordless choir rising through the middle, and a single shadow passing at the turn. Loops cleanly; turn on repeat for endless play.',
];
const text = [
  ...comment,
  ...header.chordLines,
  ...header.formLines,
  ...meta,
  '# balance-ok @41-48 choir: the choir is still fading in (vol@45-52), deliberately under the',
  '# guitar until it arrives',
  '',
  ...tracks.flatMap((t) => [`track ${t.id} ${t.head}`, writeBlock(t.bars, marks, { collapseRests: true }), '']),
].join('\n');
console.log(saveSong(out, 'reading-room.song', text));
