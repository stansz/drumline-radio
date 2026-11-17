// Sleepwalk, an original lo-fi waltz in A-flat major by ERNIE 5.5 Flash & SZ. A sleepy 3/4
// lullaby at 92 BPM, like a late-night record played on a warped turntable: a nylon guitar sings a
// short stepwise motif over a tape pad, the dusty kit drags a rim on the three, a warm bass leans on
// the downbeat, and a grand piano plays a soft broken waltz under it all. The middle turns to
// F minor, the second half answers the guitar with a sparse music box, and the outro falls away to
// the guitar's last note over A-flat.
//
// Built by its own generator, tools/arranger/sleepwalk.mjs, from tools/arranger/lib.mjs. The form,
// the chord symbols, the melodies, the voicings, the drum figure, the velocities and the microtiming
// are all written here.
//   node tools/arranger/sleepwalk.mjs [outDir]
import {
  clampVelocity, chordText, FLATS, formHeader, noteName, noteText, offsetText, outDir, parseChord,
  R, saveSong, sectionBuilder, times,
} from './lib.mjs';

const BAR = 2880; // ticks in a 3/4 bar, 3840 ticks to a whole note
const out = outDir();

const nm = (midi) => noteName(midi, FLATS);
const vel = (v) => clampVelocity(v, 124);
const note = (pitch, dur, v, at = 0) => noteText(nm(pitch), dur, vel(v), at);
const chord = (pitches, dur, v, at = 0) => noteText(chordText(pitches, nm), dur, vel(v), at);
const drum = (names, dur, v, at = 0) => `[${names.join(' ')}]/${dur}${offsetText(at)}:${vel(v)}`;

// --------------------------------------------------------------------- the harmony
// The progression is written once, one symbol a bar, and every part is derived from it. A phrase
// is eight bars: A-flat, D-flat, A-flat, F minor 7, D-flat, the borrowed D-flat minor (the iv of
// A-flat, its E natural the bittersweet turn), A-flat over E-flat, and a half cadence on E-flat.
// The B section is the same shape in F minor, ending on C. The breakdown is two bars each of
// D-flat, A-flat, F minor 7 and E-flat, and the coda is a last cadence on A-flat.
const PHRASE_A = ['Ab', 'Dbmaj7', 'Ab', 'Fm7', 'Dbmaj7', 'Dbm', 'Ab/Eb', 'Eb'];
const PHRASE_B = ['Fm', 'Bbm7', 'Fm', 'Dbmaj7', 'Ab', 'Eb', 'C7', 'C'];
const BREAK_PHRASE = ['Dbmaj7', 'Dbmaj7', 'Ab', 'Ab', 'Fm7', 'Fm7', 'Eb', 'Eb'];
const CODA = ['Ab', 'Dbmaj7', 'Ab/Eb', 'Ab'];

const FORM = [
  { name: 'Intro: the guitar and the tape pad', bars: PHRASE_A.join(' ') },
  { name: 'A: the drums and the warm bass enter', bars: [...PHRASE_A, ...PHRASE_A].join(' ') },
  { name: "A': the grand piano enters", bars: PHRASE_A.join(' ') },
  { name: 'B: F minor, the kit on rim and hats', bars: [...PHRASE_B, ...PHRASE_B].join(' ') },
  { name: 'Breakdown: the guitar and the music box', bars: BREAK_PHRASE.join(' ') },
  { name: "A'': full, the music box answers", bars: [...PHRASE_A, ...PHRASE_A].join(' ') },
  { name: 'Outro: the parts fall away', bars: [...PHRASE_A, ...CODA].join(' ') },
];
const HEAD = formHeader(FORM);
const TOTAL = HEAD.chords.length;
if (TOTAL !== 84) throw new Error(`the form is ${TOTAL} bars, wanted 84`);
const chordAt = (bar) => HEAD.chords[Math.min(Math.max(bar, 1), TOTAL) - 1];

// --------------------------------------------------------------------- the voicings
// The pad is open: the root and the fifth only, so the melody's colour tones have room. The bass
// sits an octave below the piano's left hand, and the piano's waltz is the root on beat one and the
// chord on beats two and three.
const padVoicing = (symbol) => {
  const { pc } = parseChord(symbol);
  return [48 + pc, 55 + pc];
};
const bassRoot = (symbol) => {
  const { bass } = parseChord(symbol);
  return 36 + bass;
};
// The bass's pickup: the fifth of the bar's own chord, kept inside the low octave.
const bassFifth = (symbol) => {
  const root = 36 + parseChord(symbol).pc;
  return root + 7 <= 48 ? root + 7 : root - 5;
};
const pianoRoot = (symbol) => 48 + parseChord(symbol).pc;
const pianoChord = (symbol) => {
  const { pc, iv } = parseChord(symbol);
  return iv.map((step) => 48 + pc + step);
};

