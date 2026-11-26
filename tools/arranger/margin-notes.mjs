// Margin Notes, by Muse Ember and SZ. An original lo-fi study beat for the Lo-fi style:
// 74 BPM in Eb major, 112 bars (about 6:00), built by its own script from lib.mjs.
//
// STUDY PLAN (written before the notes, as the Lo-fi notes ask)
// Lineup (track, role, instrument):
//   guitar   role=lead    inst=nylon-guitar   the lead; the patch sounds an octave below the
//                                               written note, so it is written G5-G6 to sound
//                                               G4-G5, above the piano's top (Bb4)
//   piano    role=chords  inst=grand-piano    soft felt-like chords, closed triads and plain 7ths
//   trumpet  role=counter inst=soft-lead      the style's muted trumpet, answering only, in B
//   pad      role=pad     (tape-pad)          root and fifth only, in B sections only
//   bass     role=bass    inst=string-bass    low, under the kick, never louder than it
//   drums    role=drums   (dusty-kit)         rimshot backbeat in A, snare in B, softer kit
// Motif (guitar, 4 beats, mostly stepwise, long rests between phrases):
//   G4/4  Bb4/8  C5/8  Bb4/2  (as heard) - the whole tune is this cell repeated, sequenced
//   and answered. Pitches below are as heard.
//   Phrase A (8 bars):  G Bb C Bb | C Bb G Ab Bb | C Eb5 D5 C | D Bb C Ab Bb |
//                       Bb D C Eb5 | Eb5 C Bb | Ab Eb5 D5 C | D Bb Ab
//   Phrase A' (A3 second half, A4 first half): bars 1-4 as A, then sequenced up at the turn
//                       Eb5 D5 Eb5 G5 | G5 Eb5 C5 | F5 Eb5 D5 C5 | D5 Bb C5 Bb
//   Phrase A'' (A4 second half): the same contour in halves and wholes, half the notes.
//   Outro: A's first four bars, then fragments that thin to one Bb over the last Bb7.
//   The trumpet answers it a third lower, in quarters, in the guitar's rests in B.
// Form (bar ranges, what enters and leaves):
//   1-4    Intro: piano alone (whole-bar rolled chords) over the style's crackle.
//   5-12   A1: guitar over piano. No kit, no bass.
//   13-20  A2: the kit (rim, not snare) and bass enter.
//   21-36  B: new chords through IV (Ab) and the borrowed iv (Abm) at each phrase turn;
//          tape pad enters, muted trumpet answers the guitar in its gaps, snare replaces rim.
//   37-52  Breakdown: kit, bass and pad drop out; piano and guitar trade phrases.
//   53-68  A again: kit and bass back, piano voicing moves up an octave on top.
//   69-84  B again: pad and trumpet back, bass turns to a root-root-fifth walk.
//   85-100 A once more: second half thins to half-note bass and a sparser kit.
//   101-108 Outro: kit, bass and trumpet leave; guitar and piano only.
//   109-112 Outro ends as the intro began: piano alone, Eb Cm7 Ab Eb, so bar 112
//          leads back into bar 1 with no bump (Eb into Eb) when repeat is on.
// Human feel: every part shares one 16th swing (odd 16ths +38 ticks, about 58%); the rim
// and snare drag +18 to +26, the guitar sits +10 to +18 behind, piano chords are rolled
// bottom to top (+6 ticks per note), the kick stays on the grid, velocities are uneven.
//   node tools/arranger/margin-notes.mjs [outDir]
import {
  clampVelocity, FLATS, formHeader, noteName, offsetText, outDir, R, saveSong, sectionBuilder,
  splitDuration,
} from './lib.mjs';

const out = outDir();
const nm = (m) => noteName(m, FLATS);

