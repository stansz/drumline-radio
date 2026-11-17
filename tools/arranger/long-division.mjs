// Long Division, an original pulse-ambient piece by MiMo v2.6 Flash & SZ for the Ambient style:
// 92 BPM in 5/4 in F# Dorian, 112 bars, 6:05. Two plucked patterns phase against each other - a
// concert-harp cell of seven eighths turning against the bar's ten, a nylon-guitar figure fixed on
// the grid - over a plucked string bass locked to a soft heartbeat kick, a tape pad, a solo cello
// theme that enters late and the concert flute answering it. The harmony moves to D Lydian for the
// bloom (the mode's D sharp becomes D natural), drops the beat for a break, brings the theme back
// in full and dissolves back to the one pattern it opened with.
//
// Built by its own script, from tools/arranger/lib.mjs. Everything musical is here: the harmony
// tables (each chord's pad voicing, bass root, guitar figure, harp cell and the notes that may
// sound against them), the pattern cells, the theme and its answers, the velocities, the
// microtiming and the form. The song file is generated from it - never edited.
//   node tools/arranger/long-division.mjs [outDir]
import {
  clampVelocity, chordText, formHeader, noteName, noteText, offsetText, outDir, R, saveSong,
  sectionBuilder, splitDuration, times,
} from './lib.mjs';

const out = outDir();

// -------------------------------------------------------------------------------------------- text
const nm = (m) => noteName(m);
const cap = (v) => clampVelocity(v, 122);
// `fn(bar, i)` for `count` bars starting at `from`.
const bars = (from, count, fn) => times(count, (i) => fn(from + i, i));
// A part's bars placed inside one 8-bar section, resting before and after.
const place = (list, start, total = 8) => {
  if (start + list.length > total) throw new Error(`section overflow: ${start} + ${list.length}`);
  return [...times(start, () => R), ...list, ...times(total - start - list.length, () => R)];
};

// --------------------------------------------------------------------------------------- harmony
// One entry per chord symbol the song uses. `pad` is the tape pad's open voicing in the middle of
// the keyboard (root and fifth, or root and third where the fifth would fight the colour note the
// bloom wants), `bass` the root the plucked bass writes (it sounds an octave lower), `guitar` the
// three tones the nylon figure walks, `harp` the five tones the harp cell picks from, low to high.
// `on` are the pitch classes that may start on a beat (the chord's own tones, so the off-chord
// report stays at zero) and `safe` every pitch class that may sound at all: a whole step clear of
// the pad and the bass, so the half-step clash report stays at zero too.
const CHORD = {
  // F# Dorian: F# G# A B C# D# E. Half steps in it are G#-A, D#-E and C#-D#.
  'F#m7': {
    pad: [54, 61, 66], bass: 54, guitar: [57, 61, 66], harp: [66, 69, 73, 78, 81],
    on: [1, 4, 6, 9], safe: [1, 3, 4, 6, 8, 9, 11],
  },
  'Eadd9': {
    pad: [52, 59, 64], bass: 52, guitar: [59, 64, 68], harp: [64, 68, 71, 76, 80],
    on: [4, 6, 8, 11], safe: [1, 4, 6, 8, 9, 11],
  },
  'A6': {
    pad: [52, 57, 64], bass: 45, guitar: [57, 61, 64], harp: [64, 69, 73, 76, 81],
    on: [1, 4, 6, 9], safe: [1, 4, 6, 9, 11],
  },
  'B6': {
    pad: [54, 59, 63], bass: 47, guitar: [59, 63, 66], harp: [63, 66, 71, 75, 78],
    on: [3, 6, 8, 11], safe: [1, 3, 6, 8, 9, 11],
  },
  // The bloom: D Lydian, D E F# G# A B C#, so G# is the colour note over D. The pad drops its
  // fifth for the third, because an A there would be a half step under every G#.
  'D6': {
    pad: [50, 54, 62], bass: 50, guitar: [62, 66, 69], harp: [62, 66, 69, 74, 78],
    on: [2, 6, 9, 11], safe: [2, 4, 6, 8, 9, 11],
  },
  'Bm': {
    pad: [54, 59, 62], bass: 47, guitar: [59, 62, 66], harp: [62, 66, 71, 74, 78],
    on: [2, 6, 11], safe: [2, 4, 6, 8, 9, 11],
  },
};