// --------------------------------------------------------------------- the melodies
// A bar is a list of [midi, duration] pairs; null is a rest. Every note that starts on a beat is a
// chord tone, so the tune agrees with the harmony; the passing notes are eighths on the off-beats,
// where they carry the line without a clash. Most of the motion is a step, and the leaps are the
// phrase's high point (the E-flat at the top of the third bar, the G at the end) and its turn.
const THEME_A = [
  [[80, '8'], [82, '8'], [84, '2']], // Ab:     Ab Bb C
  [[84, '8'], [82, '8'], [80, '2']], // Dbmaj7: C Bb Ab
  [[80, '8'], [82, '8'], [84, '2']], // Ab
  [[84, '8'], [86, '8'], [87, '2']], // Fm7:    C D Eb
  [[84, '8'], [82, '8'], [80, '2']], // Dbmaj7
  [[80, '8'], [79, '8'], [76, '2']], // Dbm:    Ab G E
  [[75, '8'], [73, '8'], [72, '2']], // Ab/Eb:  Eb Db C
  [[75, '2.']], //                    Eb:     Eb held
];
// The same phrase with a brighter close, used when the tune is stated a second time.
const THEME_A_END = [...THEME_A.slice(0, 7), [[79, '2.']]];
// The phrase with room left at the end of some bars, so the music box can answer.
const THEME_A_GAPS = [
  [[80, '8'], [82, '8'], [84, '4'], [null, '4']],
  [[84, '8'], [82, '8'], [80, '4'], [null, '4']],
  [[80, '8'], [82, '8'], [84, '4'], [null, '4']],
  [[84, '8'], [86, '8'], [87, '2']],
  [[84, '8'], [82, '8'], [80, '4'], [null, '4']],
  [[80, '8'], [79, '8'], [76, '2']],
  [[75, '8'], [73, '8'], [72, '4'], [null, '4']],
  [[75, '2.']],
];
// The phrase lifted a little, starting on the third and ending on the fifth of E-flat.
const THEME_A_LIFT = [
  [[84, '8'], [85, '8'], [87, '2']], // Ab
  [[85, '8'], [84, '8'], [80, '2']], // Dbmaj7
  [[80, '8'], [82, '8'], [84, '2']], // Ab
  [[84, '8'], [86, '8'], [87, '2']], // Fm7
  [[85, '8'], [84, '8'], [80, '2']], // Dbmaj7
  [[80, '8'], [79, '8'], [76, '2']], // Dbm
  [[75, '8'], [73, '8'], [72, '2']], // Ab/Eb
  [[79, '2.']], //                    Eb:     G held
];
// The B section's tune, in F minor: it steps around the minor triad and closes on the leading tone.
const THEME_B = [
  [[77, '8'], [79, '8'], [80, '2']], // Fm:     F G Ab
  [[80, '8'], [79, '8'], [77, '2']], // Bbm7:   Ab G F
  [[77, '8'], [79, '8'], [80, '2']], // Fm
  [[80, '8'], [79, '8'], [77, '2']], // Dbmaj7: Ab G F
  [[80, '8'], [82, '8'], [84, '2']], // Ab:     Ab Bb C
  [[82, '8'], [80, '8'], [79, '2']], // Eb:     Bb Ab G
  [[79, '8'], [77, '8'], [76, '2']], // C7:     G F E
  [[76, '2.']], //                    C:      E held
];
// The B section again, with the second bar climbing and a brighter half cadence.
const THEME_B_END = [
  [[77, '8'], [79, '8'], [80, '2']], // Fm
  [[80, '8'], [82, '8'], [85, '2']], // Bbm7:   Ab Bb Db
  [[84, '8'], [82, '8'], [80, '2']], // Fm:     C Bb Ab
  [[80, '8'], [79, '8'], [77, '2']], // Dbmaj7: Ab G F
  [[80, '8'], [82, '8'], [84, '2']], // Ab
  [[82, '8'], [80, '8'], [79, '2']], // Eb
  [[79, '8'], [77, '8'], [76, '2']], // C7
  [[79, '2.']], //                    C:      G held
];
// The intro's fragment: the motif, a held note, the motif again, and the bittersweet turn.
const INTRO = [
  [[80, '8'], [82, '8'], [84, '2']], // Ab
  [[null, '2.']], //                  Dbmaj7: the pad alone for a bar
  [[80, '8'], [82, '8'], [84, '2']], // Ab
  [[84, '2.']], //                    Fm7:    C held
  [[80, '8'], [82, '8'], [84, '2']], // Dbmaj7
  [[80, '8'], [79, '8'], [76, '2']], // Dbm
  [[75, '8'], [73, '8'], [72, '2']], // Ab/Eb
  [[75, '2.']], //                    Eb
];
// The breakdown: slow, with the guitar leaving the ends of its bars open for the music box.
const BREAK = [
  [[80, '8'], [82, '8'], [84, '4'], [null, '4']], // Dbmaj7
  [[84, '4'], [null, '2']], //                      Dbmaj7
  [[80, '8'], [82, '8'], [84, '4'], [null, '4']], // Ab
  [[84, '4'], [null, '2']], //                      Ab
  [[87, '8'], [85, '8'], [84, '4'], [null, '4']], // Fm7
  [[84, '4'], [null, '2']], //                      Fm7
  [[82, '8'], [80, '8'], [79, '2']], //             Eb
  [[79, '2.']], //                                  Eb
];
// The coda: the motif once more, and a last A-flat held over the final chord.
const CODA_MEL = [
  [[80, '8'], [82, '8'], [84, '2']], // Ab
  [[84, '8'], [82, '8'], [80, '2']], // Dbmaj7
  [[75, '8'], [73, '8'], [72, '2']], // Ab/Eb
  [[80, '2.']], //                    Ab:     Ab held
];