// ----------------------------------------------------------------------------- harmony
// Eb major (Eb F G Ab Bb C D). One voicing table: piano closed voicings in the middle,
// bass root (written, the string bass sounds an octave below), pad as root and fifth only
// so no lead colour note sits a half step against it. The borrowed iv is Abm (Ab B Eb).
const VOICE = {
  Ebmaj7: { piano: [51, 55, 58, 62], bass: 51, fifth: 58 },
  Cm7: { piano: [48, 51, 55, 58], bass: 48, fifth: 55 },
  Abmaj7: { piano: [56, 60, 63, 67], bass: 56, fifth: 63 },
  Bb7: { piano: [58, 62, 65, 68], bass: 58, fifth: 65 },
  Fm7: { piano: [53, 56, 60, 63], bass: 53, fifth: 60 },
  Ab: { piano: [56, 60, 63], bass: 56, fifth: 63 },
  Abm: { piano: [56, 59, 63], bass: 56, fifth: 63 },
};
// The bass role tops out at C4, so its fifth sits below the root (root - 5) instead of
// above it; the pad keeps the fifth above, where its range allows.
for (const v of Object.values(VOICE)) v.bassFifth = v.bass - 5;
const A_PROG = ['Ebmaj7', 'Cm7', 'Abmaj7', 'Bb7', 'Ebmaj7', 'Cm7', 'Fm7', 'Bb7'];
const B_ONE = ['Ebmaj7', 'Ab', 'Abm', 'Ebmaj7', 'Fm7', 'Bb7', 'Ebmaj7', 'Bb7'];
const B_TWO = ['Ebmaj7', 'Ab', 'Abm', 'Ebmaj7', 'Cm7', 'Abm', 'Bb7', 'Ebmaj7'];
const FORM = [
  { name: 'Intro: piano alone over the crackle', bars: 'Ebmaj7 Cm7 Abmaj7 Bb7' },
  { name: 'A1: guitar over piano, no kit and no bass', bars: A_PROG.join(' ') },
  { name: 'A2: the rim kit and the bass enter', bars: A_PROG.join(' ') },
  { name: 'B1: through IV and the borrowed iv, the trumpet answers', bars: B_ONE.join(' ') },
  { name: 'B2: the Abm turn again, the trumpet answers lower', bars: B_TWO.join(' ') },
  { name: 'Breakdown 1: kit and bass out, guitar leads the trade', bars: A_PROG.join(' ') },
  { name: 'Breakdown 2: piano leads the trade, the guitar answers in fragments', bars: A_PROG.join(' ') },
  { name: 'A3 first half: kit and bass back, piano voicing up', bars: A_PROG.join(' ') },
  { name: 'A3 second half: ghost hats join the rim groove', bars: A_PROG.join(' ') },
  { name: 'B3 first half: pad and trumpet back', bars: B_ONE.join(' ') },
  { name: 'B3 second half: the borrowed iv turn, trumpet lower', bars: B_TWO.join(' ') },
  { name: 'A4 first half: the motif once more, sequenced up at the turn', bars: A_PROG.join(' ') },
  { name: 'A4 second half: half-note bass, sparser kit', bars: A_PROG.join(' ') },
  { name: 'Outro: guitar and piano only, thinning', bars: A_PROG.join(' ') },
  { name: 'Outro ends as the intro began: piano alone, back to Eb', bars: 'Ebmaj7 Cm7 Abmaj7 Ebmaj7' },
];
const HEAD = formHeader(FORM);
const TOTAL = HEAD.chords.length;
if (TOTAL !== 112) throw new Error(`the form is ${TOTAL} bars, wanted 112`);
const chordAt = HEAD.at;

// ------------------------------------------------------------------------------ the feel
// One swing for every part: an odd 16th starts 38 ticks late, so the first of a pair of
// 16ths takes 278 of 480 ticks (58%). On top of that each part leans its own way, and
// never by the same amount twice. Nothing starts early on a beat that changes chord.
const SWING = 38;
const DRIFT = [0, 4, -3, 6, 2, -2, 5, 1];
const driftFor = (bar, slot, seed) => DRIFT[(bar * 3 + slot * 5 + seed * 7) % DRIFT.length];
const wobble = (bar, slot, seed) => (((bar * 3 + slot * 7 + seed * 11) % 7) - 3) * 4;