// -------------------------------------------------------------------------------------------- form
// One section every eight bars, each with its own chord pair, so the form changes something at
// every eight-bar mark. formHeader turns it into the song's `# chords:` and `# start-end:` lines.
const FORM = [
  { name: 'One pattern alone: the harp cell, seven eighths against the bar',
    bars: 'F#m7 F#m7 F#m7 F#m7 F#m7 F#m7 F#m7 F#m7' },
  { name: 'The nylon guitar joins with its four hits on the grid',
    bars: 'F#m7 F#m7 F#m7 F#m7 Eadd9 Eadd9 Eadd9 Eadd9' },
  { name: 'The plucked bass and the soft heartbeat kick',
    bars: 'A6 A6 A6 A6 B6 B6 B6 B6' },
  { name: 'The tape pad swells in under everything',
    bars: 'F#m7 F#m7 F#m7 F#m7 Eadd9 Eadd9 Eadd9 Eadd9' },
  { name: 'The cello theme, entering late',
    bars: 'F#m7 F#m7 F#m7 F#m7 Eadd9 Eadd9 Eadd9 Eadd9' },
  { name: 'The flute answers, then the cello answers back',
    bars: 'A6 A6 A6 A6 B6 B6 B6 B6' },
  { name: 'Dialogue: the cello first half, the flute second half',
    bars: 'F#m7 F#m7 F#m7 F#m7 Eadd9 Eadd9 Eadd9 Eadd9' },
  { name: 'Build: the cello climbs, the flute joins above it',
    bars: 'A6 A6 A6 A6 Eadd9 Eadd9 Eadd9 Eadd9' },
  { name: 'Bloom: the shift to D Lydian, D sharp becomes D natural',
    bars: 'D6 D6 D6 D6 A6 A6 A6 A6' },
  { name: 'Bloom peak: the cello rises, the flute takes the top',
    bars: 'D6 D6 D6 D6 Eadd9 Eadd9 Eadd9 Eadd9' },
  { name: 'Break: no kick, no bass, no pad - the cello alone with the patterns',
    bars: 'Bm Bm Bm Bm Eadd9 Eadd9 Eadd9 Eadd9' },
  { name: 'The full theme, the flute in counterpoint',
    bars: 'F#m7 F#m7 F#m7 F#m7 Eadd9 Eadd9 Eadd9 Eadd9' },
  { name: 'The last statement, the flute high above',
    bars: 'A6 A6 A6 A6 B6 B6 B6 B6' },
  { name: 'Dissolve: the layers leave one by one, back to the one pattern',
    bars: 'F#m7 F#m7 F#m7 F#m7 F#m7 F#m7 F#m7 F#m7' },
];
const HEAD = formHeader(FORM);
const TOTAL = HEAD.chords.length;
if (TOTAL !== 112) throw new Error(`the form is ${TOTAL} bars, wanted 112`);
const at = HEAD.at;
// Every chord lasts four bars, so the pad and the bass can end exactly where the chord changes.
const boundary = (bar) => (bar - 1) % 4 === 0;

// ------------------------------------------------------------------------------------ the feel
// The patterns stay tight on the grid - no offsets at all - so the phasing between the harp's
// seven-eighth cell and the bar's ten stays audible. The cello, the flute and the kick lean in
// late, a few ticks at a time, and never late by the same amount twice; a note that starts on a
// chord change is always late, never early, so it can never sound under the chord before it.
const LEAN = [14, 19, 11, 23, 16, 9, 21, 13, 17, 12, 8, 20];
const SWAY = [9, -7, 15, -5, 12, 18, -9, 6, -4, 14, -6, 11];
const KICK_LEAN = [9, 13, 6, 15, 11, 7, 14, 10];
const BASS_LEAN = [7, 11, 5, 12, 9, 6];
const offsetFor = (bar, index) => {
  const table = index === 0 ? LEAN : SWAY;
  const off = table[(bar * 5 + index * 3) % table.length];
  return boundary(bar) && off < 0 ? -off + 6 : off;
};
// The velocities below are written as shapes; LIFT brings the whole song up to the level the rest
// of the library sits at without changing the balance between the parts, because it is added to
// every part alike.
const LIFT = 12;
// Long notes carry the line, so they read louder; no two notes in a bar land on the same level.
const velFor = (beats, bar, index) =>
  (beats >= 2 ? 6 : beats >= 1 ? 2 : -3) + ((bar + index * 3) % 4) * 3 - 4;