// A melody as song text. The first note of every bar leans in late (never early, so it can never
// sound under the chord before it); the notes inside a bar take a small sway from a table; and the
// velocity moves with the note's length and its place in the phrase. `lean` is set per phrase, so
// the guitar's delay changes as the song goes on instead of sitting at one fixed offset.
const SWAY = [0, 5, -4, 7, -2, 9];
// An uneven spread of accents, so no two bars lean the same way.
const WOBBLE = [0, 6, -5, 9, -8, 4, 10, -9, 3, -4, 7, -7];
function sing(bars, base, lean, lift = 0) {
  const lines = [];
  for (let bi = 0; bi < bars.length; bi += 1) {
    const parts = [];
    for (let ni = 0; ni < bars[bi].length; ni += 1) {
      const [pitch, dur] = bars[bi][ni];
      if (pitch === null) { parts.push(`r/${dur}`); continue; }
      const at = ni === 0 ? lean + (bi % 3) : SWAY[(bi + ni) % SWAY.length];
      const v = base + (dur === '2.' ? -4 : dur === '2' ? 3 : 0)
        + WOBBLE[(bi * 2 + ni) % WOBBLE.length] + Math.round(lift * bi);
      parts.push(note(pitch, dur, v, at));
    }
    lines.push(parts.join(' '));
  }
  return lines;
}

// --------------------------------------------------------------------- the accompaniment
// The warm bass: one note on the downbeat, and every third bar a quarter-note pickup on beat three
// that leans into the next bar.
function bassBars(from, n, base) {
  const bars = [];
  for (let i = 0; i < n; i += 1) {
    const root = bassRoot(chordAt(from + i));
    const v = base + WOBBLE[(i * 3) % WOBBLE.length] - 4;
    const down = note(root, '4', v, 6);
    if (i % 3 === 2) {
      bars.push(`${down} r/4 ${note(bassFifth(chordAt(from + i)), '4', v - 6, 4)}`);
    } else {
      bars.push(`${down} r/2`);
    }
  }
  return bars;
}

// The grand piano's broken waltz: the root on beat one, the chord on beats two and three, the
// second a touch softer so the bar rocks rather than thumps.
function pianoBars(from, n, base) {
  const bars = [];
  for (let i = 0; i < n; i += 1) {
    const symbol = chordAt(from + i);
    const v = base + WOBBLE[(i * 5) % WOBBLE.length] - 4;
    bars.push(
      `${note(pianoRoot(symbol), '4', v, 3)} `
      + `${chord(pianoChord(symbol), '4', v - 4, 10)} `
      + `${chord(pianoChord(symbol), '4', v - 8, 14)}`,
    );
  }
  return bars;
}

// The tape pad: the open root and fifth, held for the whole bar.
function padBars(from, n, base) {
  const bars = [];
  for (let i = 0; i < n; i += 1) {
    bars.push(chord(padVoicing(chordAt(from + i)), '2.',
      base + WOBBLE[(i * 7) % WOBBLE.length] - 5, 5));
  }
  return bars;
}