// --------------------------------------------------------------------------- bar renderer
// Events are [slot, pitches, lenSlots, velDelta]; slot is a 16th index in the bar. A note
// on an odd 16th gets the swing, every note gets its part's lean and a small drift, and
// rests fill the gaps. Piano chords arrive as one event with several pitches and are
// rolled bottom to top by `roll` ticks per note (only the piano uses it).
function renderBar(events, bar, baseVel, lean, { roll = 0, seed = 0 } = {}) {
  if (!events.length) return R;
  const tokens = [];
  let cursor = 0;
  const ordered = [...events].sort((a, b) => a[0] - b[0]);
  for (const [slot, pitches, len, dv = 0] of ordered) {
    if (slot < cursor) throw new Error(`bar ${bar}: overlapping events at slot ${slot}`);
    if (slot > cursor) {
      tokens.push(...splitDuration((slot - cursor) * 240).map((d) => `r${d}`));
    }
    const pieces = splitDuration(len * 240);
    pieces.forEach((dur, i) => {
      const head = i === 0;
      const off = (head ? lean + (slot % 2 === 1 ? SWING : 0) + driftFor(bar, slot, seed) : 0);
      const vel = head ? clampVelocity(baseVel + dv + wobble(bar, slot, seed), 122) : null;
      if (Array.isArray(pitches)) {
        const body = `[${pitches.map(nm).join(' ')}]`;
        tokens.push(`${body}${dur}${head ? `${offsetText(off)}:${vel}` : '~'}`);
      } else {
        tokens.push(`${nm(pitches)}${dur}${head ? `${offsetText(off)}:${vel}` : '~'}`);
      }
    });
    cursor = slot + len;
  }
  if (cursor < 16) tokens.push(...splitDuration((16 - cursor) * 240).map((d) => `r${d}`));
  if (cursor > 16) throw new Error(`bar ${bar}: events run to slot ${cursor}`);
  return tokens.join(' ');
}
// A rolled piano chord is written as a 16th arpeggio bottom to top (see pianoBar):
// the score has no way to start one note a few ticks after another at the same time
// except by writing them in sequence, and the piano's decay carries them together.

