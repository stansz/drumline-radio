// First Flight, an original film cue by MiMo V2.6 Flash & SZ. A bright, soaring cue for the
// Cinematic style in D major at 112 BPM: it opens almost empty (bells and pizzicato hinting the
// motif), lets the ostinato in, states the theme quietly on FM brass, lifts when the pad, the bass
// and the choir join, breaks down to bells and pizzicato over a borrowed C major, builds on the
// ostinato with the kit rolling, and lands the theme in full on brass and choir before settling on
// one held, open D. 104 bars, 3:43.
//
// Built by its own script, from tools/arranger/lib.mjs. The story, the lineup, the motif and the
// form are the plan in the song file's first comment (FORM_NOTE below); every chord, voicing,
// figure, velocity and microtiming offset is written fresh in this file, and the song file is
// generated from it - never edited.
//   node tools/arranger/first-flight.mjs [outDir]
import {
  chordText, clampVelocity, formHeader, noteName, noteText, outDir, R, saveSong, sectionBuilder,
  times,
} from './lib.mjs';

const out = outDir();

// -------------------------------------------------------------------------------------------- text
// What every part writes its notes with. `nm` spells the D-major note names, `cap` keeps a velocity
// legal, `n` and `ch` write one note or one chord with its ticks-behind-the-beat offset, and
// `each(fn)` walks a section's own bar numbers, so a part can read its own bar's chord.
const nm = (m) => noteName(m);
const cap = (v) => clampVelocity(v, 122);
const n = (p, d, v, at = 0) => noteText(nm(p), d, cap(v), at);
const ch = (pitches, d, v, at = 0) => noteText(chordText(pitches, nm), d, cap(v), at);
const each = (from, count, fn) => times(count, (i) => fn(from + i, i));

// --------------------------------------------------------------------------------------- harmony
// One entry per chord symbol the song uses: the root pitch class, the intervals it sounds, the pad's
// open voicing in the middle of the keyboard, the root the bass plays (always a chord tone of the
// symbol, so a slash chord's pedal note sits inside it) and the ostinato's middle root.
const PROG = {
  D: { pc: 2, iv: [0, 4, 7], pad: [50, 57, 62], bass: 38, ost: 50 },
  Dadd9: { pc: 2, iv: [0, 2, 4, 7], pad: [50, 57, 62], bass: 38, ost: 50 },
  Bm: { pc: 11, iv: [0, 3, 7], pad: [47, 54, 59], bass: 35, ost: 47 },
  G: { pc: 7, iv: [0, 4, 7], pad: [43, 50, 55], bass: 43, ost: 55 },
  G6: { pc: 7, iv: [0, 4, 7, 9], pad: [43, 50, 55], bass: 43, ost: 55 },
  Gadd9: { pc: 7, iv: [0, 2, 4, 7], pad: [43, 50, 55], bass: 45, ost: 55 },
  A: { pc: 9, iv: [0, 4, 7], pad: [45, 52, 57], bass: 45, ost: 57 },
  Asus4: { pc: 9, iv: [0, 5, 7], pad: [45, 52, 57], bass: 45, ost: 57 },
  'F#m': { pc: 6, iv: [0, 3, 7], pad: [42, 49, 54], bass: 42, ost: 54 },
  'F#m7': { pc: 6, iv: [0, 3, 7, 10], pad: [42, 49, 54], bass: 42, ost: 54 },
  Em: { pc: 4, iv: [0, 3, 7], pad: [52, 59, 64], bass: 40, ost: 52 },
  C: { pc: 0, iv: [0, 4, 7], pad: [48, 55, 60], bass: 36, ost: 48 },
  'D/A': { pc: 2, iv: [0, 4, 7], pad: [50, 57, 62], bass: 45, ost: 50 },
  'Bm7/A': { pc: 11, iv: [0, 3, 7, 10], pad: [47, 54, 59], bass: 45, ost: 47 },
};

// The chord's pitch classes, and its tones from `low` upward for the pizzicato to pick from.
const tonesOf = (chord) => {
  const p = PROG[chord];
  return p.iv.map((i) => (p.pc + i) % 12);
};
const tonesFrom = (chord, low) => {
  const set = tonesOf(chord);
  return times(12, (k) => low + k).filter((m) => set.includes(((m % 12) + 12) % 12));
};
// The colour tone the ostinato brings in: the 9th, the minor or major third, or a sus4's fourth.
const colourOf = (chord) => PROG[chord].iv.find((i) => i > 1 && i < 6) ?? 4;