// ----------------------------------------------------------------------------------- phrases
// One phrase bar as song text. An event is [midi, beats] with 's' when the note ties into the next
// bar, 'c' when it continues the previous bar's tie, and `null` for a rest. Every note that starts
// on a beat must be a chord tone of its bar and every note must be a half step clear of the pad
// and the bass, so the phrase is checked as it is written instead of after the fact.
function phraseBar(events, chord, bar, previous, base) {
  const table = CHORD[chord];
  const total = events.reduce((sum, ev) => sum + ev[1], 0);
  if (total !== 5) throw new Error(`bar ${bar}: the phrase is ${total} beats, wanted 5`);
  if (events.every((ev) => ev[0] === null)) return R;
  let beat = 0;
  const parts = [];
  for (let i = 0; i < events.length; i += 1) {
    const [pitch, beats, kind] = events[i];
    const tokens = splitDuration(Math.round(beats * 960));
    if (pitch === null) {
      if (kind) throw new Error(`bar ${bar}: a rest cannot tie`);
      parts.push(tokens.map((d) => `r${d}`).join(' '));
      beat += beats;
      continue;
    }
    const pc = ((pitch % 12) + 12) % 12;
    if (kind === 'c') {
      if (previous !== pitch) {
        throw new Error(`bar ${bar}: a tie continues ${previous === null ? 'nothing' : nm(previous)}, not ${nm(pitch)}`);
      }
    } else {
      if (Number.isInteger(beat) && !table.on.includes(pc)) {
        throw new Error(`bar ${bar} beat ${beat}: ${nm(pitch)} is not a chord tone of ${chord}`);
      }
      if (!table.safe.includes(pc)) {
        throw new Error(`bar ${bar} beat ${beat}: ${nm(pitch)} clashes with the pad or bass of ${chord}`);
      }
    }
    parts.push(tokens.map((d, j) => {
      let text = `${nm(pitch)}${d}`;
      if (j === 0 && kind !== 'c') {
        text += offsetText(offsetFor(bar, i)) + ':' + cap(base + LIFT + velFor(beats, bar, i));
      }
      if (j < tokens.length - 1 || kind === 's') text += '~';
      return text;
    }).join(' '));
    beat += beats;
  }
  return parts.join(' ');
}

// A whole phrase: its bars, each checked against its own bar's chord, carrying the tie across.
function phrase(list, from, base) {
  let previous = null;
  return list.map((events, i) => {
    const text = phraseBar(events, at(from + i), from + i, previous, base);
    const last = events[events.length - 1];
    previous = last[0] !== null && last[2] === 's' ? last[0] : null;
    return text;
  });
}

// ------------------------------------------------------------------------------- the patterns
// The harp: ten eighths a bar, but a cell of seven, so its accent walks across the beat and meets
// it again every seven bars - 112 bars is exactly 160 cells, so the pattern ends where it began.
const SHAPE = { low: [0, 1, 2, 1, 0, 1, 2], high: [1, 2, 3, 2, 1, 2, 3] };
const WOB = [0, -5, 4, -2, 6, -7, 2];
const MASK_FULL = [1, 1, 1, 1, 1, 1, 1];
const MASK_THIN = [1, 0, 1, 1, 0, 1, 0];
function harpBar(bar, chord, shape, mask, base) {
  const tones = CHORD[chord].harp;
  const first = ((bar - 1) * 10) % 7;
  return times(10, (slot) => {
    const cell = (first + slot) % 7;
    if (!mask[cell]) return 'r/8';
    const velocity = cap(base + LIFT + (cell === 0 ? 16 : 0) + WOB[cell] + ((bar + slot) % 3) * 2);
    return noteText(nm(tones[SHAPE[shape][cell]]), '8', velocity);
  }).join(' ');
}

// The nylon guitar: four hits a bar, 3 + 3 + 2 + 2 eighths, the shape that never moves.
const GUITAR_HIT = { 0: 0, 3: 1, 6: 2, 8: 1 };
const GUITAR_ACC = { 0: 14, 3: 0, 6: 8, 8: -6 };
function guitarBar(chord, base, bar) {
  const tones = CHORD[chord].guitar;
  return times(10, (slot) => {
    const which = GUITAR_HIT[slot];
    if (which === undefined) return 'r/8';
    const velocity = cap(base + LIFT + GUITAR_ACC[slot] + ((bar * 2 + slot) % 5) * 2 - 4);
    return noteText(nm(tones[which]), '8', velocity);
  }).join(' ');
}

// The plucked bass: the root on beat one and on beat four, where the kick lands, and nowhere else.
function bassBar(chord, base, bar) {
  const root = CHORD[chord].bass;
  const first = cap(base + LIFT + ((bar * 2) % 4) * 3);
  const second = cap(base + LIFT - 5 + ((bar + 1) % 4) * 3);
  return [
    noteText(nm(root), '2', first, BASS_LEAN[(bar * 3) % BASS_LEAN.length]),
    'r/8 r/8',
    noteText(nm(root), '4', second, BASS_LEAN[(bar * 3 + 5) % BASS_LEAN.length]),
    'r/8 r/8',
  ].join(' ');
}

// The dusty kit as a heartbeat: two hits a bar on beats one and four, a third soft one on the
// off-beat while the song builds, and a ghost between them at the full theme.
const KICK_VEL = { two: [66, 76], three: [66, 74, 58], ghost: [68, 72, 52] };
function kitBar(kind, bar) {
  const hit = (i) => noteText(
    'k', '8', cap(KICK_VEL[kind][i] + LIFT + ((bar + i * 2) % 4) * 3 - 4),
    KICK_LEAN[(bar * 3 + i * 7) % KICK_LEAN.length],
  );
  if (kind === 'three') return `${hit(0)} r/2 r/8 ${hit(1)} r/8 ${hit(2)} r/8`;
  if (kind === 'ghost') return `${hit(0)} r/4 ${hit(2)} r/4 ${hit(1)} r/4 r/8`;
  return `${hit(0)} r/2 r/8 ${hit(1)} r/4 r/8`;
}