// ------------------------------------------------------------------------------ the motif
// Phrase A as 16th-slot events [slot, pitch, len]. Every note that starts on a beat is a
// chord tone of its bar; passing notes sit on off-beats. Mostly steps and repeats.
// Pitches are as heard; guitarBarFrom writes them an octave up (see GUITAR_UP).
const MOTIF_A = [
  [[0, 67, 4], [4, 70, 2], [6, 72, 2], [8, 70, 8]],
  [[0, 72, 4], [4, 70, 4], [8, 67, 2], [10, 68, 2], [12, 70, 4]],
  [[0, 72, 8], [8, 75, 2], [10, 74, 2], [12, 72, 4]],
  [[0, 74, 4], [4, 70, 2], [6, 72, 2], [8, 68, 4], [12, 70, 4]],
  [[0, 70, 8], [8, 74, 2], [10, 72, 2], [12, 75, 4]],
  [[0, 75, 8], [8, 72, 4], [12, 70, 4]],
  [[0, 68, 8], [8, 75, 2], [10, 74, 2], [12, 72, 4]],
  [[0, 74, 8], [8, 70, 4], [12, 68, 4]],
];
// Phrase A': the first half of A, then the motif sequenced up at the turn, climbing to G5
// before it falls back to Bb. Beats still land on chord tones.
const MOTIF_A_UP = [
  ...MOTIF_A.slice(0, 4),
  [[0, 75, 8], [8, 74, 2], [10, 75, 2], [12, 79, 4]],
  [[0, 79, 8], [8, 75, 4], [12, 72, 4]],
  [[0, 77, 8], [8, 75, 2], [10, 74, 2], [12, 72, 4]],
  [[0, 74, 4], [4, 70, 2], [6, 72, 2], [8, 70, 8]],
];
// Phrase A'': A's contour stretched to halves and wholes, for the thinning A4 second half.
const MOTIF_A_WIDE = [
  [[0, 67, 8], [8, 70, 8]],
  [[0, 72, 8], [8, 67, 8]],
  [[0, 72, 12], [12, 75, 4]],
  [[0, 74, 8], [8, 70, 8]],
  [[0, 70, 16]],
  [[0, 75, 8], [8, 72, 8]],
  [[0, 68, 8], [8, 72, 8]],
  [[0, 74, 8], [8, 70, 8]],
];
// Outro: A's first four bars, then fragments that thin to a lone Bb over the last Bb7,
// left for the piano's Eb in bar 109 to answer.
const MOTIF_OUTRO = [
  ...MOTIF_A.slice(0, 4),
  [[0, 70, 8], [8, 67, 8]],
  [[0, 67, 16]],
  [[0, 72, 8], [8, 68, 8]],
  [[0, 70, 8]],
];
// One guitar bar per chord, for the B sections (the guitar only plays the first two bars
// of each four, the trumpet answers in the other two).
const GUITAR_BY_CHORD = {
  Ebmaj7: MOTIF_A[0],
  // In B the pad holds the Cm7 fifth (G) all bar, so the guitar drops the Ab passing
  // note it uses in A and walks C Bb G Bb on chord tones alone.
  Cm7: [[0, 72, 4], [4, 70, 4], [8, 67, 4], [12, 70, 4]],
  Fm7: MOTIF_A[6],
  Bb7: [[0, 74, 4], [4, 70, 2], [6, 72, 2], [8, 68, 4], [12, 70, 4]],
  Ab: [[0, 72, 4], [4, 70, 1], [5, 68, 3], [8, 67, 1], [9, 68, 3], [12, 72, 4]],
  Abm: [[0, 75, 2], [2, 73, 2], [4, 71, 2], [6, 72, 2], [8, 68, 4], [12, 71, 4]],
};
// The trumpet answers a third lower, quarters and short notes only, never a long held
// tone in the guitar's register.
const TRUMPET_BY_CHORD = {
  Ebmaj7: [[0, 63, 4], [4, 67, 4], [8, 67, 2], [10, 65, 2], [12, 63, 4]],
  Ab: [[0, 63, 4], [4, 68, 4], [8, 67, 2], [10, 68, 2], [12, 72, 4]],
  Abm: [[0, 63, 4], [4, 59, 4], [8, 68, 4], [12, 63, 4]],
  Fm7: [[0, 63, 4], [4, 65, 4], [8, 68, 1], [9, 68, 3], [12, 63, 4]],
  Bb7: [[0, 65, 4], [4, 68, 4], [8, 65, 4], [12, 62, 4]],
  Cm7: [[0, 63, 4], [4, 67, 4], [8, 65, 2], [10, 63, 2], [12, 60, 4]],
};

