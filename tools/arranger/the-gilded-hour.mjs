// The Gilded Hour, an original salon waltz (a valse lente) by DeepSeek & SZ. A slow, bittersweet
// waltz in A-flat major, 88 BPM in 3/4: a piano sings the theme over its own left-hand chords on
// beats two and three and a plucked double bass on the downbeat, a solo cello answers in the theme's
// rests, takes the lighter second theme and carries the dark F minor middle, a string pad and one
// soft wordless choir lift sit under the last statement, and a coda slows down and cadences softly
// on A-flat.
//
// Built by its own script, from tools/arranger/lib.mjs. The form and the chord symbol for every bar
// are written once below; every voicing, melody, figure, velocity and microtiming offset is written
// fresh in this file.
//   node tools/arranger/the-gilded-hour.mjs [outDir]
import {
  chordText, clampVelocity, FLATS, formHeader, noteName, noteText, outDir, R, repeatBar,
  saveSong, sectionBuilder, times,
} from './lib.mjs';

const BAR = 2880; // ticks in a 3/4 bar, with 3840 ticks to a whole note
const out = outDir();

const nm = (midi) => noteName(midi, FLATS);
const vel = (v) => clampVelocity(v, 124);
const note = (pitch, dur, v, at = 0) => noteText(nm(pitch), dur, vel(v), at);
const hit = (pitches, dur, v, at = 0) => noteText(chordText(pitches, nm), dur, vel(v), at);
const rest = (dur) => 'r/' + dur;

// ------------------------------------------------------------------- the chords and their voicings
// A chord symbol is read here as a root pitch class and a list of intervals; the same table turns a
// bar's symbol into the plucked bass's root, the pad's open root-fifth-octave, the piano's left-hand
// triad (low on beat two, an octave up on beat three) and the music box's high colour notes. The
// pad's register keeps the bass low and the pad in the middle, under the melody.
const INTERVALS = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  '6': [0, 4, 7, 9], add9: [0, 2, 4, 7], dim7: [0, 3, 6, 9],
};
const PITCH = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const PAD = { C: 48, Db: 49, Eb: 51, F: 53, G: 55, Ab: 56, Bb: 58 };