// The tape pad: one open voicing held across a four-bar chord, written so that it ends exactly
// where the chord changes and the next one starts there, so no note of a new chord is ever heard
// under the old pad. Only the first note of the chain carries the offset and the velocity.
function padRegion(pitches, count, base) {
  const chord = chordText(pitches, nm);
  return times(count, (i) => {
    const last = i === count - 1;
    const head = i === 0 ? `${chord}/1+8:${cap(base + LIFT)}~` : `${chord}/1~`;
    return `${head} ${chord}/4${last ? '' : '~'}`;
  });
}

// --------------------------------------------------------------------------- the rhythm section
// The layers that build under the theme: the pattern, the guitar, the bass, the kick and the pad,
// each block picking its own shape and level. Parts a block leaves out simply rest.
function groove(from, options) {
  const {
    shape = 'low', mask = MASK_FULL, harp = 62, guitar = 62, bass = 58, kit = null, pad = null,
  } = options;
  const parts = {
    harp: bars(from, 8, (bar) => harpBar(bar, at(bar), shape, mask, harp)),
    guitar: bars(from, 8, (bar) => guitarBar(at(bar), guitar, bar)),
  };
  if (bass !== null) parts.bass = bars(from, 8, (bar) => bassBar(at(bar), bass, bar));
  if (kit !== null) parts.kit = bars(from, 8, (bar) => kitBar(kit, bar));
  if (pad !== null) {
    parts.pad = [
      ...padRegion(CHORD[at(from)].pad, 4, pad),
      ...padRegion(CHORD[at(from + 4)].pad, 4, pad),
    ];
  }
  return parts;
}