// ----------------------------------------------------------------------------------- parts
// Each builder returns one bar string for a 1-based bar, or R when the part rests.
const rolledUp = (chord, dv = 0) => chord.map((p, i) => [i, p, i === chord.length - 1 ? 4 : 1, dv + i * 2]);
const pianoBar = (bar, kind) => {
  const v = VOICE[chordAt(bar)];
  const chord = kind === 'high' ? [...v.piano, v.piano[0] + 12] : v.piano;
  if (kind === 'whole') {
    return renderBar(rolledUp(chord), bar, 58, 10, { seed: 2 });
  }
  if (kind === 'solo') {
    return renderBar([
      ...rolledUp(chord, 4), [8, chord, 4, 0], [12, chord, 2, -2], [15, chord[chord.length - 1], 1, -14],
    ], bar, 70, 12, { seed: 2 });
  }
  const beat3 = kind === 'open' ? [chord[0], chord[1]] : chord;
  return renderBar([
    ...rolledUp(chord, 4), [8, beat3, 4, -4],
    [15, chord[chord.length - 1], 1, -14],
  ], bar, kind === 'soft' ? 62 : 72, 12, { seed: 2 });
};
// nylon-guitar sounds an octave below the written note, so every guitar pitch is written
// 12 up to be heard where the tables above say, clear of the piano.
const GUITAR_UP = 12;
const guitarBarFrom = (bar, events) => renderBar(events.map(([s, p, l]) => [s, p + GUITAR_UP, l, 0]), bar, 100, 14, { seed: 1 });
const trumpetBarFrom = (bar, events) => renderBar(events.map(([s, p, l]) => [s, p, l, 0]), bar, 80, 16, { seed: 4 });
const padBar = (bar) => {
  const v = VOICE[chordAt(bar)];
  return renderBar([[0, [v.bass, v.fifth], 16, 0]], bar, 52, 10, { seed: 5 });
};
const bassBar = (bar, kind) => {
  const v = VOICE[chordAt(bar)];
  if (kind === 'walk') {
    return renderBar([[0, v.bass, 8, 4], [8, v.bass, 4, -2], [12, v.bassFifth, 4, 0]], bar, 62, 8, { seed: 3 });
  }
  if (kind === 'half') {
    // A half-note root, then the fifth as a short eighth (never held under the
    // guitar's passing notes, for the same reason as the pulse pattern).
    return renderBar([[0, v.bass, 8, 4], [8, v.bassFifth, 2, -2], [12, v.bass, 4, -4]], bar, 62, 8, { seed: 3 });
  }
  // The beat-3 fifth is only an eighth, so a passing note on the next eighth never
  // sounds over it (a half step above the Cm7 fifth is the guitar's Ab).
  return renderBar([[0, v.bass, 8, 4], [8, v.bassFifth, 2, 0], [12, v.bass, 2, -4], [14, v.bassFifth, 2, -6]], bar, 62, 8, { seed: 3 });
};
// Drums are written on the same 16th grid as chords of drum names.
function drumBar(bar, hits, seed = 6) {
  // Hits that share a slot merge into one chord token, so the kick, rim and hat can land
  // together as [k h] instead of one after another in time.
  const bySlot = new Map();
  for (const [slot, names, len, dv = 0] of hits) {
    const prev = bySlot.get(slot);
    if (prev) {
      if (prev.len !== len) throw new Error(`bar ${bar}: slot ${slot} has hits of different lengths`);
      prev.names.push(...names);
      prev.dv = Math.max(prev.dv, dv);
    } else {
      bySlot.set(slot, { names: [...names], len, dv });
    }
  }
  const tokens = [];
  let cursor = 0;
  for (const slot of [...bySlot.keys()].sort((a, b) => a - b)) {
    const { names, len, dv } = bySlot.get(slot);
    if (slot > cursor) tokens.push(...splitDuration((slot - cursor) * 240).map((d) => `r${d}`));
    const body = names.length > 1 ? `[${names.join(' ')}]` : names[0];
    const lean = names.includes('k') && names.length === 1 ? 0 : 14;
    const off = lean + (slot % 2 === 1 ? SWING : 0) + driftFor(bar, slot, seed);
    const vel = clampVelocity((names[0] === 'h' ? 46 : 82) + dv + wobble(bar, slot, seed), 122);
    for (const dur of splitDuration(len * 240)) tokens.push(`${body}${dur}${offsetText(off)}:${vel}`);
    cursor = slot + len;
  }
  if (cursor < 16) tokens.push(...splitDuration((16 - cursor) * 240).map((d) => `r${d}`));
  return tokens.join(' ');
}
const hats = (ghost) => {
  const list = [0, 2, 4, 6, 8, 10, 12, 14].map((s, i) => [s, ['h'], ghost && (s === 6 || s === 14) ? 1 : 2, i % 2 ? -8 : 2]);
  if (ghost) list.push([7, ['h'], 1, -16], [15, ['h'], 1, -18]);
  return list;
};
const rimGroove = (bar, ghost) => [
  [0, ['k'], 2, 4], [4, ['rim'], 2, 0], [8, ['k'], 2, 2], [12, ['rim'], 2, -2],
  ...hats(ghost),
  ...(ghost ? [[15, ['rim'], 1, -22]] : []),
];
const snareGroove = (bar, busy) => [
  [0, ['k'], 2, 4], [4, ['s'], 2, 2], [8, ['k'], 2, 2], [12, ['s'], 2, 0],
  ...(busy ? [[10, ['k'], 2, -4]] : []),
  ...hats(false),
];