// ------------------------------------------------------------------------------------------- form
// One chord symbol per section bar, written once. formHeader turns it into the song's `# chords:`
// lines, the `# start-end:` form notes and the per-bar lookup below.
const FORM = [
  { name: 'Opening: bells and pizzicato, the motif in the air',
    bars: 'D Bm G6 A D Bm Em A' },
  { name: 'The ostinato starts, the brass breathes the motif',
    bars: 'D Bm G6 A Dadd9 Bm G6 A' },
  { name: 'The theme on the brass, quietly',
    bars: 'Dadd9 Bm G6 A Dadd9 F#m7 G6 A' },
  { name: 'The theme again, the bells answering in its rests',
    bars: 'Dadd9 Bm G6 A Dadd9 F#m7 G6 A' },
  { name: 'Lift: the pad and the bass join, the theme rises',
    bars: 'Bm G6 Dadd9 A Bm G6 Em A' },
  { name: 'A pedal on A under moving chords, the choir enters',
    bars: 'D/A Bm7/A Gadd9 A Bm G6 A A' },
  { name: 'Pull-back: the quietest since the opening, the turn to C',
    bars: 'D D C C G6 G6 A A' },
  { name: 'Build: the ostinato returns with the bass',
    bars: 'Bm G6 Dadd9 A Bm G6 Dadd9 A' },
  { name: 'Build: a rising sequence, the pad and choir back',
    bars: 'Em F#m7 G6 A Em F#m7 G6 A' },
  { name: 'The roll into the climax',
    bars: 'G6 A Bm Dadd9 G6 A Asus4 A' },
  { name: 'Climax: the theme in full',
    bars: 'Dadd9 Bm G6 A Dadd9 F#m7 G6 A' },
  { name: 'Climax: the theme answered higher',
    bars: 'Dadd9 Bm G6 A Em F#m7 G6 A' },
  { name: 'Outro: settling on one open chord',
    bars: 'Dadd9 G6 Dadd9 Bm G6 A Asus4 D' },
];
const HEAD = formHeader(FORM);
const TOTAL = HEAD.chords.length;
if (TOTAL !== 104) throw new Error(`the form is ${TOTAL} bars, wanted 104`);
const at = (bar) => HEAD.chords.at(bar - 1);

// ------------------------------------------------------------------------------------------ feel
// A bar's first note leans in late, never early, so it can never sound under the chord before it;
// the notes inside sway either side of the beat. Long notes carry the line, so they read louder.
const LEAN = [14, 21, 11, 25, 17, 13, 23, 16];
const SWAY = [9, -7, 15, -5, 12, 18, -9, 6];
const WEIGHT = { 1: 6, '2.': 5, 2: 4, '4.': 2, 4: 1, 8: -3, 16: -6 };

// A phrase: `bars` is a list where each entry is `R` or a list of [pitch, duration] pairs (a null
// pitch is a rest). No two bars lean or sway alike, no velocity repeats exactly, and `grow` swells
// the level bar by bar, so a phrase breathes instead of being pushed along at one delay.
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
      const loud = level + (WEIGHT[dur] ?? 0) + ((seed + i + j * 2) % 3) * 5 + (j === 0 ? 4 : 0);
      return n(pitch, dur, loud, when);
    }).join(' ');
  });
}

// The choir: one long chord tone a bar, tied where the pitch holds, always a touch behind the beat,
// swelling and easing across the phrase rather than holding one level.
function choirLine(pitches, base, seed, grow = 0) {
  return pitches.map((pitch, i) => {
    if (pitch === null) return R;
    const held = i > 0 && pitches[i - 1] === pitch;
    const keeps = i + 1 < pitches.length && pitches[i + 1] === pitch;
    const loud = base + Math.round(grow * i) + (held ? 0 : (i % 3) * 3) + ((i % 4) - 1.5) * 6;
    const tail = keeps ? '~' : '';
    return held
      ? `${nm(pitch)}/1:${cap(loud)}${tail}`
      : `${nm(pitch)}/1+${8 + ((seed + i) % 4) * 4}:${cap(loud)}${tail}`;
  });
}

// -------------------------------------------------------------------------------------- the parts
// The ostinato: tight on the grid, no offsets, every note a chord tone. `A` is root-fifth-octave,
// `B` brings the chord's colour tone in, `C` runs that shape in sixteenths for the build and the
// climax. The drive is the one part that never sways.
const ostBar = (chord, kind, v, seed) => {
  const colour = colourOf(chord);
  const root = PROG[chord].ost;
  const shape = kind === 'A' ? [0, 7, 12, 7, 0, 7, 12, 7]
    : kind === 'B' ? [0, 7, 12, 7, colour, 7, 12, 7]
      : [0, 7, 12, 7, colour, 7, 12, 7, 12, 7, 0, 7, colour, 7, 12, 7];
  const dur = kind === 'C' ? '16' : '8';
  return shape.map((step, i) =>
    n(root + step, dur, v + (i % 2 ? -4 : 0) + ((seed + i) % 3) * 3)).join(' ');
};