// ------------------------------------------------------------------------------- the cello
// The theme: a long note, one passing eighth on the off-beat, then the landing, over and over. It
// starts on C#4 and climbs to G#4, falls to A3 and rises again over E; the full statement runs the
// same shape up to E5.
const THEME = [
  [[61, 1.5], [63, 0.5], [66, 3, 's']], //             33 F#m7: C#4  D#4  F#4-
  [[66, 1.5, 'c'], [64, 0.5], [61, 2], [null, 1]], //  34       F#4- E4   C#4
  [[57, 1.5], [56, 0.5], [54, 3, 's']], //             35       A3   G#3  F#3-
  [[54, 2, 'c'], [null, 3]], //                        36       F#3- rest
  [[59, 1.5], [61, 0.5], [64, 3]], //                  37 Eadd9: B3   C#4  E4
  [[66, 1.5], [68, 0.5], [71, 3, 's']], //             38       F#4  G#4  B4-
  [[71, 1.5, 'c'], [73, 0.5], [71, 2], [68, 1]], //    39       B4-  C#5  B4   G#4
  [[66, 2], [64, 2], [null, 1]], //                    40       F#4  E4   rest
];
// The cello's answer to the flute, over B major (the dorian IV).
const CELLO_ANSWER = [
  [[66, 1.5], [68, 0.5], [71, 3, 's']], //             45 B6: F#4  G#4  B4-
  [[71, 1.5, 'c'], [68, 0.5], [66, 2], [63, 1]], //    46      B4-  G#4  F#4  D#4
  [[66, 2], [63, 2], [null, 1]], //                    47      F#4  D#4  rest
];
// The second phrase: the same cell a third higher, then the motif again.
const CELLO_SECOND = [
  [[64, 1.5], [66, 0.5], [69, 3, 's']], //             49 F#m7: E4   F#4  A4-
  [[69, 1.5, 'c'], [68, 0.5], [66, 2], [64, 1]], //    50       A4-  G#4  F#4  E4
  [[61, 1.5], [63, 0.5], [66, 3, 's']], //             51       C#4  D#4  F#4-
  [[66, 2, 'c'], [64, 2], [null, 1]], //               52       F#4- E4   rest
];
// The build: the line climbs to C#5 and E5 while the flute joins above it.
const CELLO_BUILD = [
  [[69, 1.5], [71, 0.5], [73, 3, 's']], //             57 A6: A4   B4   C#5-
  [[73, 1.5, 'c'], [71, 0.5], [69, 2], [66, 1]], //    58      C#5- B4   A4   F#4
  [[64, 1.5], [66, 0.5], [69, 2], [73, 1]], //         59      E4   F#4  A4   C#5
  [[73, 2], [76, 2], [null, 1]], //                    60      C#5  E5   rest
  [[71, 1.5], [73, 0.5], [76, 3, 's']], //             61 Eadd9: B4   C#5  E5-
  [[76, 1.5, 'c'], [73, 0.5], [71, 2], [68, 1]], //    62       E5-  C#5  B4   G#4
  [[68, 1.5], [71, 0.5], [76, 2], [null, 1]], //       63       G#4  B4   E5   rest
  [[76, 5]], //                                       64       E5 held
];
// The bloom: the tonic arrives as D natural and the motif is rewritten on it.
const CELLO_BLOOM = [
  [[74, 3], [null, 2]], //                             65 D6: D5   rest
  [[74, 1.5], [76, 0.5], [74, 2], [71, 1]], //         66      D5   E5   D5   B4
  [[69, 1.5], [71, 0.5], [74, 3]], //                  67      A4   B4   D5
  [[74, 1.5], [71, 0.5], [69, 2], [66, 1]], //         68      D5   B4   A4   F#4
  [[69, 1.5], [73, 0.5], [76, 3, 's']], //             69 A6: A4   C#5  E5-
  [[76, 1.5, 'c'], [73, 0.5], [69, 2], [66, 1]], //    70      E5-  C#5  A4   F#4
  [[64, 1.5], [66, 0.5], [69, 2], [73, 1]], //         71      E4   F#4  A4   C#5
  [[73, 3], [null, 2]], //                             72      C#5  rest
];
// The cello's last bloom phrase, with the lydian G# on its way up.
const CELLO_BLOOM_PEAK = [
  [[66, 1.5], [68, 0.5], [71, 2], [74, 1]], //         73 D6: F#4  G#4  B4   D5
  [[74, 1.5], [76, 0.5], [74, 2], [71, 1]], //         74      D5   E5   D5   B4
  [[69, 1.5], [71, 0.5], [74, 3]], //                  75      A4   B4   D5
  [[74, 1.5], [71, 0.5], [69, 2], [null, 1]], //       76      D5   B4   A4   rest
];
// The break: the beat is gone, so the cello comes down to the low strings and sits.
const CELLO_BREAK = [
  [[66, 1.5], [64, 0.5], [62, 3]], //                  81 Bm: F#4  E4   D4
  [[62, 2], [null, 3]], //                             82      D4   rest
  [[null, 5]], //                                      83      rest
  [[59, 1.5], [62, 0.5], [66, 3, 's']], //             84      B3   D4   F#4-
  [[66, 1.5, 'c'], [64, 0.5], [68, 2], [null, 1]], //  85 Eadd9: F#4- E4   G#4  rest
  [[68, 1.5], [66, 0.5], [64, 3]], //                  86      G#4  F#4  E4
  [[64, 2], [null, 3]], //                             87      E4   rest
  [[null, 4], [59, 1]], //                             88      rest      B3 (pickup)
];
// The full theme: the same eight bars, the gaps filled and the answer up at E5.
const CELLO_FULL = [
  [[61, 1.5], [63, 0.5], [66, 3, 's']], //             89 F#m7: C#4  D#4  F#4-
  [[66, 1.5, 'c'], [64, 0.5], [61, 2], [57, 1]], //    90       F#4- E4   C#4  A3
  [[57, 1.5], [56, 0.5], [54, 3, 's']], //             91       A3   G#3  F#3-
  [[54, 2, 'c'], [null, 1], [61, 2]], //               92       F#3- rest C#4
  [[64, 1.5], [66, 0.5], [68, 2], [71, 1]], //         93 Eadd9: E4   F#4  G#4  B4
  [[71, 1.5], [73, 0.5], [76, 3, 's']], //             94       B4   C#5  E5-
  [[76, 1.5, 'c'], [73, 0.5], [71, 2], [68, 1]], //    95       E5-  C#5  B4   G#4
  [[66, 2], [64, 2], [null, 1]], //                    96       F#4  E4   rest
];
// The last statement, over A and B.
const CELLO_LAST = [
  [[69, 1.5], [71, 0.5], [73, 2], [76, 1, 's']], //    97 A6: A4   B4   C#5  E5-
  [[76, 1.5, 'c'], [73, 0.5], [69, 2], [66, 1]], //    98      E5-  C#5  A4   F#4
  [[64, 1.5], [66, 0.5], [69, 2], [73, 1]], //         99      E4   F#4  A4   C#5
  [[73, 3], [null, 2]], //                             100     C#5  rest
  [[66, 1.5], [68, 0.5], [71, 3, 's']], //             101 B6: F#4  G#4  B4-
  [[71, 1.5, 'c'], [68, 0.5], [66, 2], [63, 1]], //    102     B4-  G#4  F#4  D#4
  [[63, 1.5], [66, 0.5], [71, 2], [null, 1]], //       103     D#4  F#4  B4   rest
  [[null, 5]], //                                     104     rest
];
// The cello's last phrase, the motif one more time before it lets go.
const CELLO_END = [
  [[61, 1.5], [63, 0.5], [66, 3, 's']], //             105 F#m7: C#4  D#4  F#4-
  [[66, 2, 'c'], [null, 3]], //                        106      F#4- rest
];