// ------------------------------------------------------------------------------ sections
const keys = ['guitar', 'piano', 'trumpet', 'pad', 'bass', 'drums'];
const { tracks, section, block } = sectionBuilder(keys, {
  label: (name, start, end) => `${name} (${start}-${end})`,
  barTicks: 3840,
});
const barsRange = (from, count, fn) => Array.from({ length: count }, (_, i) => fn(from + i, i));

// Intro and final outro: piano alone, whole-bar rolled chords.
section(FORM[0].name, 4, {
  piano: barsRange(1, 4, (bar) => pianoBar(bar, 'whole')),
});
section(FORM[1].name, 8, {
  piano: barsRange(5, 8, (bar) => pianoBar(bar, 'soft')),
  guitar: barsRange(5, 8, (bar, i) => guitarBarFrom(bar, MOTIF_A[i])),
});
section(FORM[2].name, 8, {
  piano: barsRange(13, 8, (bar) => pianoBar(bar, 'base')),
  guitar: barsRange(13, 8, (bar, i) => guitarBarFrom(bar, MOTIF_A[i])),
  bass: barsRange(13, 8, (bar) => bassBar(bar, 'pulse')),
  drums: barsRange(13, 8, (bar, i) => drumBar(bar, rimGroove(bar, i >= 4))),
});
const bSection = (formIndex, from) => section(FORM[formIndex].name, 8, {
  piano: barsRange(from, 8, (bar) => pianoBar(bar, 'open')),
  guitar: barsRange(from, 8, (bar, i) => (i % 4 < 2 ? guitarBarFrom(bar, GUITAR_BY_CHORD[chordAt(bar)]) : R)),
  trumpet: barsRange(from, 8, (bar, i) => (i % 4 >= 2 ? trumpetBarFrom(bar, TRUMPET_BY_CHORD[chordAt(bar)]) : R)),
  pad: barsRange(from, 8, (bar) => padBar(bar)),
  bass: barsRange(from, 8, (bar) => bassBar(bar, 'walk')),
  drums: barsRange(from, 8, (bar, i) => drumBar(bar, snareGroove(bar, i >= 4))),
});
bSection(3, 21);
bSection(4, 29);
section(FORM[5].name, 8, {
  piano: barsRange(37, 8, (bar) => pianoBar(bar, 'soft')),
  guitar: barsRange(37, 8, (bar, i) => guitarBarFrom(bar, MOTIF_A[i])),
});
section(FORM[6].name, 8, {
  piano: barsRange(45, 8, (bar) => pianoBar(bar, 'solo')),
  guitar: barsRange(45, 8, (bar, i) => (i % 2 === 0 ? guitarBarFrom(bar, MOTIF_A[i]) : R)),
});
section(FORM[7].name, 8, {
  piano: barsRange(53, 8, (bar) => pianoBar(bar, 'high')),
  guitar: barsRange(53, 8, (bar, i) => guitarBarFrom(bar, MOTIF_A[i])),
  bass: barsRange(53, 8, (bar) => bassBar(bar, 'pulse')),
  drums: barsRange(53, 8, (bar, i) => drumBar(bar, rimGroove(bar, i >= 4))),
});
section(FORM[8].name, 8, {
  piano: barsRange(61, 8, (bar) => pianoBar(bar, 'high')),
  guitar: barsRange(61, 8, (bar, i) => guitarBarFrom(bar, MOTIF_A_UP[i])),
  bass: barsRange(61, 8, (bar) => bassBar(bar, 'pulse')),
  drums: barsRange(61, 8, (bar, i) => drumBar(bar, rimGroove(bar, true))),
});
bSection(9, 69);
bSection(10, 77);
section(FORM[11].name, 8, {
  piano: barsRange(85, 8, (bar) => pianoBar(bar, 'base')),
  guitar: barsRange(85, 8, (bar, i) => guitarBarFrom(bar, MOTIF_A_UP[i])),
  bass: barsRange(85, 8, (bar) => bassBar(bar, 'pulse')),
  drums: barsRange(85, 8, (bar, i) => drumBar(bar, rimGroove(bar, i >= 4))),
});
section(FORM[12].name, 8, {
  piano: barsRange(93, 8, (bar) => pianoBar(bar, 'base')),
  guitar: barsRange(93, 8, (bar, i) => guitarBarFrom(bar, MOTIF_A_WIDE[i])),
  bass: barsRange(93, 8, (bar) => bassBar(bar, 'half')),
  drums: barsRange(93, 8, (bar) => drumBar(bar, hats(false))),
});
section(FORM[13].name, 8, {
  piano: barsRange(101, 8, (bar) => pianoBar(bar, 'soft')),
  guitar: barsRange(101, 8, (bar, i) => guitarBarFrom(bar, MOTIF_OUTRO[i])),
});
section(FORM[14].name, 4, {
  piano: barsRange(109, 4, (bar) => pianoBar(bar, 'whole')),
});