// The pad: one open root-fifth-octave held across the bar, a touch late, breathing bar by bar and
// leaving the melody room for its colour tones.
const WAVE = (seed) => ((seed % 4) - 1.5) * 6;
const padBar = (chord, v, seed, at0 = 10) => ch(PROG[chord].pad, '1', v + WAVE(seed), at0);

// The bass: the root under the kick, behind the beat, its level swelling bar by bar. `hold` fills
// the bar (the lift and the outro), `two` leans on beats one and three, `pulse` adds beat four.
function bassBar(chord, v, kind = 'hold', seed = 0) {
  const root = PROG[chord].bass;
  const level = v + WAVE(seed);
  if (kind === 'two') return `${n(root, '2', level, 12)} ${n(root, '2', level - 5, 8)}`;
  if (kind === 'pulse') return `${n(root, '2', level, 12)} r/4 ${n(root, '4', level - 6, 8)}`;
  return n(root, '1', level, 12);
}

// The pizzicato: short plucked colour above the middle, in eighths, off the beat where it can be,
// so it sparkles around the theme instead of standing on top of it.
const PIZZ_CELLS = [
  (t) => [null, t[0], t[1], t[2], null, t[2], t[1], t[0]],
  (t) => [t[1], null, t[2], t[0], t[1], null, t[2], t[1]],
  (t) => [t[0], t[2], null, t[1], t[0], t[2], null, t[2]],
  (t) => [t[0], null, t[1], t[2], t[1], null, t[0], t[1]],
];
const pizzBar = (chord, v, seed) =>
  PIZZ_CELLS[seed % PIZZ_CELLS.length](tonesFrom(chord, 62))
    .map((pitch, i) => (pitch === null
      ? 'r/8'
      : n(pitch, '8', v + ((seed + i) % 3) * 4 - 4, i === 0 ? 11 : i % 2 ? -6 : 5)))
    .join(' ');

// The bells: a fleck at a turn of the story, written as melody events.
const BELL_OPEN = [[null, '2'], [81, '4'], [86, '4']];
const BELL_TURN = [[88, '8'], [86, '8'], [null, '2'], [90, '4']];

// The kit: hits, tom answers, fills and rolls at the turns of the story, never a groove. Every hit
// lands a touch late.
const down = (v) => `[k cr]/4+18:${cap(v)} r/4 r/2`;
const kickDown = (v) => `k/4+16:${cap(v)} r/4 r/2`;
const kickTom = (v) =>
  `k/4+16:${cap(v)} r/4 tm/8+12:${cap(v - 8)} th/8+14:${cap(v - 12)} r/4`;
const kickCrash = (v) => `[k cr]/4+18:${cap(v)} r/4 k/4+14:${cap(v - 8)} r/4`;
const tomFill = (v) =>
  `tm/8+10:${cap(v)} tm/8+12:${cap(v + 3)} th/8+14:${cap(v + 6)} th/8+16:${cap(v + 9)} `
  + `s/8+18:${cap(v + 11)} s/8+20:${cap(v + 13)} s/8+22:${cap(v + 15)} s/8+24:${cap(v + 17)}`;
// A snare roll across a whole bar, crescendoing, every hit late.
const snareRoll = (from, to) =>
  times(16, (i) => `s/16+${8 + (i % 4) * 3}:${cap(from + Math.round(((to - from) * i) / 15))}`)
    .join(' ');