// ------------------------------------------------------------------------------- the flute
// The flute answers where the cello rests, an octave above the same shape.
const FLUTE_FIRST = [
  [[73, 1.5], [76, 0.5], [78, 3, 's']], //             41 A6: C#5  E5   F#5-
  [[78, 1.5, 'c'], [76, 0.5], [73, 2], [null, 1]], //  42      F#5- E5   C#5  rest
  [[76, 1.5], [78, 0.5], [76, 2], [73, 1]], //         43      E5   F#5  E5   C#5
  [[73, 3], [null, 2]], //                             44      C#5  rest
];
// The flute's long answer, climbing to G#5 and settling on B4.
const FLUTE_LONG = [
  [[71, 1.5], [73, 0.5], [76, 3, 's']], //             53 Eadd9: B4   C#5  E5-
  [[76, 1.5, 'c'], [78, 0.5], [80, 3, 's']], //        54       E5-  F#5  G#5-
  [[80, 1.5, 'c'], [78, 0.5], [76, 2], [71, 1, 's']], //55      G#5- F#5  E5   B4-
  [[71, 3, 'c'], [null, 2]], //                        56       B4-  rest
];
// The flute joins above the cello's climb.
const FLUTE_BUILD = [
  [[null, 2], [76, 1.5], [78, 0.5], [80, 1]], //       61      rest      E5   F#5  G#5
  [[80, 1.5], [78, 0.5], [76, 2], [null, 1]], //       62      G#5  F#5  E5   rest
  [[null, 3], [78, 1.5], [80, 0.5, 's']], //           63      rest      F#5  G#5-
  [[80, 3, 'c'], [null, 2]], //                        64      G#5- rest
];
// Over the bloom the flute climbs to A5, the top of the song.
const FLUTE_BLOOM = [
  [[null, 2], [73, 1.5], [78, 0.5], [81, 1]], //       69 A6: rest      C#5  F#5  A5
  [[81, 1.5], [78, 0.5], [73, 2], [null, 1]], //       70      A5   F#5  C#5  rest
  [[null, 2], [76, 1.5], [78, 0.5], [81, 1]], //       71      rest      E5   F#5  A5
  [[81, 3], [null, 2]], //                             72      A5   rest
];
// The flute takes the top through the peak of the bloom.
const FLUTE_PEAK = [
  [[71, 1.5], [73, 0.5], [76, 3, 's']], //             77 Eadd9: B4   C#5  E5-
  [[76, 1.5, 'c'], [78, 0.5], [80, 3, 's']], //        78       E5-  F#5  G#5-
  [[80, 1.5, 'c'], [78, 0.5], [76, 2], [71, 1, 's']], //79      G#5- F#5  E5   B4-
  [[71, 2, 'c'], [null, 3]], //                        80       B4-  rest
];
// The flute in counterpoint under the full theme, and over the last statement.
const FLUTE_COUNTER = [
  [[null, 1], [76, 1.5], [78, 0.5], [81, 2, 's']], //  89 F#m7: rest E5   F#5  A5-
  [[81, 1.5, 'c'], [80, 0.5], [78, 2], [null, 1]], //  90       A5-  G#5  F#5  rest
  [[null, 5]], //                                      91       rest
  [[null, 5]], //                                      92       rest
  [[null, 1], [71, 1.5], [73, 0.5], [76, 2]], //       93 Eadd9: rest B4   C#5  E5
  [[76, 1.5], [78, 0.5], [80, 3, 's']], //             94       E5   F#5  G#5-
  [[80, 1.5, 'c'], [78, 0.5], [76, 2], [71, 1, 's']], //95      G#5- F#5  E5   B4-
  [[71, 3, 'c'], [null, 2]], //                        96       B4-  rest
];
const FLUTE_HIGH = [
  [[null, 2], [78, 1.5], [80, 0.5], [83, 1]], //       101 B6: rest      F#5  G#5  B5
  [[83, 1.5], [81, 0.5], [80, 2], [78, 1]], //         102      B5   A5   G#5  F#5
  [[78, 1.5], [80, 0.5], [78, 2], [null, 1]], //       103      F#5  G#5  F#5  rest
];
// The flute's last echo of the motif, then nothing.
const FLUTE_END = [
  [[null, 1], [73, 1.5], [75, 0.5], [78, 2]], //       107 F#m7: rest C#5  D#5  F#5
  [[78, 1.5], [76, 0.5], [73, 2], [null, 1]], //       108      F#5  E5   C#5  rest
];