const total = tracks.guitar.length;
if (total !== 112) throw new Error(`built ${total} bars, wanted 112`);
const HEADER = [
  ['guitar', 'track guitar role=lead inst=nylon-guitar vol=1 pan=-0.15'],
  ['piano', 'track piano role=chords inst=grand-piano vol=0.6 pan=0.2'],
  ['trumpet', 'track trumpet role=counter inst=soft-lead vol=0.7 pan=0.3'],
  ['pad', 'track pad role=pad vol=1'],
  ['bass', 'track bass role=bass inst=string-bass vol=0.38'],
  ['drums', 'track drums role=drums vol=1'],
];
const text = `# Margin Notes, by Muse Ember and SZ. A calm lo-fi study beat: a nylon guitar motif over
# felt grand-piano chords in Eb major at 74 BPM, a muted trumpet answering in the B sections,
# a rimshot Dusty-kit backbeat and a low string bass. Built by its own script,
# tools/arranger/margin-notes.mjs, started from tools/arranger/lib.mjs.
# Lineup: guitar (lead, nylon-guitar), piano (chords, grand-piano), trumpet (counter,
# soft-lead, B sections only), pad (tape-pad, root and fifth, B sections only), bass
# (bass, string-bass), drums (dusty-kit). Motif: G4/4 Bb4/8 C5/8 Bb4/2, developed
# stepwise through phrase A, sequenced up at the turn in the later A sections, stretched
# to halves near the end and answered by the trumpet in B. The guitar is written an
# octave up because the nylon-guitar patch sounds an octave below the written note. Form: 1-4 intro (piano
# alone), 5-12 A1 (guitar over piano), 13-20 A2 (rim kit and bass enter), 21-36 B
# (through IV and the borrowed iv Abm, pad and trumpet in), 37-52 breakdown (kit and
# bass out, piano and guitar trade phrases), 53-68 A again (piano voicing up),
# 69-84 B again, 85-100 A once more (half-note bass at the end), 101-108 outro
# (guitar and piano), 109-112 piano alone ending on Eb so the loop returns to bar 1.
${HEAD.chordLines.join('\n')}
${HEAD.formLines.join('\n')}
title: Margin Notes
composer: Muse Ember & SZ
year: 2026
source: original
category: originals
key: Eb major
style: lofi
tempo: 74
time: 4/4
about: A calm lo-fi study beat for a long stretch: a nylon guitar motif over felt piano chords, a muted trumpet answering in the middle, and a dusty rimshot backbeat that barely builds at all.

${HEADER.map(([key, head]) => `${head}\n${block(key)}`).join('\n\n')}
`;
saveSong(out, 'margin-notes.song', text);
console.log(`wrote ${out}/margin-notes.song (${total} bars)`);