// ------------------------------------------------------------------------------ the theme, stated
// Motif: A4 D5 E5, quarter quarter half - up a fourth, then one step, held. Every long note sits on
// its bar's chord; the passing notes are eighths off the beat, so the tune moves by step without
// ever fighting the pad, and the leaps are saved for the phrase's high points.
const THEME = [
  [[69, '4'], [74, '4'], [76, '2']], //             Dadd9:  A  D  E
  [[78, '4.'], [76, '8'], [74, '2']], //            Bm:     F# E  D
  [[76, '4.'], [74, '8'], [71, '2']], //            G6:     E  D  B
  [[73, '4.'], [71, '8'], [69, '2']], //            A:      C# B  A
  [[69, '4'], [74, '4'], [76, '4'], [78, '4']], //  Dadd9:  A  D  E  F#
  [[81, '4.'], [78, '8'], [76, '2']], //            F#m7:   A  F# E
  [[79, '4.'], [78, '8'], [76, '2']], //            G6:     G  F# E
  [[73, '4.'], [71, '8'], [69, '2']], //            A:      C# B  A
];
// The second statement: the same tune, but its last bar opens into a rising turn toward the lift.
const THEME_TURN = [
  ...THEME.slice(0, 7),
  [[73, '4'], [76, '8'], [81, '2'], [null, '8']], // A:      C# E  A
];
// The lift: the motif's descent and its rise, sequenced up the harmony.
const LIFT = [
  [[78, '4.'], [76, '8'], [74, '2']], //            Bm:     F# E  D
  [[79, '4.'], [78, '8'], [76, '2']], //            G6:     G  F# E
  [[78, '4.'], [76, '8'], [74, '2']], //            Dadd9:  F# E  D
  [[76, '4.'], [74, '8'], [73, '2']], //            A:      E  D  C#
  [[74, '4.'], [76, '8'], [78, '2']], //            Bm:     D  E  F#
  [[83, '4.'], [81, '8'], [79, '2']], //            G6:     B  A  G
  [[79, '4.'], [78, '8'], [76, '2']], //            Em:     G  F# E
  [[76, '4.'], [74, '8'], [73, '2']], //            A:      E  D  C#
];
// The pedal: the motif turning over an A pedal, climbing to B5 and falling back to A4.
const PEDAL = [
  [[78, '4.'], [76, '8'], [74, '2']], //            D/A:    F# E  D
  [[74, '4.'], [76, '8'], [78, '2']], //            Bm7/A:  D  E  F#
  [[79, '4.'], [81, '8'], [83, '2']], //            Gadd9:  G  A  B
  [[81, '4.'], [79, '8'], [76, '2']], //            A:      A  G  E
  [[78, '4.'], [76, '8'], [74, '2']], //            Bm:     F# E  D
  [[76, '4.'], [74, '8'], [71, '2']], //            G6:     E  D  B
  [[73, '4.'], [71, '8'], [69, '2']], //            A:      C# B  A
  [[76, '4.'], [73, '8'], [69, '2']], //            A:      E  C# A
];
// The pull-back: two quiet brass bars over the borrowed C major, then the brass lets go.
const PULL = [R, R,
  [[76, '4.'], [74, '8'], [72, '2']], //            C:      E  D  C
  [[null, '4'], [76, '4'], [79, '2']], //           C:      -  E  G
  R, R, R, R];
// The build: four bars the ostinato owns, then the fragments climb with the sequence.
const BUILD = [R, R, R, R,
  [[78, '4.'], [76, '8'], [74, '2']], //            Bm:     F# E  D
  [[76, '4.'], [74, '8'], [71, '2']], //            G6:     E  D  B
  [[74, '4'], [76, '4'], [78, '4'], [81, '4']], //  Dadd9:  D  E  F# A
  [[81, '4.'], [79, '8'], [76, '2']], //            A:      A  G  E
  [[79, '4.'], [78, '8'], [76, '2']], //            Em:     G  F# E
  [[81, '4.'], [78, '8'], [76, '2']], //            F#m7:   A  F# E
  [[83, '4.'], [81, '8'], [79, '2']], //            G6:     B  A  G
  [[76, '4.'], [78, '8'], [81, '2']], //            A:      E  F# A
  [[83, '4.'], [81, '8'], [79, '2']], //            Em:     B  A  G
  [[81, '4.'], [79, '8'], [78, '2']], //            F#m7:   A  G  F#
  [[79, '4.'], [81, '8'], [83, '2']], //            G6:     G  A  B
  [[81, '4.'], [83, '8'], [81, '2']], //            A:      A  B  A
];
// The roll: two bars the kit owns, then the brass falls from its peak back to A4 for the theme.
const ROLL = [R, R,
  [[74, '4.'], [76, '8'], [78, '2']], //            Bm:     D  E  F#
  [[78, '4.'], [79, '8'], [81, '2']], //            Dadd9:  F# G  A
  [[83, '4.'], [81, '8'], [79, '2']], //            G6:     B  A  G
  [[81, '4.'], [79, '8'], [76, '2']], //            A:      A  G  E
  [[76, '4.'], [74, '8'], [69, '2']], //            Asus4:  E  D  A
  [[76, '4.'], [73, '8'], [null, '2']], //          A:      E  C# -
];
// The last statement: the theme lifted, reaching C#6 at its peak.
const FINAL = [
  [[69, '4'], [74, '4'], [76, '2']], //             Dadd9:  A  D  E
  [[78, '4.'], [76, '8'], [74, '2']], //            Bm:     F# E  D
  [[76, '4.'], [78, '8'], [79, '2']], //            G6:     E  F# G
  [[81, '4.'], [79, '8'], [76, '2']], //            A:      A  G  E
  [[79, '4.'], [81, '8'], [83, '2']], //            Em:     G  A  B
  [[85, '4.'], [81, '8'], [78, '2']], //            F#m7:   C# A  F#
  [[83, '4.'], [81, '8'], [79, '2']], //            G6:     B  A  G
  [[81, '4.'], [79, '8'], [76, '2']], //            A:      A  G  E
];
// The outro: the theme broken into falling steps, ending on one held D5.
const OUTRO = [
  [[78, '4.'], [76, '8'], [74, '2']], //            Dadd9:  F# E  D
  [[76, '4.'], [74, '8'], [71, '2']], //            G6:     E  D  B
  [[78, '4.'], [76, '8'], [74, '2']], //            Dadd9:  F# E  D
  [[71, '4.'], [74, '8'], [78, '2']], //            Bm:     B  D  F#
  [[76, '4.'], [74, '8'], [71, '2']], //            G6:     E  D  B
  [[73, '4.'], [71, '8'], [69, '2']], //            A:      C# B  A
  [[74, '4.'], [76, '8'], [74, '2']], //            Asus4:  D  E  D
  [[74, '1']], //                                   D:      D held
];
// The brass fragments that breathe the motif before the theme.
const MOTIF = [[69, '4'], [74, '4'], [76, '2']];
const MOTIF_HIGH = [[71, '4'], [74, '4'], [76, '2']];