// --------------------------------------------------------------------------------------- assemble
const KEYS = ['cello', 'flute', 'harp', 'guitar', 'pad', 'bass', 'kit'];
const b = sectionBuilder(KEYS, {
  exact: true,
  barTicks: 4800,
  label: (name, start, end) => `${start}-${end}: ${name}`,
});

// 1-8: the harp cell alone. Nothing else plays, so the pattern is the pulse from the first bar.
b.section(FORM[0].name, 8, {
  harp: bars(1, 8, (bar) => harpBar(bar, at(bar), 'low', MASK_FULL, 60)),
});

// 9-16: the nylon guitar's four hits lock the bar under the turning cell.
b.section(FORM[1].name, 8, groove(9, { harp: 62, guitar: 62 }));

// 17-24: the plucked bass and the heartbeat kick, both where the guitar already hits.
b.section(FORM[2].name, 8, groove(17, { harp: 64, guitar: 64, bass: 58, kit: 'two' }));

// 25-32: the tape pad swells in over two four-bar chords.
b.section(FORM[3].name, 8, groove(25, { harp: 64, guitar: 64, bass: 58, kit: 'two', pad: 68 }));

// 33-40: the cello theme enters, late, over everything.
b.section(FORM[4].name, 8, {
  ...groove(33, { harp: 64, guitar: 64, bass: 58, kit: 'two', pad: 70 }),
  cello: phrase(THEME, 33, 76),
});

// 41-48: the flute answers in the cello's first four bars, the cello answers back in the next four.
b.section(FORM[5].name, 8, {
  ...groove(41, { harp: 66, guitar: 64, bass: 58, kit: 'two', pad: 70 }),
  flute: place(phrase(FLUTE_FIRST, 41, 72), 0),
  cello: place(phrase(CELLO_ANSWER, 45, 80), 4),
});

// 49-56: dialogue - the cello first half, the flute second half, the kick adding a third hit.
b.section(FORM[6].name, 8, {
  ...groove(49, { harp: 66, guitar: 66, bass: 58, kit: 'three', pad: 70 }),
  cello: place(phrase(CELLO_SECOND, 49, 82), 0),
  flute: place(phrase(FLUTE_LONG, 53, 74), 4),
});

// 57-64: the build - the harp cell lifts a third, the cello climbs, the flute joins above it.
b.section(FORM[7].name, 8, {
  ...groove(57, { shape: 'high', harp: 68, guitar: 66, bass: 60, kit: 'three', pad: 72 }),
  cello: phrase(CELLO_BUILD, 57, 84),
  flute: place(phrase(FLUTE_BUILD, 61, 76), 4),
});

// 65-72: the bloom. D sharp becomes D natural, the harp cell stays high, the kick goes back to
// the plain heartbeat, and the flute climbs over the cello's second half.
b.section(FORM[8].name, 8, {
  ...groove(65, { shape: 'high', harp: 70, guitar: 66, bass: 60, kit: 'two', pad: 72 }),
  cello: phrase(CELLO_BLOOM, 65, 86),
  flute: place(phrase(FLUTE_BLOOM, 69, 78), 4),
});

// 73-80: the peak of the bloom - the cello's last phrase, then the flute alone at the top.
b.section(FORM[9].name, 8, {
  ...groove(73, { shape: 'high', harp: 70, guitar: 66, bass: 60, kit: 'three', pad: 72 }),
  cello: place(phrase(CELLO_BLOOM_PEAK, 73, 86), 0),
  flute: place(phrase(FLUTE_PEAK, 77, 80), 4),
});

// 81-88: the break. No kick, no bass, no pad; the harp cell drops back to its low shape and
// thins, and the cello comes down to the low strings before it picks up the theme again.
b.section(FORM[10].name, 8, {
  harp: bars(81, 8, (bar) => harpBar(bar, at(bar), 'low', MASK_THIN, 62)),
  guitar: bars(81, 8, (bar) => guitarBar(at(bar), 58, bar)),
  cello: phrase(CELLO_BREAK, 81, 70),
});

// 89-96: the full theme with everything back, the flute in counterpoint above it.
b.section(FORM[11].name, 8, {
  ...groove(89, { shape: 'high', harp: 70, guitar: 66, bass: 60, kit: 'ghost', pad: 72 }),
  cello: phrase(CELLO_FULL, 89, 90),
  flute: phrase(FLUTE_COUNTER, 89, 78),
});

// 97-104: the last statement, the flute high above from bar 101.
b.section(FORM[12].name, 8, {
  ...groove(97, { shape: 'high', harp: 70, guitar: 66, bass: 60, kit: 'ghost', pad: 72 }),
  cello: phrase(CELLO_LAST, 97, 88),
  flute: place(phrase(FLUTE_HIGH, 101, 78), 4),
});

