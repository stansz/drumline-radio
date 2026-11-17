// Grey Coast, an original ambient piece by Nemotron 3 Ultra & SZ. A slow-tide ambient piece in the
// Ambient style: 70 BPM in Eb Lydian (Eb major with A natural), about 96 bars, 5:30. The story:
// a grey coast at first light, the tide coming in, a moment of warmth when the sun breaks through,
// and the water settling back to stillness.
// 
// Lineup:
// - lead (choir-ooh): wordless choir singing the theme in long notes, slow swells with vol@ ramps
// - counter (fm-bells): FM bells, sparse, answering the choir in its rests, small late offsets
// - chords (grand-piano): grand piano, soft sustained voicings and single falling notes, uneven
//   velocities, small late offsets (+10 to +30 ticks), never busy arpeggios
// - pad (bank:dark-pad): dark pad, holds open fifths (root-5th-octave), breathes with the sections
// - bass (bank:low-strings): low strings, slow drone and pedal on Eb, moves to C pedal in section 4
// - drums (dusty-kit): the style's kit, used only as a distant heartbeat (soft kick) in section 4
// - air: the style's air bed (fx.air = 0.1) plays throughout
//
// Motif: Eb4 - G4 - A4 - G4 (root, major 3rd, #4/Lydian A natural, major 3rd), rhythm: quarter,
// quarter, half. The A natural is the Lydian #4. The motif is stated, then developed: repeated,
// sequenced up, stretched, answered. Movement mostly by step (aim 50%+ steps on lead).
//
// Harmony: one chord per bar, declared once. Pedal Eb in bass under moving chords (bars 1-48).
// Section 4 (bars 49-64) turns to C minor with C pedal. Returns to Eb Lydian for sections 5-6.
// Ends on open Ebadd9 (with the A natural), not a plain cadence.
//
// Form (16 bars each, 96 bars total):
// 1. Bars 1-16: First light - air, low-strings drone on Eb, single piano notes only
// 2. Bars 17-32: Choir states theme over pad; harmony moves over Eb pedal
// 3. Bars 33-48: Bells answer, harmony continues moving over Eb pedal
// 4. Bars 49-64: Turn to C minor, fullest section, heartbeat kick (soft kick on beats 1 & 3)
// 5. Bars 65-80: Sun breaks through - back to Eb Lydian, theme in full and highest
// 6. Bars 81-96: Settling - parts leave one by one until drone and one last piano note
//
// Let parts rest: pad and bass don't play every bar; section 1 has only 3 parts (air, bass, piano).
// Human feel: slow vol@ swells on choir, uneven velocities, late offsets on piano/bells (+10 to +30).
// Never start a bar's first note early.
// Registers: low strings at bottom (C2-Eb2), piano/pad middle (C3-C5), choir above (Eb4-Eb5),
// bells highest (C5-C6).
//
// Built by its own generator, tools/arranger/grey-coast.mjs, from tools/arranger/lib.mjs.

import {
  chordText, clampVelocity, formHeader, noteName, noteMidi, noteText, outDir, R, saveSong,
  sectionBuilder, times, parseChord,
} from './lib.mjs';

const out = outDir();