// -------------------------------------------------------------------------------------------- assemble
const KEYS = ['brass', 'choir', 'pad', 'pizz', 'bells', 'ost', 'bass', 'kit'];
const b = sectionBuilder(KEYS, {
  exact: true,
  barTicks: 3840,
  label: (name, start, end) => `${start}-${end}: ${name}`,
});

// 1-8: bells and pizzicato alone. The bells carry the motif an octave up; nothing else plays.
b.section(FORM[0].name, 8, {
  bells: phrase([BELL_OPEN, BELL_TURN, R, R,
    [[null, '2'], [81, '8'], [86, '4.']],
    BELL_TURN,
    [[76, '8'], [79, '8'], [83, '4'], [null, '2']],
    [[85, '8'], [83, '8'], [81, '4'], [null, '2']]], 88),
  pizz: [R, R, ...each(3, 6, (bar, i) => pizzBar(at(bar), 62 + i, i))],
});

// 9-16: the ostinato enters in eighths and the brass breathes the motif twice, quietly.
b.section(FORM[1].name, 8, {
  brass: phrase([R, R, R, R, MOTIF, R, MOTIF_HIGH, R], 80, 0, 0.5),
  bells: phrase([[[null, '4'], [81, '4'], [86, '2']], R, R, R, R, R, R,
    [[null, '2'], [85, '4'], [81, '4']]], 84),
  pizz: each(9, 8, (bar, i) => pizzBar(at(bar), 60 + i, i + 1)),
  ost: each(9, 8, (bar, i) => ostBar(at(bar), 'A', 84, i)),
});

// 17-24: the theme, quietly, over the ostinato.
b.section(FORM[2].name, 8, {
  brass: phrase(THEME, 86, 0, 0.5),
  bells: phrase([[[null, '2'], [86, '8'], [81, '4.']], R, R, R,
    [[null, '4'], [81, '4'], [86, '2']], R, R, R], 82),
  pizz: each(17, 8, (bar, i) => pizzBar(at(bar), 64, i + 2)),
  ost: each(17, 8, (bar, i) => ostBar(at(bar), 'A', 98, i + 3)),
});

// 25-32: the theme again, the bells answering in its rests, and a roll through bar 32 into the lift.
b.section(FORM[3].name, 8, {
  brass: phrase(THEME_TURN, 90, 1, 0.5),
  bells: phrase([R,
    [[null, '4'], [null, '4'], [86, '8'], [90, '8'], [88, '8'], [86, '8']], R,
    [[null, '4'], [null, '4'], [85, '8'], [81, '8'], [88, '8'], [85, '8']], R,
    [[null, '4'], [null, '4'], [90, '8'], [88, '8'], [85, '8'], [81, '8']], R, R], 84),
  pizz: each(25, 8, (bar, i) => pizzBar(at(bar), 66, i + 3)),
  ost: each(25, 8, (bar, i) => ostBar(at(bar), 'A', 100, i + 5)),
  kit: [R, R, R, R, R, R, R, snareRoll(64, 108)],
});