// 105-112: the dissolve. The cello's last phrase, the flute's last echo, then the pad and the
// bass leave at 109, the guitar and the kick at 111, and the harp plays the pattern alone to the
// end - 160 whole cells from the first bar to the last.
b.section(FORM[13].name, 8, {
  harp: bars(105, 8, (bar) => harpBar(bar, at(bar), 'low', MASK_FULL, 62)),
  guitar: [...bars(105, 6, (bar) => guitarBar(at(bar), 60, bar)), R, R],
  cello: place(phrase(CELLO_END, 105, 78), 0),
  flute: place(phrase(FLUTE_END, 107, 70), 2),
  pad: [
    ...padRegion(CHORD[at(105)].pad, 4, 70),
    R, R, R, R,
  ],
  bass: [...bars(105, 4, (bar) => bassBar(at(bar), 56, bar)), R, R, R, R],
  kit: [...bars(105, 6, (bar) => kitBar('two', bar)), R, R],
});

// ------------------------------------------------------------------------------------------- text
const FORM_NOTE = `# Long Division, by MiMo v2.6 Flash & SZ. An original pulse-ambient piece for
# the Ambient style: 92 BPM in 5/4 in F# Dorian, 112 bars, 6:05. It pulses from the first bar - a
# concert-harp cell of seven eighths turning against the bar's ten, so its accent walks across the
# beat and meets it again every seven bars. 112 bars is exactly 160 of those cells, so the harp
# finishes in the phase it started in, and every seven-bar realignment falls in a different place
# against the eight-bar form on the way. A nylon-guitar figure holds 3+3+2+2 on the grid under it,
# a plucked string bass lands where a soft heartbeat kick lands, and a tape pad holds open fifths.
# A solo cello theme enters at bar 33, the concert flute answers it, the bloom at 65 shifts to D
# Lydian (the mode's D sharp becomes D natural), the break at 81 drops the kick, the bass and the
# pad, the theme returns in full at 89, and the last eight bars dissolve back to the one pattern
# the song opened with.
#
# Lineup: harp (arp, bank:concert-harp) runs the cell with no offsets at all, so the phasing stays
# audible; guitar (chords, bank:nylon-guitar) plays four hits a bar; pad (pad, bank:tape-pad)
# holds an open voicing written to end exactly where each chord changes; bass (bass,
# bank:string-bass) plucks the root where the kick lands and nowhere else; kit (drums, the style's
# dusty kit) is the heartbeat; cello (lead, bank:cello) carries the theme and flute (counter, the
# style's concert flute) answers it, both leaning a few ticks behind the beat with uneven
# velocities. No music box, no FM Rhodes, no glass pad, no washed pad, no soft sub.
#
# The harmony is written once below as one chord symbol every four bars, and every pitched part
# follows it: notes that start on a beat are chord tones, passing notes sit on the off-beats, and
# every note is a whole step clear of the pad and the bass, so the song runs with no half-step
# clashes and no off-chord notes. The form changes something at every eight-bar mark, listed
# below.
#
# Built by its own script, tools/arranger/long-division.mjs, from tools/arranger/lib.mjs: the
# harmony tables, the pattern cells, the theme and its answers, the velocities and the microtiming
# all live there, and the song file is generated from it - never edited.`;

const TEXT = [
  FORM_NOTE,
  '#',
  ...HEAD.chordLines,
  '#',
  '# Form:',
  ...HEAD.formLines,
  '#',
  'title: Long Division',
  'composer: MiMo v2.6 Flash & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: ambient',
  'key: F# Dorian',
  'tempo: 92',
  'time: 5/4',
  'about: A 6:05 pulse-ambient original at 92 BPM in 5/4 in F# Dorian: a concert-harp cell of '
    + 'seven eighths phasing against a nylon-guitar figure over a heartbeat kick, a solo cello '
    + 'theme answered by a flute, a bloom into D Lydian, a break where the beat drops, the theme '
    + 'in full, and a dissolve back to the one pattern it opened with.',
].join('\n');

const TRACKS = [
  ['cello', 'track cello role=lead inst=bank:cello vol=1 pan=-0.12'],
  ['flute', 'track flute role=counter vol=0.58 pan=0.18'],
  ['harp', 'track harp role=arp inst=bank:concert-harp vol=0.78 pan=0.32 vol@109-112=1..0.6'],
  ['guitar', 'track guitar role=chords inst=bank:nylon-guitar vol=0.84 pan=-0.3'],
  ['pad', 'track pad role=pad inst=bank:tape-pad vol=1 pan=-0.08 vol@25-28=0..1'],
  ['bass', 'track bass role=bass inst=bank:string-bass vol=0.33 pan=0'],
  ['kit', 'track kit role=drums vol=0.48 pan=0'],
];

const text = `${TEXT}

${TRACKS.map(([key, head]) => `${head}\n${b.block(key, { perRow: 4, collapseRests: true })}`).join('\n\n')}
`;

const path = saveSong(out, 'long-division.song', text);
console.log(`wrote ${path} (${TOTAL} bars)`);