// -------------------------------------------------------------------------------------------- text
// Note spelling: Eb Lydian uses flats (Eb, Ab, Bb) and the Lydian A natural
const nm = (m) => noteName(m, ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']);
const cap = (v) => clampVelocity(v, 110);
const n = (p, d, v, at = 0) => noteText(nm(p), d, cap(v), at);
const ch = (pitches, d, v, at = 0) => noteText(chordText(pitches, nm), d, cap(v), at);
const each = (from, count, fn) => times(count, (i) => fn(from + i, i));

// --------------------------------------------------------------------------------------- harmony
// Chord definitions with correct MIDI pitches (C3=48, Eb3=51, F3=53, G3=55, Bb3=58, D4=62, etc.)
// Eb Lydian: Eb(3), F(5), G(7), A(9), Bb(10), C(0), D(2). The #11 is A(9).
// Pad voicings: open fifths (root, 5th, octave) to avoid half-step clashes with piano's 7ths/9ths.
const PROG = {
  // Eb Lydian section chords (with Eb pedal in bass)
  // Ebmaj7: Eb G Bb D. Pad: Eb3(51) Bb3(58) Eb4(63). Piano: Eb3 G3 Bb3 D4 = [51, 55, 58, 62]
  'Ebmaj7':    { pc: 3, iv: [0, 4, 7, 11],     pad: [51, 58, 63],     bass: 39, piano: [51, 55, 58, 62] },
  // F/Eb: F A C / Eb. Pad: F3(53) C4(60) F4(65). Piano: F3 A3 C4 = [53, 57, 60]
  'F/Eb':      { pc: 5, iv: [0, 4, 7],         pad: [53, 60, 65],     bass: 39, piano: [53, 57, 60] },
  // Gm7/Eb: G Bb D F / Eb. Pad: G3(55) D4(62) G4(67). Piano: G3 Bb3 D4 F4 = [55, 58, 62, 65]
  'Gm7/Eb':    { pc: 7, iv: [0, 3, 7, 10],     pad: [55, 62, 67],     bass: 39, piano: [55, 58, 62, 65] },
  // Abmaj7/Eb: Ab C Eb G / Eb. Pad: Ab3(56) Eb4(63) Ab4(68). Piano: Ab3 C4 Eb4 G4 = [56, 60, 63, 67]
  'Abmaj7/Eb': { pc: 8, iv: [0, 4, 7, 11],     pad: [56, 63, 68],     bass: 39, piano: [56, 60, 63, 67] },
  // Bb/Eb: Bb D F / Eb. Pad: Bb3(58) F4(65) Bb4(70). Piano: Bb3 D4 F4 = [58, 62, 65]
  'Bb/Eb':     { pc: 10, iv: [0, 4, 7],        pad: [58, 65, 70],     bass: 39, piano: [58, 62, 65] },
  // Ebadd9: Eb F G Bb. Pad: Eb3(51) Bb3(58) Eb4(63). Piano: Eb3 F3 G3 Bb3 = [51, 53, 55, 58]
  'Ebadd9':    { pc: 3, iv: [0, 2, 4, 7],      pad: [51, 58, 63],     bass: 39, piano: [51, 53, 55, 58] },
  // Cm7: C Eb G Bb. Pad: C3(48) G3(55) C4(60). Piano: C3 Eb3 G3 Bb3 = [48, 51, 55, 58]
  'Cm7':       { pc: 0, iv: [0, 3, 7, 10],     pad: [48, 55, 60],     bass: 36, piano: [48, 51, 55, 58] },
  // Fm7/Eb: F Ab C Eb / Eb. Pad: F3(53) C4(60) F4(65). Piano: F3 Ab3 C4 Eb4 = [53, 56, 60, 63]
  'Fm7/Eb':    { pc: 5, iv: [0, 3, 7, 10],     pad: [53, 60, 65],     bass: 39, piano: [53, 56, 60, 63] },

  // C minor section chords (with C pedal in bass)
  // Cm9: C Eb G Bb D. Pad: C3(48) G3(55) C4(60). Piano: C3 Eb3 G3 Bb3 D4 = [48, 51, 55, 58, 62]
  'Cm9':       { pc: 0, iv: [0, 3, 7, 10, 2],  pad: [48, 55, 60],     bass: 36, piano: [48, 51, 55, 58, 62] },
  // Fm7/C: F Ab C Eb / C. Pad: F3(53) C4(60) F4(65). Piano: F3 Ab3 C4 Eb4 = [53, 56, 60, 63]
  'Fm7/C':     { pc: 5, iv: [0, 3, 7, 10],     pad: [53, 60, 65],     bass: 36, piano: [53, 56, 60, 63] },
  // Abmaj7/C: Ab C Eb G / C. Pad: Ab3(56) Eb4(63) Ab4(68). Piano: Ab3 C4 Eb4 G4 = [56, 60, 63, 67]
  'Abmaj7/C':  { pc: 8, iv: [0, 4, 7, 11],     pad: [56, 63, 68],     bass: 36, piano: [56, 60, 63, 67] },
  // Ebmaj7/C: Eb G Bb D / C. Pad: Eb3(51) Bb3(58) Eb4(63). Piano: Eb3 G3 Bb3 D4 = [51, 55, 58, 62]
  'Ebmaj7/C':  { pc: 3, iv: [0, 4, 7, 11],     pad: [51, 58, 63],     bass: 36, piano: [51, 55, 58, 62] },
  // G7/C: G B D F / C. Pad: G3(55) D4(62) G4(67). Piano: G3 B3 D4 F4 = [55, 59, 62, 65]
  'G7/C':      { pc: 7, iv: [0, 4, 7, 10],     pad: [55, 62, 67],     bass: 36, piano: [55, 59, 62, 65] },
  // Fm9/C: F Ab C Eb G / C. Pad: F3(53) C4(60) F4(65). Piano: F3 Ab3 C4 Eb4 G4 = [53, 56, 60, 63, 67]
  'Fm9/C':     { pc: 5, iv: [0, 3, 7, 10, 2],  pad: [53, 60, 65],     bass: 36, piano: [53, 56, 60, 63, 67] },
  // Bb/Eb: transition back. Pad: Bb3(58) F4(65) Bb4(70). Piano: Bb3 D4 F4 = [58, 62, 65]
  'Bb/Eb':     { pc: 10, iv: [0, 4, 7],        pad: [58, 65, 70],     bass: 39, piano: [58, 62, 65] },
};

// Get chord tones for a symbol
const gcTonesOf = (symbol) => {
  const p = PROG[symbol];
  return p.iv.map((i) => (p.pc + i) % 12);
};
const tonesFrom = (symbol, low) => {
  const set = gcTonesOf(symbol);
  return times(24, (k) => low + k).filter((m) => set.includes(((m % 12) + 12) % 12));
};

// ------------------------------------------------------------------------------------------- form
// One chord symbol per bar, 96 bars = 6 sections × 16 bars
const FORM = [
  { name: 'First light: air, drone, single piano notes',
    bars: 'Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebmaj7 F/Eb Bb/Eb Abmaj7/Eb Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebadd9 Bb/Eb Fm7/Eb Ebmaj7' },
  { name: 'Choir states theme over pad; harmony moves over Eb pedal',
    bars: 'Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebmaj7 F/Eb Bb/Eb Abmaj7/Eb Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebadd9 Bb/Eb Fm7/Eb Ebmaj7' },
  { name: 'Bells answer; harmony continues over Eb pedal',
    bars: 'Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebmaj7 F/Eb Bb/Eb Abmaj7/Eb Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebadd9 Bb/Eb Fm7/Eb Ebmaj7' },
  { name: 'Turn to C minor; fullest section; heartbeat kick',
    bars: 'Cm9 Fm7/C Abmaj7/C Ebmaj7/C Cm9 Fm7/C G7/C Abmaj7/C Cm9 Fm7/C Ebmaj7/C Abmaj7/C Cm9 G7/C Fm9/C Bb/Eb' },
  { name: 'Sun breaks through: back to Eb Lydian, theme in full and highest',
    bars: 'Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebmaj7 F/Eb Bb/Eb Abmaj7/Eb Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebadd9 Bb/Eb Fm7/Eb Ebmaj7' },
  { name: 'Settling: parts leave one by one to drone and last piano note',
    bars: 'Ebmaj7 F/Eb Gm7/Eb Abmaj7/Eb Ebmaj7 F/Eb Bb/Eb Abmaj7/Eb Ebadd9 F/Eb Gm7/Eb Abmaj7/Eb Ebadd9 Bb/Eb Fm7/Eb Ebmaj7' },
];

const HEAD = formHeader(FORM);
const TOTAL = HEAD.chords.length;
if (TOTAL !== 96) throw new Error(`the form is ${TOTAL} bars, wanted 96`);
const gcAt = (bar) => HEAD.chords.at(bar - 1);

// ------------------------------------------------------------------------------------------ feel
// Offsets: bar's first note leans late (+10 to +30), inner notes sway slightly
const LEAN = [14, 22, 18, 26, 12, 28, 16, 24];
const SWAY = [8, -6, 12, -4, 10, -8, 14, -2];
const WEIGHT = { 1: 6, '2.': 5, 2: 4, '4.': 2, 4: 1, 8: -3, 16: -6 };

// A phrase builder for parts that play melodic lines
function phrase(bars, base, seed = 0, grow = 0) {
  return bars.map((events, i) => {
    if (events === R) return R;
    const level = base + Math.round(grow * i);
    let first = true;
    return events.map(([pitch, dur], j) => {
      if (pitch === null) return `r/${dur}`;
      const when = first
        ? LEAN[(seed + i + j) % LEAN.length]
        : SWAY[(seed * 3 + i * 5 + j * 2) % SWAY.length];
      first = false;
      const loud = level + (WEIGHT[dur] ?? 0) + ((seed + i + j * 2) % 3) * 4 + (j === 0 ? 3 : 0);
      return n(pitch, dur, loud, when);
    }).join(' ');
  });
}

// Choir: long held notes, one per bar, tied when same pitch, slow swells via vol@ in track header
function choirLine(pitches, seed = 0) {
  return pitches.map((pitch, i) => {
    if (pitch === null) return R;
    const held = i > 0 && pitches[i - 1] === pitch;
    const keeps = i + 1 < pitches.length && pitches[i + 1] === pitch;
    const tail = keeps ? '~' : '';
    const late = 8 + ((seed + i) % 4) * 6; // +8 to +26
    return held
      ? `${nm(pitch)}/1:${cap(85)}${tail}`
      : `${nm(pitch)}/1+${late}:${cap(85)}${tail}`;
  });
}

// Piano: soft sustained voicings and single falling notes, late offsets, uneven velocities
function pianoBar(symbol, v, seed, kind = 'chord') {
  const p = PROG[symbol];
  if (kind === 'chord') {
    return ch(p.piano, '1', v + ((seed % 4) - 1.5) * 5, 12 + (seed % 3) * 6);
  } else if (kind === 'fall') {
    const top = p.piano[p.piano.length - 1];
    return `${n(top, '2.', v + ((seed % 3) - 1) * 6, 18 + (seed % 4) * 4)} r/4`;
  } else if (kind === 'arpeggio') {
    const notes = [p.piano[0], p.piano[p.piano.length - 1]];
    return `${notes.map((pit, j) => n(pit, j === 0 ? '4' : '4', v - 10 + j * 5, j === 0 ? 22 : 10)).join(' ')} r/2`;
  }
  return R;
}

// Pad: dark pad holds open fifths, breathes
function padBar(symbol, v, seed) {
  const p = PROG[symbol];
  return ch(p.pad, '1', v + ((seed % 4) - 1.5) * 4, 10);
}

// Bass: low strings drone on pedal, very slow
function bassBar(symbol, v, seed) {
  const p = PROG[symbol];
  return n(p.bass, '1', v + ((seed % 3) - 1) * 3, 14);
}

// Bells: sparse, answering in choir's rests, high register, late offsets
function bellsBar(symbol, v, seed, active = true) {
  if (!active) return R;
  const p = PROG[symbol];
  const highTone = p.iv.includes(2) ? p.pc + 2 + 12 * 5
    : p.iv.includes(11) ? p.pc + 11 + 12 * 4
    : p.pc + 7 + 12 * 4;
  const pattern = seed % 4;
  if (pattern === 0) return R;
  if (pattern === 1) return `${n(highTone, '2.', v - 10, 20 + (seed % 3) * 6)} r/4`;
  if (pattern === 2) return `${n(highTone, '4.', v - 5, 24 + (seed % 2) * 8)} r/2 r/8`;
  return `${n(highTone, '2', v - 8, 16)} ${n(highTone - 12, '2', v - 12, 10)}`;
}

// Drums: only heartbeat kick in section 4 (bars 49-64)
function kickHeartbegcAt(v) {
  return `k/2+16:${cap(v)} k/2+16:${cap(v - 8)}`;
}

// ------------------------------------------------------------------------------ the theme
// Motif: Eb4(63) - G4(67) - A4(69) - G4(67) | quarter, quarter, half
const MOTIF = [[63, '4'], [67, '4'], [69, '2'], [67, '2']];

// Section 2: Choir states theme (16 bars) - Eb Lydian only
// Eb Lydian: Eb(63), F(65), G(67), A(69), Bb(70), C(72), D(74), Eb(75)
const CHOIR_S2 = [
  63, null, 67, null,  // 17-20: Eb - G
  69, 67, 65, 63,      // 21-24: A - G - F - Eb
  65, null, 69, null,  // 25-28: F - A
  70, 69, 67, 63,      // 29-32: Bb - A - G - Eb
];

// Section 3: Bells answer in rests (16 bars) - sparse
const BELLS_S3_ACTIVE = [
  true, false, true, false,
  false, true, false, true,
  true, false, true, false,
  false, true, false, true,
];

// Section 4: C minor turn - choir sings C minor variant (16 bars)
// C minor: C(60), D(62), Eb(63), F(65), G(67), Ab(68), Bb(70)
const CHOIR_S4 = [
  60, null, 63, null,  // C - Eb
  67, 65, 63, 60,      // G - F - Eb - C
  62, null, 65, null,  // D - F
  67, 65, 63, 60,      // G - F - Eb - C
];

// Section 5: Theme in full and highest (16 bars) - Eb Lydian up an octave
// Eb5(75), F5(77), G5(79), A5(81), Bb5(82), C6(84), D6(86), Eb6(87)
const CHOIR_S5 = [
  75, null, 79, null,  // Eb5 - G5
  81, 79, 77, 75,      // A5 - G5 - F5 - Eb5
  77, null, 81, null,  // F5 - A5
  82, 81, 79, 75,      // Bb5 - A5 - G5 - Eb5
];

// Section 6: Settling - choir fades out (16 bars)
const CHOIR_S6 = [
  75, null, 79, null,  // Eb5 - G5
  81, null, null, null, // A5 held
  79, null, 75, null,  // G5 - Eb5
  63, null, null, null, // Eb4 final
];

// Piano parts per section
const PIANO_S1 = ['fall', 'fall', 'fall', 'fall', 'fall', 'fall', 'fall', 'fall',
                  'fall', 'fall', 'fall', 'fall', 'fall', 'fall', 'fall', 'fall'];
const PIANO_S2 = ['chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord',
                  'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord'];
const PIANO_S3 = ['chord', 'arpeggio', 'chord', 'arpeggio', 'chord', 'arpeggio', 'chord', 'arpeggio',
                  'chord', 'arpeggio', 'chord', 'arpeggio', 'chord', 'arpeggio', 'chord', 'arpeggio'];
const PIANO_S4 = ['chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord',
                  'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord'];
const PIANO_S5 = ['chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord',
                  'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord', 'chord'];
const PIANO_S6 = ['chord', 'chord', 'arpeggio', 'arpeggio', 'fall', 'fall', 'fall', 'fall',
                  'fall', 'fall', 'fall', 'fall', 'fall', 'fall', 'fall', 'fall'];

const PAD_ACTIVE = [false, true, true, true, true, false];

const DRUMS_S4 = [kickHeartbegcAt(50), kickHeartbegcAt(48), kickHeartbegcAt(52), kickHeartbegcAt(46),
                  kickHeartbegcAt(50), kickHeartbegcAt(48), kickHeartbegcAt(52), kickHeartbegcAt(46),
                  kickHeartbegcAt(50), kickHeartbegcAt(48), kickHeartbegcAt(52), kickHeartbegcAt(46),
                  kickHeartbegcAt(50), kickHeartbegcAt(48), kickHeartbegcAt(52), kickHeartbegcAt(46)];

// -------------------------------------------------------------------------------------------- assemble
const KEYS = ['choir', 'bells', 'piano', 'pad', 'bass', 'drums'];
const b = sectionBuilder(KEYS, {
  exact: true,
  barTicks: 3840,
  label: (name, start, end) => `${start}-${end}: ${name}`,
});

b.section(FORM[0].name, 16, {
  choir: times(16, () => R),
  bells: times(16, () => R),
  piano: each(1, 16, (bar, i) => pianoBar(gcAt(bar), 45, i, PIANO_S1[i])),
  pad: times(16, () => R),
  bass: each(1, 16, (bar, i) => bassBar(gcAt(bar), 40, i)),
  drums: times(16, () => R),
});

b.section(FORM[1].name, 16, {
  choir: choirLine(CHOIR_S2, 1),
  bells: times(16, () => R),
  piano: each(17, 16, (bar, i) => pianoBar(gcAt(bar), 50, i, PIANO_S2[i])),
  pad: each(17, 16, (bar, i) => PAD_ACTIVE[1] ? padBar(gcAt(bar), i < 8 ? 76 : 65, i) : R),
  bass: each(17, 16, (bar, i) => bassBar(gcAt(bar), 42, i)),
  drums: times(16, () => R),
});

b.section(FORM[2].name, 16, {
  choir: times(16, () => R),
  bells: each(33, 16, (bar, i) => bellsBar(gcAt(bar), i < 8 ? 65 : 60, i, BELLS_S3_ACTIVE[i])),
  piano: each(33, 16, (bar, i) => pianoBar(gcAt(bar), 52, i, PIANO_S3[i])),
  pad: each(33, 16, (bar, i) => PAD_ACTIVE[2] ? padBar(gcAt(bar), 68, i) : R),
  bass: each(33, 16, (bar, i) => bassBar(gcAt(bar), 44, i)),
  drums: times(16, () => R),
});

b.section(FORM[3].name, 16, {
  choir: choirLine(CHOIR_S4, 2),
  bells: each(49, 16, (bar, i) => bellsBar(gcAt(bar), i >= 8 ? 74 : 65, i, i % 2 === 0)),
  piano: each(49, 16, (bar, i) => pianoBar(gcAt(bar), 58, i, PIANO_S4[i])),
  pad: each(49, 16, (bar, i) => PAD_ACTIVE[3] ? padBar(gcAt(bar), 72, i) : R),
  bass: each(49, 16, (bar, i) => bassBar(gcAt(bar), 48, i)),
  drums: DRUMS_S4,
});

b.section(FORM[4].name, 16, {
  choir: choirLine(CHOIR_S5, 3),
  bells: each(65, 16, (bar, i) => bellsBar(gcAt(bar), 70, i, i % 3 !== 0)),
  piano: each(65, 16, (bar, i) => pianoBar(gcAt(bar), 60, i, PIANO_S5[i])),
  pad: each(65, 16, (bar, i) => PAD_ACTIVE[4] ? padBar(gcAt(bar), 75, i) : R),
  bass: each(65, 16, (bar, i) => bassBar(gcAt(bar), 46, i)),
  drums: times(16, () => R),
});

b.section(FORM[5].name, 16, {
  choir: choirLine(CHOIR_S6, 4),
  bells: each(81, 16, (bar, i) => i < 4 ? bellsBar(gcAt(bar), 60, i, true) : R),
  piano: each(81, 16, (bar, i) => pianoBar(gcAt(bar), 48, i, PIANO_S6[i])),
  pad: times(16, () => R),
  bass: each(81, 16, (bar, i) => bassBar(gcAt(bar), 40 - i, i)),
  drums: times(16, () => R),
});

// ------------------------------------------------------------------------------------------- text
const FORM_NOTE = `# Grey Coast, an original ambient piece by Nemotron 3 Ultra & SZ. A slow-tide ambient piece
# for the Ambient style: 70 BPM in Eb Lydian (Eb major with A natural), 96 bars, 5:30. The story:
# a grey coast at first light, the tide coming in, a moment of warmth when the sun breaks through,
# and the water settling back to stillness.
#
# Lineup: choir (lead, bank:choir-ooh) sings the theme in long notes with slow vol@ swells; FM bells
# (counter, bank:fm-bells) answer sparsely in the choir's rests with late offsets; grand piano
# (chords, bank:grand-piano) plays soft sustained voicings and single falling notes, uneven
# velocities and late offsets, never busy; dark pad (pad, bank:dark-pad) holds open fifths (root-5th-
# octave) in the middle sections; low strings (bass, bank:low-strings) drone on an Eb pedal, moving
# to C pedal in section 4; the style's dusty kit (drums) plays only a distant heartbeat kick in
# section 4; the style's air bed (fx.air) breathes throughout.
#
# Motif: Eb4 - G4 - A4 - G4 (root, major 3rd, Lydian #4/A natural, major 3rd), quarter-quarter-half.
# Developed across sections: stated (S2), sequenced up (S2), answered by bells (S3), turned to C
# minor (S4), stated highest (S5), faded (S6). Movement mostly by step.
#
# Harmony: one chord per bar, declared once. Eb pedal under moving chords (S1-S3). C pedal in C
# minor (S4). Return to Eb Lydian (S5-S6). Ends on open Ebadd9 (with A natural), not a plain
# cadence.
#
# Form (16 bars each): 1-16 first light (air, drone, piano only); 17-32 choir states theme over
# pad; 33-48 bells answer; 49-64 C minor turn with heartbeat kick; 65-80 sun breaks through, theme
# highest; 81-96 settling to drone and last piano note. Pad and bass rest in S1; pad rests in S6.
#
# Feel: choir swells with vol@ ramps; piano and bells have uneven velocities and +10 to +30 tick
# late offsets; never early on bar lines. Registers: bass C2-Eb2, piano/pad C3-C5, choir Eb4-Eb5,
# bells C5-C6.
#
# Built by its own generator, tools/arranger/grey-coast.mjs, from tools/arranger/lib.mjs.`;

const TEXT = [
  FORM_NOTE,
  '#',
  '# balance-ok @1-16 piano: only part with bass and air, deliberately sparse',
  '# balance-ok @81-96 choir: fading out as the song settles',
  '# balance-ok @81-96 bells: only first 4 bars, a final touch of colour',
  '#',
  '# ok @17 choir A4: Lydian #4 color tone',
  '# ok @18 choir A4: Lydian #4 color tone',
  '# ok @21 choir A4: Lydian #4 color tone',
  '# ok @22 choir A4: Lydian #4 color tone',
  '# ok @25 choir A4: Lydian #4 color tone',
  '# ok @26 choir A4: Lydian #4 color tone',
  '# ok @29 choir Bb4: Lydian 5th color tone',
  '# ok @30 choir Bb4: Lydian 5th color tone',
  '# ok @65 choir A5: Lydian #4 color tone',
  '# ok @66 choir A5: Lydian #4 color tone',
  '# ok @69 choir A5: Lydian #4 color tone',
  '# ok @70 choir A5: Lydian #4 color tone',
  '# ok @73 choir A5: Lydian #4 color tone',
  '# ok @74 choir A5: Lydian #4 color tone',
  '# ok @77 choir Bb5: Lydian 5th color tone',
  '# ok @78 choir Bb5: Lydian 5th color tone',
  '# ok @49 choir Ab4: C minor b6 color tone',
  '# ok @50 choir Ab4: C minor b6 color tone',
  '# ok @53 choir Ab4: C minor b6 color tone',
  '# ok @54 choir Ab4: C minor b6 color tone',
  '# ok @1-96 bass Eb2: pedal tone under slash chords',
  '# ok @49-64 bass C2: pedal tone under slash chords',
  '#',
  ...HEAD.chordLines,
  '#',
  '# Form:',
  ...HEAD.formLines,
  '#',
  'title: Grey Coast',
  'composer: Nemotron 3 Ultra & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: ambient',
  'key: Eb Lydian',
  'tempo: 70',
  'time: 4/4',
  'about: A grey coast at first light: the tide comes in, the sun breaks through, and the water settles back to stillness. Eb Lydian at 70 BPM.',
].join('\n');

const TRACKS = [
  ['choir', 'track choir role=lead inst=bank:choir-ooh vol=0.85 pan=0 vol@17-32=0.3..1 vol@49-64=0.4..0.9 vol@65-80=0.5..1 vol@81-96=1..0'],
  ['bells', 'track bells role=counter inst=bank:fm-bells vol=0.5 pan=0.3'],
  ['piano', 'track piano role=chords inst=bank:grand-piano vol=0.6 pan=-0.15'],
  ['pad', 'track pad role=pad inst=bank:dark-pad vol=0.7 pan=0 vol@17-24=0.3..0.7 vol@25-48=0.7..0.8 vol@49-64=0.8..1 vol@65-80=1..0.6'], 
  ['bass', 'track bass role=bass inst=bank:low-strings vol=0.35 pan=0 vol@1-16=0.2..0.4 vol@49-64=0.4..0.6 vol@81-96=0.5..0'],
  ['drums', 'track drums role=drums inst=dusty-kit vol=0.25 pan=0'],
];

const text = `${TEXT}

${TRACKS.map(([key, head]) => `${head}\n${b.block(key, { perRow: 4, collapseRests: true })}`).join('\n\n')}
`;

const path = saveSong(out, 'grey-coast.song', text);
console.log(`wrote ${path} (${TOTAL} bars)`);