// 33-40: the lift. The pad and the bass join for the first time; the choir waits for the pedal.
b.section(FORM[4].name, 8, {
  brass: phrase(LIFT, 92, 0, 0.5),
  pad: each(33, 8, (bar, i) => padBar(at(bar), 96, i)),
  pizz: each(33, 8, (bar, i) => pizzBar(at(bar), 70, i)),
  bells: phrase([[[null, '2'], [86, '4'], [90, '4']], R, R, R,
    [[null, '2'], [86, '4'], [90, '4']], R, R, R], 88),
  ost: each(33, 8, (bar, i) => ostBar(at(bar), 'B', 104, i)),
  bass: each(33, 8, (bar, i) => bassBar(at(bar), 92, 'hold', i)),
  kit: [kickCrash(110), R, kickTom(106), R, kickCrash(106), R, kickTom(106), tomFill(100)],
});

// 41-48: the pedal on A under moving chords. The choir holds D5 for three bars, then the theme
// falls back to A4 and the kit fills into the pull-back.
b.section(FORM[5].name, 8, {
  brass: phrase(PEDAL, 96, 1, 0.5),
  choir: choirLine([74, 74, 74, 73, 74, 71, 73, 69], 88, 1, 1),
  pad: each(41, 8, (bar, i) => padBar(at(bar), 98, i)),
  pizz: each(41, 8, (bar, i) => pizzBar(at(bar), 72, i + 1)),
  bells: phrase([[[null, '2'], [81, '4'], [86, '4']], R, R, R,
    [[null, '2'], [83, '4'], [86, '4']], R, R, R], 86),
  // The ostinato lets go two bars before the pull-back, so its delay and hall ring out before bar
  // 49 instead of hanging over the quietest moment of the song.
  ost: [...each(41, 6, (bar, i) => ostBar(at(bar), 'B', 106, i + 2)), R, R],
  bass: each(41, 8, (bar, i) => bassBar(at(bar), 94, 'hold', i)),
  kit: [kickCrash(108), R, kickTom(104), R, kickCrash(106), R, kickDown(104), tomFill(100)],
});

// 49-56: the pull-back. Everything drops out but the bells, the pizzicato and two quiet brass bars
// over the borrowed C major - the quietest moment since the opening. A small roll in 56 starts the
// build.
b.section(FORM[6].name, 8, {
  brass: phrase(PULL, 68, 2),
  bells: phrase([BELL_OPEN, BELL_TURN,
    [[null, '2'], [79, '4'], [84, '4']], R,
    [[null, '4'], [83, '4'], [86, '2']], R,
    [[null, '2'], [85, '4'], [81, '4']], R], 76),
  pizz: each(49, 8, (bar, i) => pizzBar(at(bar), 58 + i, i + 2)),
  kit: [R, R, R, R, R, R, R, snareRoll(48, 92)],
});

// 57-64: the ostinato returns with the bass, and the brass answers in fragments from bar 61.
b.section(FORM[7].name, 8, {
  brass: phrase(BUILD.slice(0, 8), 84, 0, 0.5),
  pizz: each(57, 8, (bar, i) => pizzBar(at(bar), 66, i)),
  bells: phrase([[[null, '2'], [86, '4'], [90, '4']], R, R, R, R, R,
    [[null, '2'], [81, '4'], [86, '4']], R], 82),
  ost: each(57, 8, (bar, i) => ostBar(at(bar), 'A', 98 + i, i)),
  bass: each(57, 8, (bar, i) => bassBar(at(bar), 84, 'two', i)),
  kit: [kickDown(96), R, kickDown(96), R, kickTom(98), R, kickTom(100), tomFill(96)],
});

// 65-72: the rising sequence. Pad and choir come back, the brass climbs, the kit gets busier.
b.section(FORM[8].name, 8, {
  brass: phrase(BUILD.slice(8), 90, 0, 1),
  choir: choirLine([71, 73, 74, 76, 79, 78, 79, 76], 84, 2, 1),
  pad: each(65, 8, (bar, i) => padBar(at(bar), 98, i)),
  pizz: each(65, 8, (bar, i) => pizzBar(at(bar), 72, i + 1)),
  bells: phrase([[[null, '2'], [83, '4'], [88, '4']], R,
    [[null, '2'], [83, '4'], [86, '4']], R,
    [[null, '2'], [79, '4'], [83, '4']], R, R, R], 84),
  ost: each(65, 8, (bar, i) => ostBar(at(bar), 'B', 106, i + 3)),
  bass: each(65, 8, (bar, i) => bassBar(at(bar), 88, 'two', i)),
  kit: [kickCrash(104), kickDown(98), kickCrash(104), tomFill(96), kickCrash(106),
    kickDown(100), kickCrash(106), snareRoll(76, 112)],
});