// A bar of the dusty kit in a lo-fi waltz: a kick on the one, hats whose off-beats lean back for a
// swung feel, and a rim dragged late on the three (or a soft snare at a phrase's end). In the
// B section the kick drops out and only the rim and hats remain.
function waltz(i, base, { soft = false, snare = false } = {}) {
  const drag = 16 + (i % 3) * 3;
  const swing = 58 + (i % 4) * 3;
  const back = snare
    ? drum(['s', 'h'], '8', base - 14, drag)
    : drum(['rim', 'h'], '8', base - 6, drag);
  return [
    soft ? drum(['h'], '8', base - 12) : drum(['k', 'h'], '8', base),
    drum(['h'], '8', base - 30, swing),
    drum(['h'], '8', base - 18),
    drum(['h'], '8', base - 32, swing + 3),
    back,
    drum(['h'], '8', base - 34, swing + 6),
  ].join(' ');
}

// The music box: sparse answers in the guitar's gaps. Each entry is [index, bar text].
function boxBars(n, entries) {
  const lookup = new Map(entries);
  const bars = [];
  for (let i = 0; i < n; i += 1) bars.push(lookup.get(i) ?? R);
  return bars;
}

// --------------------------------------------------------------------- the music box's answers
const BOX_BREAK = [
  [0, `r/2 ${note(89, '8', 120, 4)} ${note(84, '8', 98, 10)}`],
  [1, `r/4 ${note(89, '4', 114, 6)} r/4`],
  [2, `r/2 ${note(87, '8', 108, 5)} ${note(84, '8', 94, 11)}`],
  [3, `r/4 ${note(87, '4', 118, 7)} r/4`],
  [4, `r/2 ${note(87, '8', 112, 4)} ${note(84, '8', 100, 10)}`],
  [5, `r/4 ${note(89, '4', 104, 6)} r/4`],
  [6, `r/2 ${note(87, '8', 116, 5)} ${note(82, '8', 96, 11)}`],
];
const BOX_A = [
  [0, `r/2 ${note(87, '8', 118, 4)} ${note(84, '8', 96, 10)}`],
  [1, `r/2 ${note(89, '8', 110, 5)} ${note(84, '8', 92, 11)}`],
  [2, `r/2 ${note(87, '8', 114, 4)} ${note(84, '8', 100, 10)}`],
  [4, `r/2 ${note(89, '8', 120, 5)} ${note(84, '8', 94, 11)}`],
  [6, `r/2 ${note(87, '8', 106, 4)} ${note(84, '8', 98, 10)}`],
  [11, `r/2 ${note(89, '4', 112, 6)}`],
  [13, `r/2 ${note(88, '8', 102, 6)} ${note(85, '8', 90, 12)}`],
  [15, `r/2 ${note(87, '4', 108, 6)}`],
];
const BOX_OUT = [
  [0, `r/2 ${note(87, '8', 116, 4)} ${note(84, '8', 94, 10)}`],
  [2, `r/2 ${note(87, '8', 108, 5)} ${note(84, '8', 98, 11)}`],
];

// --------------------------------------------------------------------- assemble
const KEYS = ['lead', 'box', 'piano', 'pad', 'bass', 'drums'];
const b = sectionBuilder(KEYS, {
  barTicks: BAR,
  label: (name, start, end) => `${start}-${end}: ${name}`,
});

// 1-8: the guitar alone over the tape pad, a fragment of the tune.
b.section(FORM[0].name, 8, {
  lead: sing(INTRO, 78, 15),
  pad: padBars(1, 8, 60),
});

// 9-24: the drums and the warm bass enter; the tune is stated twice, the second time a little
// brighter at the close.
b.section(FORM[1].name, 16, {
  lead: [...sing(THEME_A, 84, 12), ...sing(THEME_A_END, 86, 18)],
  pad: padBars(9, 16, 64),
  bass: bassBars(9, 16, 88),
  drums: times(16, (i) => waltz(i, 92, { snare: i === 15 })),
});

// 25-32: the grand piano enters under the tune.
b.section(FORM[2].name, 8, {
  lead: sing(THEME_A, 86, 14),
  pad: padBars(25, 8, 66),
  piano: pianoBars(25, 8, 80),
  bass: bassBars(25, 8, 88),
  drums: times(8, (i) => waltz(i, 94, { snare: i === 7 })),
});

// 33-48: F minor. The kit drops to rim and hats, and the piano and bass carry the harmony.
b.section(FORM[3].name, 16, {
  lead: [...sing(THEME_B, 82, 13), ...sing(THEME_B_END, 84, 18)],
  pad: padBars(33, 16, 64),
  piano: pianoBars(33, 16, 78),
  bass: bassBars(33, 16, 86),
  drums: times(16, (i) => waltz(i, 88, { soft: true, snare: i === 15 })),
});