function chordInfo(symbol) {
  const match = /^([A-G](?:b|#)?)([a-z0-9]*)$/.exec(symbol);
  if (!match) throw new Error(`bad chord ${symbol}`);
  const root = match[1];
  const intervals = INTERVALS[match[2] ?? ''];
  if (!intervals) throw new Error(`bad quality in ${symbol}`);
  return { root, intervals };
}
const thirdOf = (symbol) => chordInfo(symbol).intervals.find((i) => i >= 3 && i <= 4) ?? 4;
const fifthOf = (symbol) => chordInfo(symbol).intervals.find((i) => i >= 6 && i <= 8) ?? 7;
const rootOf = (symbol) => PAD[chordInfo(symbol).root];
// The plucked double bass sounds an octave below its written note; its root stays in the low octave.
const bassRoot = (symbol) => rootOf(symbol);

// The piano's left hand: a plain triad, low on beat two and an octave up on beat three, so the two
// beats sound like a lilt rather than a block chord.
function waltzVoicing(symbol) {
  const root = rootOf(symbol) - 12;
  return [root, root + thirdOf(symbol), root + fifthOf(symbol)];
}
// The string pad: one open root-fifth-octave held across the bar, so the melody has room for colour.
function padVoicing(symbol) {
  const root = rootOf(symbol);
  return [root, root + fifthOf(symbol), root + 12];
}

// ------------------------------------------------------------------------------------------ form
// One line per section: its name and one chord symbol per bar, written once. formHeader turns them
// into the song's `# chords:` lines, the `# start-end:` form notes, and the per-bar lookup below.
const A16 =
  'Abmaj7 Fm7 Bbm7 Eb7 Abmaj7 Db6 Bbm7 Eb7 Abmaj7 Cm7 Dbmaj7 Eb Fm7 Bbm7 Eb7 Abmaj7';
const A_TAIL = 'Dbmaj7 Eb Fm7 Bbm7 Db6 Eb7 Ab Ab';
const FORM = [
  { name: 'Intro: the pulse, the music box, the piano first call',
    bars: 'Ab Ab Fm7 Fm7 Dbmaj7 Dbmaj7 Eb7 Eb7' },
  { name: 'A1: the piano states theme A',
    bars: A16 },
  { name: 'A2: theme A again, fuller, the cello answering',
    bars: A16 },
  { name: 'B: theme B on the cello, lighter',
    bars: 'Eb Eb Ab Ab Fm7 Bbm7 Eb7 Eb Db Ab Fm7 Bbm7 Db6 Eb7 Ab Ab Fm7 Bbm7 C7 C7' },
  { name: 'Middle: the waltz darkens in F minor',
    bars: 'Fm Fm Bbm7 Bbm7 C7 C7 Fm Fm Dbmaj7 Dbmaj7 Gdim7 C7 Fm Bbm7 C7 C7' },
  { name: 'Build: a slow climb back to the major',
    bars: 'Fm Fm Bbm Bbm Db Db Eb Eb Fm Fm Bbm7 Bbm7 Eb7 Eb7 Eb7 Eb7' },
  { name: 'A3: theme A in full, with the choir',
    bars: `${A16} ${A_TAIL}` },
  { name: 'Coda: the waltz slows and says goodbye',
    bars: 'Abmaj7 Db6 Abmaj7 Eb7 Fm7 Bbm7 Eb7 Abmaj7 Db6 Ab Dbmaj7 Eb Fm7 Bbm7 Eb7 Eb7 Abmaj7 Abmaj7 Db6 Abmaj7' },
];
const HEAD = formHeader(FORM.map(({ name, bars }) => ({ name, bars })));
const TOTAL = HEAD.chords.length;
if (TOTAL !== 136) throw new Error(`the form is ${TOTAL} bars, wanted 136`);
const chordAt = (bar) => HEAD.chords[bar - 1];

// ------------------------------------------------------------------------------------- the themes
// Each melody is a list of bars, each bar a list of [midi, duration] pairs that fill a 3/4 bar; a
// null pitch is a rest. The singing comes from stepwise motion: most neighbouring notes sit a second
// apart, with the leap saved for a phrase's high point and its turn. Passing notes sit on the off-beat
// eighth so every long on-beat note is a chord tone, and none of them is a semitone from the pad's
// root or fifth.
// Theme A: an eight-bar phrase that steps up to the flat sixth and settles on the dominant, then the
// same shape answered a little stronger and cadenced on the tonic.
const THEME_A = [
  [[72, '8'], [73, '8'], [75, '2']], //        Abmaj7
  [[75, '8'], [74, '8'], [72, '2']], //        Fm7
  [[73, '8'], [72, '8'], [70, '2']], //        Bbm7
  [[70, '8'], [72, '8'], [75, '4'], [null, '4']], // Eb7
  [[72, '8'], [73, '8'], [75, '2']], //        Abmaj7
  [[80, '2'], [null, '4']], //                 Db6
  [[82, '8'], [80, '8'], [77, '2']], //        Bbm7
  [[75, '2'], [null, '4']], //                 Eb7
  [[72, '8'], [73, '8'], [75, '2']], //        Abmaj7
  [[75, '8'], [74, '8'], [72, '2']], //        Cm7
  [[73, '8'], [75, '8'], [77, '2']], //        Dbmaj7
  [[75, '8'], [77, '8'], [75, '4'], [null, '4']], // Eb
  [[72, '8'], [70, '8'], [68, '2']], //        Fm7
  [[68, '8'], [67, '8'], [65, '2']], //        Bbm7
  [[63, '8'], [65, '8'], [67, '4'], [70, '4']], // Eb7
  [[72, '2.']], //                             Abmaj7
];
// The intro's first call: the theme's opening shape, a fourth lower, on the intro's own harmony.
const INTRO_CALL = [
  [[73, '8'], [75, '8'], [77, '2']], //        Dbmaj7
  [[77, '8'], [75, '8'], [73, '4'], [72, '4']], // Dbmaj7
  [[73, '8'], [72, '8'], [70, '4'], [67, '4']], // Eb7
  [[67, '2'], [70, '4']], //                   Eb7
];
// The horns' answer is now the cello's: short rising or falling figures that fill the theme's rests
// (the last beat of bars 4, 6, 8 and 12 of each statement).
function answers(bars, v) {
  const entries = [
    [3, [63, 65]], //  Eb7:  Eb, F
    [5, [68, 70]], //  Db6:  Ab, Bb
    [7, [70, 72]], //  Eb7:  Bb, C
    [11, [67, 65]], // Eb:   G, F
  ];
  const list = repeatBar(R, bars);
  for (const [index, pitches] of entries) {
    list[index] = `${rest('2')} ${note(pitches[0], '8', v, 4)} ${note(pitches[1], '8', v - 4, 10)}`;
  }
  return list;
}
// Theme B: the cello's lighter second theme, all step and turn; its four-bar tail darkens it with C7
// for the move into F minor. It sits in the cello's singing register, an octave below the piano's.
const THEME_B = [
  [[63, '8'], [65, '8'], [67, '2']], //        Eb
  [[67, '8'], [65, '8'], [63, '2']], //        Eb
  [[63, '8'], [65, '8'], [68, '2']], //        Ab
  [[68, '8'], [70, '8'], [72, '2']], //        Ab
  [[72, '8'], [70, '8'], [68, '2']], //        Fm7
  [[68, '8'], [67, '8'], [65, '2']], //        Bbm7
  [[67, '8'], [65, '8'], [63, '4'], [61, '4']], // Eb7
  [[63, '8'], [61, '8'], [58, '2']], //        Eb
  [[61, '8'], [63, '8'], [65, '4'], [68, '4']], // Db
  [[68, '8'], [70, '8'], [72, '2']], //        Ab
  [[72, '8'], [70, '8'], [68, '2']], //        Fm7
  [[68, '8'], [67, '8'], [65, '2']], //        Bbm7
  [[65, '8'], [63, '8'], [61, '2']], //        Db6
  [[61, '8'], [63, '8'], [67, '2']], //        Eb7
  [[68, '8'], [70, '8'], [72, '2']], //        Ab
  [[72, '8'], [70, '8'], [68, '2']], //        Ab
];
const THEME_B_TAIL = [
  [[68, '8'], [67, '8'], [65, '2']], //        Fm7
  [[65, '8'], [63, '8'], [61, '2']], //        Bbm7
  [[60, '8'], [62, '8'], [64, '2']], //        C7
  [[64, '8'], [63, '8'], [60, '2']], //        C7
];
// The middle section: the theme's shape pressed down into F minor, low and close on the cello.
const MIDDLE = [
  [[60, '8'], [62, '8'], [65, '4'], [68, '4']], // Fm
  [[65, '8'], [63, '8'], [60, '2']], //        Fm
  [[58, '8'], [60, '8'], [61, '4'], [65, '4']], // Bbm7
  [[65, '8'], [63, '8'], [61, '2']], //        Bbm7
  [[60, '8'], [62, '8'], [64, '2']], //        C7
  [[64, '8'], [62, '8'], [60, '2']], //        C7
  [[60, '8'], [62, '8'], [65, '4'], [68, '4']], // Fm
  [[65, '8'], [63, '8'], [60, '2']], //        Fm
  [[61, '8'], [63, '8'], [65, '4'], [68, '4']], // Dbmaj7
  [[68, '8'], [70, '8'], [68, '4'], [65, '4']], // Dbmaj7
  [[67, '8'], [69, '8'], [70, '2']], //        Gdim7
  [[70, '8'], [69, '8'], [67, '4'], [64, '4']], // C7
  [[65, '8'], [63, '8'], [60, '2']], //        Fm
  [[58, '8'], [60, '8'], [61, '4'], [65, '4']], // Bbm7
  [[64, '8'], [62, '8'], [60, '2']], //        C7
  [[60, '2.']], //                             C7
];
// The build: the piano climbs back toward A-flat, one step at a time, over the middle's own turn.
const BUILD = [
  [[65, '8'], [67, '8'], [68, '2']], //        Fm
  [[68, '8'], [67, '8'], [65, '2']], //        Fm
  [[65, '8'], [67, '8'], [70, '2']], //        Bbm
  [[70, '8'], [72, '8'], [73, '4'], [77, '4']], // Bbm
  [[77, '8'], [75, '8'], [73, '2']], //        Db
  [[73, '8'], [75, '8'], [77, '4'], [80, '4']], // Db
  [[79, '8'], [77, '8'], [75, '2']], //        Eb
  [[75, '8'], [77, '8'], [79, '4'], [82, '4']], // Eb
  [[80, '8'], [82, '8'], [84, '4'], [80, '4']], // Fm
  [[80, '8'], [79, '8'], [77, '2']], //        Fm
  [[77, '8'], [75, '8'], [73, '4'], [70, '4']], // Bbm7
  [[70, '8'], [72, '8'], [73, '4'], [77, '4']], // Bbm7
  [[75, '8'], [77, '8'], [79, '4'], [82, '4']], // Eb7
  [[82, '8'], [80, '8'], [79, '4'], [75, '4']], // Eb7
  [[75, '8'], [77, '8'], [79, '4'], [82, '4']], // Eb7
  [[82, '8'], [80, '8'], [79, '4'], [75, '4']], // Eb7
];
// The tutti's eight-bar extension: the theme's rising figure spread over the return to A-flat.
const A_TAIL_MELODY = [
  [[73, '8'], [75, '8'], [77, '2']], //        Dbmaj7
  [[75, '8'], [77, '8'], [79, '4'], [75, '4']], // Eb
  [[75, '8'], [74, '8'], [72, '2']], //        Fm7
  [[73, '8'], [72, '8'], [70, '2']], //        Bbm7
  [[70, '2'], [73, '4']], //                   Db6
  [[73, '8'], [72, '8'], [70, '2']], //        Eb7
  [[72, '8'], [73, '8'], [75, '2']], //        Ab
  [[75, '8'], [73, '8'], [72, '4'], [68, '4']], // Ab
];
// The coda: theme A's opening again, then the phrase broken into falling steps as it slows.
const CODA = [
  [[72, '8'], [73, '8'], [75, '2']], //        Abmaj7
  [[77, '8'], [75, '8'], [73, '2']], //        Db6
  [[72, '8'], [73, '8'], [75, '4'], [72, '4']], // Abmaj7
  [[73, '8'], [72, '8'], [70, '4'], [67, '4']], // Eb7
  [[65, '8'], [67, '8'], [68, '4'], [72, '4']], // Fm7
  [[73, '8'], [72, '8'], [70, '4'], [68, '4']], // Bbm7
  [[70, '8'], [72, '8'], [73, '4'], [75, '4']], // Eb7
  [[75, '2'], [72, '4']], //                   Abmaj7
  [[73, '8'], [75, '8'], [77, '2']], //        Db6
  [[75, '2'], [72, '4']], //                   Ab
  [[73, '8'], [75, '8'], [77, '4'], [80, '4']], // Dbmaj7
  [[79, '2'], [75, '4']], //                   Eb
  [[75, '8'], [74, '8'], [72, '2']], //        Fm7
  [[73, '2'], [70, '4']], //                   Bbm7
  [[70, '8'], [72, '8'], [73, '2']], //        Eb7
  [[73, '2'], [70, '4']], //                   Eb7
  [[72, '2'], [75, '4']], //                   Abmaj7
  [[75, '2'], [72, '4']], //                   Abmaj7
  [[73, '2'], [70, '4']], //                   Db6
  [[72, '2.']], //                             Abmaj7
];

// A melody as song text. The first note of a bar leans in late (never early, so it can never sound
// under the chord before it); the notes inside the bar sway either side of the beat, and each bar's
// velocity moves with the length of its note and with the phrase's rise and fall.
const SWAY = [-8, 4, 13, -5, 11, 7, -10, 15];
const LENGTH_WEIGHT = { '2.': 2, '4.': 3, '2': 5, '4': 6, '8': -3, '16': -7 };
function line(bars, base, seed = 0, { shift = 0, late = 9, ramp = 0 } = {}) {
  return bars.map((barsOfSection, bi) => barsOfSection.map(([pitch, dur], i) => {
    if (pitch === null) return rest(dur);
    const at = i === 0 ? late + ((bi + seed) % 3) * 3 : SWAY[(bi * 5 + i * 3 + seed) % SWAY.length];
    const v = base + (LENGTH_WEIGHT[dur] ?? 0) + (i === 0 ? 6 : 0)
      + ((bi + i * 2 + seed) % 3) * 2 + Math.round(ramp * bi);
    return note(pitch + shift, dur, v, at);
  }).join(' '));
}

// --------------------------------------------------------------------------------- the waltz pulse
// The plucked double bass on the downbeat, just behind it, the "oom" of the waltz.
function bassBars(from, n, v0) {
  return times(n, (i) => {
    const root = bassRoot(chordAt(from + i));
    return `${note(root, '4', v0 + ((i * 3) % 4), 2)} ${rest('2')}`;
  });
}
// The piano's left hand on beats two and three: beat two is early by a small, varying amount (the
// Viennese lilt), beat three is on time or a touch late, and neither is ever the same twice.
function waltzBars(from, n, v0) {
  return times(n, (i) => {
    const low = waltzVoicing(chordAt(from + i));
    const high = low.map((pitch) => pitch + 12);
    const early = -8 - ((i * 3) % 5) * 2;
    const late = ((i * 2) % 4) * 3;
    return `r/4 ${hit(low, '4', v0 + ((i * 5) % 3), early)}`
      + ` ${hit(high, '4', v0 - 4 + ((i * 7) % 3), late)}`;
  });
}
// The string pad: one open root-fifth-octave held across the bar.
function padBars(from, n, v0, step = 1) {
  return times(n, (i) => hit(padVoicing(chordAt(from + i)), '2.', v0 + (i % 4) * step));
}
// The wordless choir sings the pad's open chord an octave up, for the soft lift near the end.
function choirBars(from, n, v0) {
  return times(n, (i) => hit(padVoicing(chordAt(from + i)).map((pitch) => pitch + 12),
    '2.', v0 + (i % 3) * 2, i % 2 === 0 ? 6 : 12));
}

// The music box: a touch of colour only, a few notes in the intro and the coda. `sparse` starts a
// section as rests and drops the given bars in by index.
function sparse(n, entries) {
  const bars = repeatBar(R, n);
  for (const [index, text] of entries) bars[index] = text;
  return bars;
}

// ------------------------------------------------------------------------------------ assemble
const KEYS = ['piano', 'waltz', 'cello', 'strings', 'choir', 'musicbox', 'bass'];
const b = sectionBuilder(KEYS, {
  barTicks: BAR,
  label: (name, start, end) => `${start}-${end}: ${name}`,
});

// 1-8: the waltz pulse alone. The piano's left hand and the plucked bass set the lilt, the strings
// come in for the second half, the music box adds two flecks of colour and the piano makes its first
// call.
b.section(FORM[0].name, 8, {
  piano: [...repeatBar(R, 4), ...line(INTRO_CALL, 84, 1)],
  waltz: waltzBars(1, 8, 54),
  strings: [...repeatBar(R, 4), ...padBars(5, 4, 64, 2)],
  musicbox: sparse(8, [
    [3, `r/2 ${note(87, '8', 104, 4)} ${note(82, '8', 100, 10)}`],
    [6, `r/2 ${note(91, '8', 106)} ${note(87, '8', 100, 8)}`],
  ]),
  bass: [...repeatBar(R, 2), ...bassBars(3, 6, 58)],
});

// 9-24: theme A for the first time, the piano alone over its left hand and the pad.
b.section(FORM[1].name, 16, {
  piano: line(THEME_A, 88, 1),
  waltz: waltzBars(9, 16, 58),
  strings: padBars(9, 16, 66, 1),
  bass: bassBars(9, 16, 60),
});

// 25-40: theme A again, a little stronger, with the cello answering in the theme's rests.
b.section(FORM[2].name, 16, {
  piano: line(THEME_A, 91, 2),
  waltz: waltzBars(25, 16, 60),
  cello: answers(16, 76),
  strings: padBars(25, 16, 69, 1),
  bass: bassBars(25, 16, 62),
});

// 41-60: theme B on the solo cello, the piano's left hand and the bass thinner under it; the strings
// and the choir rest so the section sounds lighter. Its four-bar tail turns on C7 for the dark middle.
b.section(FORM[3].name, 20, {
  cello: [...line(THEME_B, 80, 4), ...line(THEME_B_TAIL, 84, 5)],
  waltz: waltzBars(41, 20, 54),
  bass: bassBars(41, 20, 58),
});

// 61-76: the middle, in F minor. The cello sinks low, the piano's left hand is the only other
// accompaniment and the pad darkens.
b.section(FORM[4].name, 16, {
  cello: line(MIDDLE, 76, 2),
  waltz: waltzBars(61, 16, 52),
  strings: padBars(61, 16, 62, 1),
  bass: bassBars(61, 16, 58),
});

// 77-92: the slow climb. The piano steps back up toward A-flat over the returning pad and lilt.
b.section(FORM[5].name, 16, {
  piano: line(BUILD, 82, 3, { ramp: 1.5 }),
  waltz: waltzBars(77, 16, 58),
  strings: padBars(77, 16, 68, 2),
  bass: bassBars(77, 16, 62),
});

// 93-116: theme A in full. The cello answers again, the piano's extension climbs over the pad, the
// choir lifts the eight-bar extension and the music box stays out of the way.
b.section(FORM[6].name, 24, {
  piano: [...line(THEME_A, 96, 6), ...line(A_TAIL_MELODY, 98, 7, { ramp: 1 })],
  waltz: waltzBars(93, 24, 62),
  cello: answers(24, 78),
  strings: padBars(93, 24, 74, 1),
  choir: [...repeatBar(R, 16), ...choirBars(109, 8, 66)],
  bass: bassBars(93, 24, 66),
});

// 117-136: the coda. The piano says the theme's opening again and then breaks it into falling steps
// as the waltz slows; the pad and left hand thin out, the bass lets go for four bars and the choir
// fades into the final A-flat.
b.section(FORM[7].name, 20, {
  piano: line(CODA, 84, 10, { ramp: -1.5 }),
  waltz: waltzBars(117, 20, 58),
  strings: padBars(117, 20, 70, 1),
  choir: [...choirBars(117, 8, 64), ...repeatBar(R, 12)],
  musicbox: sparse(20, [
    [7, `r/2 ${note(84, '8', 102)} ${note(87, '8', 98, 8)}`],
    [15, `r/2 ${note(87, '8', 100)} ${note(91, '8', 96, 8)}`],
    [19, `r/2 ${note(80, '8', 96)} ${note(84, '8', 92, 8)}`],
  ]),
  bass: [...bassBars(117, 12, 56), ...repeatBar(R, 4), ...bassBars(133, 4, 54)],
});

// ------------------------------------------------------------------------------------- the text
const FORM_NOTE = `# The Gilded Hour, an original salon waltz (a valse lente) in A-flat major
# by DeepSeek & SZ. Slow and bittersweet rather than ballroom: 88 BPM in 3/4, a piano singing the
# theme over its own left-hand chords on beats two and three and a plucked double bass on the
# downbeat, a solo cello answering in the theme's rests, taking the lighter theme B and carrying the
# dark F minor middle, a slow stepwise climb back, the theme in full under a soft wordless choir and
# a string pad, and a coda that ritards onto a soft A-flat. 136 bars, about four and a half minutes.
#
# The harmony is written once below, one chord symbol a bar, and every part is derived from it: the
# plucked bass takes each root, the pad holds an open root-fifth-octave, the piano's left hand rolls a
# plain triad low then an octave up on beats two and three, and the music box picks chord tones high.
# The melodies are mostly stepwise, with the leap kept for a phrase's high point and its turn; their
# long notes are chord tones, so the parts agree without the melody being flattened.
#
# Built by its own generator, tools/arranger/the-gilded-hour.mjs, from tools/arranger/lib.mjs:
# the form, the themes, the voicings, the figures, the velocities and the microtiming all live
# there. No violins, no horns, no flute, no harp or pizzicato, no glockenspiel and no timpani: the
# colour comes from the piano and the solo cello.`;

const TEXT = [
  FORM_NOTE,
  '#',
  ...HEAD.chordLines,
  '#',
  '# Form:',
  ...HEAD.formLines,
  '#',
  'title: The Gilded Hour',
  'composer: DeepSeek & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: orchestral',
  'key: A-flat major',
  'tempo: 88',
  'time: 3/4',
  `about: ${'A slow, bittersweet salon waltz in A-flat major: a piano sings the theme over its own '
    + 'left-hand lilt and a plucked double bass, a solo cello answers in its rests, takes the lighter '
    + 'second theme and carries a dark middle in F minor, a slow climb returns to the theme in full, '
    + 'and a coda slows onto a soft final chord.'}`,
].join('\n');

const TRACKS = [
  ['piano', 'track piano role=lead inst=bank:grand-piano vol=1 pan=-0.18 vol@121-136=1..0.82'],
  ['waltz', 'track waltz role=chords inst=bank:grand-piano vol=0.9 pan=0.14 vol@121-136=1..0.7'],
  ['cello', 'track cello role=lead2 inst=bank:cello vol=1 pan=-0.06'],
  ['strings', 'track strings role=pad inst=bank:string-section vol=0.85 pan=0.06 vol@117-136=1..0.42'],
  ['choir', 'track choir role=pad inst=bank:choir-ooh vol=1 pan=-0.04 vol@117-124=1..0.56'],
  ['musicbox', 'track musicbox role=counter inst=bank:music-box vol=0.9 pan=0.42'],
  ['bass', 'track bass role=bass inst=bank:string-bass vol=0.55 pan=0'],
];

const DIRECTIVES = [
  '@bars 23-24 tempo=88..82',
  '@bar 25 tempo=88',
  '@bars 59-60 tempo=88..84',
  '@bar 61 tempo=88',
  '@bars 129-136 tempo=88..64',
];

const text = `${TEXT}

${DIRECTIVES.join('\n')}

${TRACKS.map(([key, head]) => `${head}\n${b.block(key)}`).join('\n\n')}
`;

const path = saveSong(out, 'the-gilded-hour.song', text);
console.log(`wrote ${path} (${TOTAL} bars)`);