// 73-80: the roll. The ostinato goes to sixteenths, the kit crescendos through 79 and 80, and the
// brass falls back from B5 to A4 so the theme has somewhere to land.
b.section(FORM[9].name, 8, {
  brass: phrase(ROLL, 94, 1, 0.5),
  choir: choirLine([74, 73, 74, 78, 79, 76, 76, 76], 86, 3, 1),
  pad: each(73, 8, (bar, i) => padBar(at(bar), 100, i)),
  pizz: each(73, 8, (bar, i) => pizzBar(at(bar), 76, i + 3)),
  bells: phrase([[[null, '2'], [83, '4'], [86, '4']], R, R, R,
    [[null, '2'], [83, '4'], [86, '4']], R, R, R], 86),
  ost: each(73, 8, (bar, i) => ostBar(at(bar), 'C', 106 + i, i)),
  bass: each(73, 8, (bar, i) => bassBar(at(bar), 92, 'two', i)),
  kit: [kickCrash(110), kickTom(100), kickCrash(110), tomFill(100), kickCrash(112),
    tomFill(104), snareRoll(74, 110), snareRoll(86, 120)],
});

// 81-88: the climax - the theme in full on brass and choir over everything.
b.section(FORM[10].name, 8, {
  brass: phrase(THEME, 104, 0, 0.5),
  choir: choirLine([74, 74, 74, 73, 74, 73, 74, 73], 92, 0, 1),
  pad: each(81, 8, (bar, i) => padBar(at(bar), 104, i)),
  pizz: each(81, 8, (bar, i) => pizzBar(at(bar), 80, i)),
  bells: phrase([[[null, '2'], [86, '4'], [90, '4']], R, R, R,
    [[null, '2'], [81, '4'], [86, '4']], R, R, R], 90),
  ost: each(81, 8, (bar, i) => ostBar(at(bar), 'C', 110, i)),
  bass: each(81, 8, (bar, i) => bassBar(at(bar), 96, 'two', i)),
  kit: [kickCrash(116), kickDown(100), kickCrash(110), tomFill(104), kickCrash(114),
    kickDown(102), kickCrash(110), snareRoll(84, 118)],
});

// 89-96: the theme answered higher, reaching C#6, the choir doubling its long notes.
b.section(FORM[11].name, 8, {
  brass: phrase(FINAL, 106, 1, 0.5),
  choir: choirLine([74, 74, 74, 76, 79, 78, 79, 76], 94, 1, 1),
  pad: each(89, 8, (bar, i) => padBar(at(bar), 104, i)),
  pizz: each(89, 8, (bar, i) => pizzBar(at(bar), 82, i + 1)),
  bells: phrase([[[null, '2'], [86, '4'], [90, '4']], R, R, R,
    [[null, '2'], [83, '4'], [88, '4']],
    [[null, '2'], [81, '4'], [85, '4']], R, R], 90),
  ost: each(89, 8, (bar, i) => ostBar(at(bar), 'C', 112, i + 2)),
  bass: each(89, 8, (bar, i) => bassBar(at(bar), 98, 'two', i)),
  kit: [kickCrash(118), kickDown(102), kickCrash(112), tomFill(106), kickCrash(116),
    kickDown(102), kickCrash(112), snareRoll(88, 120)],
});

// 97-104: the outro. The brass falls back through the theme, the ostinato and the pizzicato let go,
// and the last bar holds one open D: bass D2, pad D3-A3-D4, choir A4, brass D5.
b.section(FORM[12].name, 8, {
  brass: phrase(OUTRO, 94, 2, -1),
  choir: choirLine([74, 74, 74, 74, 71, 73, 74, 69], 90, 2, -1),
  pad: each(97, 8, (bar, i) => padBar(at(bar), 102, i)),
  pizz: [...each(97, 5, (bar, i) => pizzBar(at(bar), 70 - i * 4, i)), R, R, R],
  bells: phrase([[[null, '2'], [90, '4'], [86, '4']], R, R, R,
    [[null, '4'], [83, '4'], [86, '2']], R, R, [[86, '4'], [null, '4'], [null, '2']]], 86),
  ost: [...each(97, 6, (bar, i) => ostBar(at(bar), 'B', 96 - i, i)), R, R],
  bass: each(97, 8, (bar, i) => bassBar(at(bar), 84, 'hold', i)),
  kit: [kickCrash(112), kickDown(104), kickCrash(106), kickTom(100), kickDown(100), R,
    snareRoll(54, 96), kickCrash(112)],
});