// 49-56: the breakdown. Only the guitar and the music box, with the pad out of the way.
b.section(FORM[4].name, 8, {
  lead: sing(BREAK, 76, 16),
  box: boxBars(8, BOX_BREAK),
});

// 57-72: everything, with the music box answering the guitar's gaps and the tune lifted.
b.section(FORM[5].name, 16, {
  lead: [...sing(THEME_A_GAPS, 88, 12), ...sing(THEME_A_LIFT, 90, 17, 0.6)],
  box: boxBars(16, BOX_A),
  pad: padBars(57, 16, 68),
  piano: pianoBars(57, 16, 84),
  bass: bassBars(57, 16, 90),
  drums: times(16, (i) => waltz(i, 96, { snare: i === 15 })),
});

// 73-84: the parts fall away one by one: the kit goes at 77, the piano at 81, the bass at 83, and
// the guitar and the pad are left for the last note.
b.section(FORM[6].name, 12, {
  lead: [...sing(THEME_A, 86, 14), ...sing(CODA_MEL, 78, 18)],
  box: boxBars(4, BOX_OUT),
  pad: padBars(73, 12, 66),
  piano: pianoBars(73, 8, 80),
  bass: bassBars(73, 10, 86),
  drums: times(4, (i) => waltz(i, 90, { snare: i === 3 })),
});

// --------------------------------------------------------------------- the text
const FORM_NOTE = `# Sleepwalk, an original lo-fi waltz in A-flat major by ERNIE 5.5 Flash & SZ. A sleepy
# 3/4 lullaby at 92 BPM, like a late-night record played on a warped turntable: a nylon guitar
# sings a short stepwise motif over a tape pad, the dusty kit drags a rim on the three, a warm bass
# leans on the downbeat, and a grand piano plays a soft broken waltz under it all. The middle turns
# to F minor, the second half answers the guitar with a sparse music box, and the outro falls away
# to the guitar's last note over A-flat. 84 bars, about two minutes forty-five.
#
# The harmony is written once below, one chord symbol a bar, and every part is derived from it: the
# pad holds an open root and fifth, the bass takes each root (with the chord's fifth as a pickup),
# the piano plays the root then the chord on beats two and three, and the music box picks high chord
# tones. The melodies are mostly stepwise, with the leap kept for a phrase's high point and its
# turn, and their on-beat notes are chord tones, so the parts agree without the tune being
# flattened.
#
# Built by its own generator, tools/arranger/sleepwalk.mjs, from tools/arranger/lib.mjs: the form,
# the themes, the voicings, the figures, the velocities and the microtiming all live there. The
# guitar leans 12 to 20 ticks behind the beat, a different amount in each phrase; the rim drags 16
# to 24 ticks; and the hats' off-beats lean back for the swing.`;

const TEXT = [
  FORM_NOTE,
  '#',
  ...HEAD.chordLines,
  '#',
  '# Form:',
  ...HEAD.formLines,
  '#',
  'title: Sleepwalk',
  'composer: ERNIE 5.5 Flash & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: lofi',
  'key: A-flat major',
  'tempo: 92',
  'time: 3/4',
  `about: ${'A sleepy lo-fi waltz in A-flat major: a nylon guitar hums a short stepwise tune over a '
    + 'warped tape pad, a dusty kit drags a rim on beat three, a warm bass leans on the downbeat and '
    + 'a grand piano rocks a soft broken waltz underneath. The middle turns to F minor, a music box '
    + 'answers in the second half, and the outro falls away to the guitar\'s last note over A-flat.'}`,
].join('\n');

const TRACKS = [
  ['lead', 'track lead role=lead inst=bank:nylon-guitar vol=1 vol.lofi=1.3 pan=-0.12'],
  ['box', 'track box role=counter inst=bank:music-box vol=0.55 pan=0.36'],
  ['piano', 'track piano role=chords inst=bank:grand-piano vol=0.78 pan=0.14'],
  ['pad', 'track pad role=pad inst=tape-pad vol=1 pan=-0.04'],
  ['bass', 'track bass role=bass inst=warm-bass vol=0.3 pan=0'],
  ['drums', 'track drums role=drums inst=dusty-kit vol=0.9 pan=0.02'],
];

const text = `${TEXT}

${TRACKS.map(([key, head]) => `${head}\n${b.block(key)}`).join('\n\n')}
`;

const path = saveSong(out, 'sleepwalk.song', text);
console.log(`wrote ${path} (${TOTAL} bars)`);