// ------------------------------------------------------------------------------------------- text
const FORM_NOTE = `# First Flight, an original film cue by MiMo V2.6 Flash & SZ. A bright, soaring
# cue for the Cinematic style: 112 BPM in D major, 104 bars, 3:43, from an uncertain ground-level
# start to a first flight seen from above. It opens almost empty - bells and pizzicato hint the
# motif A4-D5-E5, up a fourth and one step - then the analog-synth ostinato starts, the FM brass
# states the theme quietly, pad, bass and the aah choir join for the lift over a pedal on A, and the
# pull-back drops everything but bells, pizzicato and two quiet brass bars over a borrowed C major.
# The build climbs back on the ostinato with the kit rolling, the climax states the theme in full on
# brass and choir over everything, and the outro settles onto one held, open D.
#
# Lineup: brass (lead, bank:fm-brass) carries the theme; choir (pad, bank:choir-aah) doubles its
# long notes as one held tone a bar and swells under the big statements; pad (synth-pad, the
# style's glass pad) holds open fifths; pizzicato (counter, bank:pizzicato) and FM bells (counter,
# bank:fm-bells) sparkle above the middle; the analog-synth ostinato (arp) drives on the grid with
# no offsets; the warm bass sits under the kick; the studio kit plays hits, tom answers, fills and
# rolls at the turns of the story, never a groove. No wordless vocal lead (Cinematic would play it
# as the overdriven lead guitar), no lead guitar, no piano, no cello, no string section.
#
# The form, one change every eight bars: 1-8 bells and pizzicato alone; 9-16 the ostinato starts and
# the brass breathes the motif; 17-24 the theme, quietly; 25-32 the theme again with the bells
# answering in its rests; 33-40 the lift, pad and bass joining; 41-48 the A pedal under D/A, Bm7/A
# and Gadd9 with the choir; 49-56 the pull-back over C major, the quietest since the opening; 57-64
# the build on the ostinato and the bass; 65-72 a rising sequence; 73-80 the roll into the climax;
# 81-88 the theme in full; 89-96 the theme answered higher; 97-104 the outro on one open chord.
#
# The harmony is written once below, one chord symbol a bar, and every pitched part follows it. The
# long notes all sit on their bar's chord and the passing notes are eighths off the beat, so the
# parts agree without the tune being flattened; the pad plays open fifths to leave the melody its
# colour tones. Feel: the brass, the choir, the pizzicato and every drum hit lean in late and never
# early, their velocities are uneven and swell across phrases and sections; the ostinato stays tight
# on the grid, so the drive never wobbles.
#
# Built by its own generator, tools/arranger/first-flight.mjs, from tools/arranger/lib.mjs: the
# form, the theme and its developments, the voicings, the figures, the velocities and the
# microtiming all live there.`;

const TEXT = [
  FORM_NOTE,
  '#',
  ...HEAD.chordLines,
  '#',
  '# Form:',
  ...HEAD.formLines,
  '#',
  'title: First Flight',
  'composer: MiMo V2.6 Flash & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: cinematic',
  'key: D major',
  'tempo: 112',
  'time: 4/4',
  'about: A bright, soaring film cue in D major at 112 BPM: bells and pizzicato hint the motif over '
    + 'an almost empty opening, an analog-synth ostinato starts and the brass states the theme '
    + 'quietly, pad, bass and a choir lift it over a pedal on A, a quiet break turns to C major '
    + 'before the kit rolls into the climax, where the theme lands in full on brass and choir and '
    + 'settles onto one held, open D.',
].join('\n');

const TRACKS = [
  ['brass', 'track brass role=lead inst=bank:fm-brass vol=1 pan=-0.08 vol@97-104=0.9..0.75'],
  ['choir', 'track choir role=pad inst=bank:choir-aah vol=0.85 pan=0.14 vol@41-48=0.8..1 '
    + 'vol@65-80=0.7..1 vol@97-104=1..0.75'],
  ['pad', 'track pad role=pad inst=synth-pad vol=1 pan=-0.16 vol@97-104=1..0.7'],
  ['pizz', 'track pizz role=counter inst=bank:pizzicato vol=0.7 pan=0.32'],
  ['bells', 'track bells role=counter inst=bank:fm-bells vol=0.6 pan=-0.34'],
  ['ost', 'track ost role=arp inst=analog-synth vol=1 pan=0.2'],
  ['bass', 'track bass role=bass inst=warm-bass vol=0.28 pan=0'],
  ['kit', 'track kit role=drums inst=studio-kit vol=0.85 pan=0'],
];

const text = `${TEXT}

${TRACKS.map(([key, head]) => `${head}\n${b.block(key, { perRow: 4, collapseRests: true })}`).join('\n\n')}
`;

const path = saveSong(out, 'first-flight.song', text);
console.log(`wrote ${path} (${TOTAL} bars)`);