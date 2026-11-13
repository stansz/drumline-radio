// The Gilded Hour, an original orchestral concert waltz (a valse lente) by DeepSeek & SZ. A slow,
// bittersweet waltz in A-flat major, 88 BPM in 3/4: low strings on the downbeat and harp or
// pizzicato on beats two and three, a singing string theme answered by the horns, a lighter flute
// second theme, a dark middle section in F minor, a slow climb back, the theme in full, and a coda
// that slows down and cadences softly on A-flat.
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
const drum = (name, dur, v, at = 0) => noteText(name, dur, vel(v), at);

// ------------------------------------------------------------------- the chords and their voicings
// A chord symbol is read here as a root pitch class and a list of intervals; the same table turns a
// bar's symbol into the low strings' root, the pad's open root-fifth-octave, and the harp's triad or
// seventh. The cello and pad registers keep the bass low and the pad in the middle.
const INTERVALS = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  '6': [0, 4, 7, 9], add9: [0, 2, 4, 7], dim7: [0, 3, 6, 9],
};
const PITCH = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const CELLO = { C: 36, Db: 37, Eb: 39, F: 41, G: 43, Ab: 44, Bb: 46 };
const PAD = { C: 48, Db: 49, Eb: 51, F: 53, G: 55, Ab: 56, Bb: 58 };

function chordInfo(symbol) {
  const match = /^([A-G](?:b|#)?)([a-z0-9]*)$/.exec(symbol);
  if (!match) throw new Error(`bad chord ${symbol}`);
  const root = match[1];
  const intervals = INTERVALS[match[2] ?? ''];
  if (!intervals) throw new Error(`bad quality in ${symbol}`);
  return { root, intervals };
}
const fifthOf = (symbol) => chordInfo(symbol).intervals.find((i) => i >= 6 && i <= 8) ?? 7;
const celloRoot = (symbol) => CELLO[chordInfo(symbol).root];

function padVoicing(symbol) {
  const root = PAD[chordInfo(symbol).root];
  return [root, root + fifthOf(symbol), root + 12];
}
function harpVoicing(symbol) {
  const root = PAD[chordInfo(symbol).root];
  return chordInfo(symbol).intervals.map((interval) => root + interval);
}

// ------------------------------------------------------------------------------------------ form
// One line per section: its name and one chord symbol per bar, written once. formHeader turns them
// into the song's `# chords:` lines, the `# start-end:` form notes, and the per-bar lookup below.
const A16 =
  'Abmaj7 Fm7 Bbm7 Eb7 Abmaj7 Db6 Bbm7 Eb7 Abmaj7 Cm7 Dbmaj7 Eb Fm7 Bbm7 Eb7 Abmaj7';
const A_TAIL = 'Dbmaj7 Eb Fm7 Bbm7 Db6 Eb7 Ab Ab';
const FORM = [
  { name: 'Intro: the pulse, the pad, the strings first call',
    bars: 'Ab Ab Fm7 Fm7 Dbmaj7 Dbmaj7 Eb7 Eb7' },
  { name: 'A1: the strings state theme A',
    bars: A16 },
  { name: 'A2: theme A again, fuller, the horns answering',
    bars: A16 },
  { name: 'B: theme B on the flute, lighter',
    bars: 'Eb Eb Ab Ab Fm7 Bbm7 Eb7 Eb Db Ab Fm7 Bbm7 Db6 Eb7 Ab Ab Fm7 Bbm7 C7 C7' },
  { name: 'Middle: the waltz darkens in F minor',
    bars: 'Fm Fm Bbm7 Bbm7 C7 C7 Fm Fm Dbmaj7 Dbmaj7 Gdim7 C7 Fm Bbm7 C7 C7' },
  { name: 'Build: a slow climb back to the major',
    bars: 'Fm Fm Bbm Bbm Db Db Eb Eb Fm Fm Bbm7 Bbm7 Eb7 Eb7 Eb7 Eb7' },
  { name: 'A3: theme A in full, the whole orchestra',
    bars: `${A16} ${A_TAIL}` },
  { name: 'Coda: the waltz slows and says goodbye',
    bars: 'Abmaj7 Db6 Abmaj7 Eb7 Fm7 Bbm7 Eb7 Abmaj7 Db6 Ab Dbmaj7 Eb Fm7 Bbm7 Eb7 Eb7 Abmaj7 Abmaj7 Db6 Abmaj7' },
];
const HEAD = formHeader(FORM.map(({ name, bars }) => ({ name, bars })));
const TOTAL = HEAD.chords.length;
if (TOTAL !== 136) throw new Error(`the form is ${TOTAL} bars, wanted 136`);
const chordAt = (bar) => HEAD.chords[bar - 1];

// ------------------------------------------------------------------------------------- the themes
// Each melody is a list of bars, each bar a list of [midi, duration] pairs that fill a 3/4 bar.
// Theme A: an eight-bar phrase that lifts to the flat sixth and settles on the dominant, then the
// same shape answered higher and cadenced on the tonic.
const THEME_A = [
  [[68, '4'], [72, '4'], [75, '4']], //      Abmaj7
  [[72, '4'], [68, '2']], //                 Fm7
  [[70, '4'], [73, '4'], [77, '4']], //      Bbm7
  [[75, '8'], [73, '8'], [70, '4'], [67, '4']], // Eb7
  [[68, '4'], [72, '4'], [75, '4']], //      Abmaj7
  [[77, '2'], [73, '4']], //                 Db6
  [[77, '4'], [73, '4'], [70, '4']], //      Bbm7
  [[70, '2'], [67, '4']], //                 Eb7
  [[68, '4'], [72, '4'], [75, '4']], //      Abmaj7
  [[75, '2'], [79, '4']], //                 Cm7
  [[77, '2'], [80, '4']], //                 Dbmaj7
  [[79, '2'], [75, '4']], //                 Eb
  [[77, '4'], [75, '4'], [72, '4']], //      Fm7
  [[73, '2'], [70, '4']], //                 Bbm7
  [[70, '2'], [67, '4']], //                 Eb7
  [[68, '2.']], //                           Abmaj7
];
const INTRO_MOTIF = [
  [[65, '4'], [68, '4'], [72, '4']], //      Dbmaj7
  [[70, '2'], [67, '4']], //                 Eb7
  [[75, '2.']], //                           Eb7
];
// The horns' answer to theme A: it lives in the middle register, enters through the rests and turns
// the phrase over while the strings hold.
const HORNS_ANSWER = [
  [[null, '2.']],
  [[null, '4'], [56, '4'], [60, '4']], //     Fm7
  [[61, '2'], [65, '4']], //                  Bbm7
  [[63, '2'], [67, '4']], //                  Eb7
  [[56, '2'], [60, '4']], //                  Abmaj7
  [[65, '2'], [61, '4']], //                  Db6
  [[65, '2'], [61, '4']], //                  Bbm7
  [[63, '2'], [58, '4']], //                  Eb7
  [[null, '2.']],
  [[null, '4'], [63, '4'], [67, '4']], //     Cm7
  [[65, '2'], [68, '4']], //                  Dbmaj7
  [[67, '2'], [63, '4']], //                  Eb
  [[60, '2'], [56, '4']], //                  Fm7
  [[61, '2'], [65, '4']], //                  Bbm7
  [[58, '2'], [63, '4']], //                  Eb7
  [[60, '2.']], //                            Abmaj7
];
// Theme B: the flute's lighter second theme, in the dominant, all step and turn; a four-bar tail
// darkens it with C7 for the move into F minor.
const THEME_B = [
  [[70, '2'], [75, '4']], //                  Eb
  [[79, '2'], [75, '4']], //                  Eb
  [[75, '2'], [72, '4']], //                  Ab
  [[72, '2'], [75, '4']], //                  Ab
  [[77, '2'], [72, '4']], //                  Fm7
  [[73, '2'], [70, '4']], //                  Bbm7
  [[70, '4'], [73, '4'], [75, '4']], //       Eb7
  [[70, '2'], [67, '4']], //                  Eb
  [[77, '2'], [73, '4']], //                  Db
  [[72, '2'], [68, '4']], //                  Ab
  [[72, '4'], [75, '4'], [77, '4']], //       Fm7
  [[73, '2'], [77, '4']], //                  Bbm7
  [[80, '2'], [77, '4']], //                  Db6
  [[79, '2'], [82, '4']], //                  Eb7
  [[80, '2'], [75, '4']], //                  Ab
  [[72, '2.']], //                            Ab
];
const THEME_B_TAIL = [
  [[72, '4'], [77, '4'], [80, '4']], //       Fm7
  [[82, '2'], [77, '4']], //                  Bbm7
  [[79, '2'], [76, '4']], //                  C7
  [[76, '2'], [72, '4']], //                  C7
];
// The middle section: theme A's intervals pressed down into F minor, low on the strings.
const MIDDLE = [
  [[60, '4'], [65, '4'], [68, '4']], //       Fm
  [[68, '2'], [65, '4']], //                  Fm
  [[58, '4'], [61, '4'], [65, '4']], //       Bbm7
  [[68, '2'], [65, '4']], //                  Bbm7
  [[64, '4'], [67, '4'], [72, '4']], //       C7
  [[67, '2'], [64, '4']], //                  C7
  [[65, '2'], [68, '4']], //                  Fm
  [[72, '2'], [68, '4']], //                  Fm
  [[61, '4'], [65, '4'], [68, '4']], //       Dbmaj7
  [[72, '2'], [68, '4']], //                  Dbmaj7
  [[67, '4'], [70, '4'], [73, '4']], //       Gdim7
  [[64, '2'], [67, '4']], //                  C7
  [[65, '2'], [68, '4']], //                  Fm
  [[73, '2'], [70, '4']], //                  Bbm7
  [[72, '2'], [70, '4']], //                  C7
  [[67, '2'], [64, '4']], //                  C7
];
// The build: one long note a bar climbing F minor's chord tones back toward A-flat.
const BUILD = [
  [[68, '2.']], [[72, '2.']], [[73, '2.']], [[77, '2.']], //  Fm Fm Bbm Bbm
  [[68, '2.']], [[77, '2.']], [[79, '2.']], [[82, '2.']], //  Db Db Eb Eb
  [[72, '2.']], [[68, '2.']], [[73, '2.']], [[77, '2.']], //  Fm Fm Bbm7 Bbm7
  [[70, '2.']], [[73, '2.']], [[79, '2.']], [[75, '2.']], //  Eb7 Eb7 Eb7 Eb7
];
const BUILD_HORNS = [
  [[56, '2.']], [[60, '2.']], [[65, '2.']], [[68, '2.']], //  Fm Fm Bbm7 Bbm7
  [[70, '2.']], [[73, '2.']], [[70, '2.']], [[67, '2.']], //  Eb7 Eb7 Eb7 Eb7
];
// The tutti's eight-bar extension: the theme's rising sixth stretched over the return to A-flat.
const A_TAIL_MELODY = [
  [[77, '2'], [80, '4']], //                   Dbmaj7
  [[79, '2'], [82, '4']], //                   Eb
  [[80, '2'], [77, '4']], //                   Fm7
  [[73, '2'], [77, '4']], //                   Bbm7
  [[80, '2'], [77, '4']], //                   Db6
  [[79, '2'], [75, '4']], //                   Eb7
  [[72, '4'], [75, '4'], [80, '4']], //        Ab
  [[72, '2.']], //                            Ab
];
const A_TAIL_HORNS = [
  [[65, '2.']], [[67, '2.']], [[56, '2.']], [[58, '2.']], //  Db Eb Fm7 Bbm7
  [[65, '2.']], [[67, '2.']], [[63, '2.']], [[56, '2.']], //  Db6 Eb7 Ab Ab
];
// The coda: theme A's opening again, then the phrase broken into long falling notes as it slows.
const CODA = [
  [[63, '4'], [68, '4'], [72, '4']], //       Abmaj7
  [[77, '2'], [73, '4']], //                  Db6
  [[68, '2'], [72, '4']], //                  Abmaj7
  [[70, '2'], [67, '4']], //                  Eb7
  [[65, '2'], [68, '4']], //                  Fm7
  [[73, '2'], [70, '4']], //                  Bbm7
  [[67, '2'], [63, '4']], //                  Eb7
  [[68, '2.']], //                            Abmaj7
  [[73, '4'], [77, '4'], [80, '4']], //       Db6
  [[68, '4'], [72, '4'], [75, '4']], //       Ab
  [[77, '2'], [80, '4']], //                  Dbmaj7
  [[79, '2'], [75, '4']], //                  Eb
  [[80, '2'], [77, '4']], //                  Fm7
  [[77, '2'], [73, '4']], //                  Bbm7
  [[75, '4'], [70, '4'], [67, '4']], //       Eb7
  [[70, '2.']], //                            Eb7
  [[72, '2.']], //                            Abmaj7
  [[68, '2.']], //                            Abmaj7
  [[70, '2.']], //                            Db6
  [[68, '2.']], //                            Abmaj7
];

// A melody as song text. The first note of a bar always leans in late (never early, so it can never
// sound under the chord before it); the notes inside the bar sway either side of the beat, and each
// bar's velocity moves with the length of its note and with the phrase's rise and fall.
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

// -------------------------------------------------------------------------------- the waltz pulse
// Low strings on beat one. `lift` puts a soft fifth on beat three at the end of every lift-th bar.
function waltzBass(from, n, v0, { lift = 0 } = {}) {
  return times(n, (i) => {
    const symbol = chordAt(from + i);
    const root = celloRoot(symbol);
    const v = v0 + ((i * 3) % 4);
    if (lift > 0 && i % lift === lift - 1) {
      return `${note(root, '4', v, 2)} ${rest('4')} ${note(root + fifthOf(symbol), '4', v - 8, 5)}`;
    }
    return `${note(root, '4', v, 2)} ${rest('2')}`;
  });
}
// The build's low strings pulse three quarters a bar, the middle one a touch lighter.
function pulseBass(from, n, v0) {
  return times(n, (i) => {
    const root = celloRoot(chordAt(from + i));
    const v = v0 + ((i * 2) % 3) * 3;
    return [0, 1, 2].map((beat) => note(root, '4', v - (beat > 0 ? 6 : 0), beat > 0 ? 3 : 2)).join(' ');
  });
}
// The coda's bass holds the root for the whole bar and lets the chord ring.
function longBass(from, n, v0) {
  return times(n, (i) => note(celloRoot(chordAt(from + i)), '2.', v0 + (i % 2) * 2, 2));
}
// The harp rolls a chord on beats two and three, the second a little higher; beat two is early (the
// Viennese lilt) and beat three is on time or a touch late, and neither is ever the same twice.
function harpBars(from, n, v0) {
  return times(n, (i) => {
    const tones = harpVoicing(chordAt(from + i));
    const low = tones.slice(0, 3);
    const high = [tones[1], tones[2], tones[3] ?? tones[0] + 12];
    const early = -9 - ((i * 3) % 5) * 3;
    const late = ((i * 2) % 4) * 4;
    return `r/4 ${hit(low, '4', v0 + ((i * 5) % 3), early)}`
      + ` ${hit(high, '4', v0 - 4 + ((i * 7) % 3), late)}`;
  });
}
// The pizzicato keeps the same lilt with one plucked note a beat: the third on two, the fifth on
// three, so the lighter sections still spell the chord.
function pizzBars(from, n, v0) {
  return times(n, (i) => {
    const tones = harpVoicing(chordAt(from + i));
    const early = -6 - ((i * 4) % 5) * 2;
    const late = ((i * 3) % 5) * 3;
    return `r/4 ${note(tones[1], '4', v0 + ((i * 2) % 3), early)}`
      + ` ${note(tones[2], '4', v0 - 3 + ((i * 3) % 3), late)}`;
  });
}
// The string pad: one open root-fifth-octave held across the bar, so the melody has room for colour.
function padBars(from, n, v0, step = 1) {
  return times(n, (i) => hit(padVoicing(chordAt(from + i)), '2.', v0 + (i % 4) * step));
}
// The wordless choir sings the pad's open chord an octave up, for the soft lift near the end.
function choirBars(from, n, v0) {
  return times(n, (i) => hit(padVoicing(chordAt(from + i)).map((pitch) => pitch + 12),
    '2.', v0 + (i % 3) * 2, i % 2 === 0 ? 6 : 12));
}

// ------------------------------------------------------------------------------------ the timpani
const timpBar = (v, at = 3) => `${drum('k', '4', v, at)} ${rest('2')}`;
const timpCrash = (v) => `${drum('[k cr]', '4', v)} ${rest('2')}`;
const timpRoll = (a, b) =>
  Array.from({ length: 6 }, (_, i) => drum('k', '8', a + Math.round(((b - a) * i) / 5), i === 0 ? 0 : 3)).join(' ');

// The glockenspiel: a touch of colour only, a few notes at phrase ends. `sparse` starts a section
// as rests and drops the given bars in by index.
function sparse(n, entries) {
  const bars = repeatBar(R, n);
  for (const [index, text] of entries) bars[index] = text;
  return bars;
}

// ------------------------------------------------------------------------------------ assemble
const KEYS = ['violins', 'horns', 'flute', 'harp', 'pizz', 'pad', 'choir', 'glock', 'cellos', 'timpani'];
const b = sectionBuilder(KEYS, {
  barTicks: BAR,
  label: (name, start, end) => `${start}-${end}: ${name}`,
});

// 1-8: the waltz pulse alone. Pizzicato and low strings, then the pad, the harp and a first string
// call, and a soft timpani under the last bars.
b.section(FORM[0].name, 8, {
  violins: [...repeatBar(R, 5), ...line(INTRO_MOTIF, 74, 1)],
  pizz: pizzBars(1, 8, 64),
  harp: [...repeatBar(R, 4), ...harpBars(5, 4, 56)],
  pad: [...repeatBar(R, 2), ...padBars(3, 6, 50, 2)],
  glock: sparse(8, [
    [4, `r/4 ${note(85, '8', 106, 4)} ${note(80, '8', 100, 10)} ${rest('4')}`],
    [6, `r/2 ${note(79, '8', 104)} ${note(82, '8', 100, 8)}`],
  ]),
  cellos: waltzBass(1, 8, 60, { lift: 4 }),
  timpani: [R, R, R, R, timpBar(40), timpBar(42), timpBar(44), timpBar(46, 4)],
});

// 9-24: theme A, string-led, harp on beats two and three, the pad under it. The second phrase gets
// a whisper of timpani.
b.section(FORM[1].name, 16, {
  violins: line(THEME_A, 84, 1),
  harp: harpBars(9, 16, 62),
  pad: padBars(9, 16, 56, 1),
  glock: sparse(16, [
    [15, `r/2 ${note(80, '8', 100, 6)} ${note(87, '8', 96, 10)}`],
  ]),
  cellos: waltzBass(9, 16, 62, { lift: 4 }),
  timpani: [...repeatBar(R, 8), ...times(8, (i) => timpBar(44 + i))],
});

// 25-40: theme A fuller: the horns answer in the gaps, the pizzicato joins the harp, and the
// timpani keeps the pulse.
b.section(FORM[2].name, 16, {
  violins: line(THEME_A, 92, 2),
  horns: line(HORNS_ANSWER, 78, 3),
  harp: harpBars(25, 16, 66),
  pizz: pizzBars(25, 16, 62),
  pad: padBars(25, 16, 62, 1),
  glock: sparse(16, [
    [7, `r/4 ${note(79, '8', 106, 4)} ${note(82, '8', 100, 8)} ${rest('4')}`],
    [15, `r/2 ${note(84, '8', 102)} ${note(80, '8', 96, 8)}`],
  ]),
  cellos: waltzBass(25, 16, 66, { lift: 4 }),
  timpani: times(16, (i) => timpBar(50 + (i % 4) * 2)),
});

// 41-60: theme B. The flute takes it over a pizzicato pulse and a thinner pad; the strings and
// horns rest so the section sounds lighter. Its four-bar tail turns on C7 for the dark middle.
b.section(FORM[3].name, 20, {
  flute: [...line(THEME_B, 82, 4), ...line(THEME_B_TAIL, 88, 5)],
  pizz: pizzBars(41, 20, 64),
  pad: padBars(41, 20, 52, 1),
  glock: sparse(20, [
    [4, `r/4 ${note(89, '8', 112, 4)} ${note(84, '8', 106, 8)} ${rest('4')}`],
    [6, `r/2 ${note(82, '8', 108)} ${note(79, '8', 102, 6)}`],
    [12, `r/4 ${note(80, '8', 110, 4)} ${note(85, '8', 104, 8)} ${rest('4')}`],
    [15, `r/2 ${note(84, '8', 110)} ${note(80, '8', 104, 8)}`],
  ]),
  cellos: waltzBass(41, 20, 58, { lift: 8 }),
});

// 61-76: the middle, in F minor. The strings sink into the low register, the pizzicato is the only
// accompaniment, the pad thins and the timpani drops to a growl.
b.section(FORM[4].name, 16, {
  violins: line(MIDDLE, 76, 2),
  pizz: pizzBars(61, 16, 60),
  pad: padBars(61, 16, 46, 1),
  cellos: waltzBass(61, 16, 60),
  timpani: times(16, (i) => timpBar(34 + ((i * 3) % 5))),
});

// 77-92: the slow climb. One long string note a bar, the horns joining halfway, the pad swelling
// and the bass starting to pulse, with the timpani rolling into the tutti.
b.section(FORM[5].name, 16, {
  violins: line(BUILD, 66, 3, { ramp: 2 }),
  horns: [...repeatBar(R, 8), ...line(BUILD_HORNS, 64, 4, { ramp: 3 })],
  harp: [...repeatBar(R, 8), ...harpBars(85, 8, 58)],
  pizz: pizzBars(77, 16, 60),
  pad: padBars(77, 16, 50, 2),
  glock: sparse(16, [
    [12, `r/2 ${note(82, '8', 110)} ${note(85, '8', 104, 8)}`],
    [14, `r/4 ${note(91, '8', 114, 4)} ${note(82, '8', 106, 8)} ${rest('4')}`],
    [15, `r/2 ${note(87, '8', 112)} ${note(82, '8', 106, 8)}`],
  ]),
  cellos: [...waltzBass(77, 4, 56), ...pulseBass(81, 12, 62)],
  timpani: [
    ...repeatBar(R, 8), ...times(4, (i) => timpBar(50 + i * 4)),
    timpRoll(66, 94), timpRoll(76, 102), timpRoll(86, 110), timpRoll(94, 118),
  ],
});

// 93-116: theme A in full. Strings and horns together, harp and pizzicato, the choir lifting the
// eight-bar extension, and a timpani roll and crash under the climax.
b.section(FORM[6].name, 24, {
  violins: [...line(THEME_A, 98, 6), ...line(A_TAIL_MELODY, 100, 7, { ramp: 1.5 })],
  horns: [...line(HORNS_ANSWER, 86, 8), ...line(A_TAIL_HORNS, 90, 9)],
  harp: harpBars(93, 24, 70),
  pizz: [...pizzBars(93, 16, 66), ...pizzBars(109, 8, 78)],
  pad: padBars(93, 24, 68, 1),
  choir: [...repeatBar(R, 16), ...choirBars(109, 8, 68)],
  glock: sparse(24, [
    [22, `r/4 ${note(87, '8', 114, 4)} ${note(84, '8', 108, 8)} ${rest('4')}`],
    [23, note(80, '2.', 116)],
  ]),
  cellos: [...waltzBass(93, 16, 70, { lift: 4 }), ...waltzBass(109, 8, 72)],
  timpani: [
    ...times(16, (i) => timpBar(56 + (i % 4) * 2)),
    timpCrash(80), ...times(5, (i) => timpBar(70 - i)), timpBar(61), timpBar(55),
  ],
});

// 117-136: the coda. The strings say the theme's opening again and then break it into long falling
// notes; the harp and pad thin out, the bass holds, and the choir fades into the final A-flat.
b.section(FORM[7].name, 20, {
  violins: line(CODA, 84, 10, { ramp: -1.5 }),
  harp: harpBars(117, 20, 60),
  pad: padBars(117, 20, 58, 1),
  choir: [...choirBars(117, 8, 66), ...repeatBar(R, 12)],
  glock: sparse(20, [
    [4, `r/2 ${note(80, '8', 102)} ${note(77, '8', 96, 8)}`],
    [8, `r/4 ${note(89, '8', 104, 4)} ${note(85, '8', 98, 8)} ${rest('4')}`],
    [12, `r/2 ${note(80, '8', 98)} ${note(77, '8', 92, 8)}`],
    [16, `r/4 ${note(84, '8', 100, 4)} ${note(80, '8', 94, 8)} ${rest('4')}`],
    [19, note(80, '2.', 96)],
  ]),
  cellos: longBass(117, 20, 56),
  timpani: [timpBar(40), R, timpBar(38), R, timpBar(38), R, timpBar(36), R, ...repeatBar(R, 12)],
});

// ------------------------------------------------------------------------------------- the text
const FORM_NOTE = `# The Gilded Hour, an original orchestral concert waltz (a valse lente) in A-flat major
# by DeepSeek & SZ. Slow and bittersweet rather than ballroom: 88 BPM in 3/4, the low strings and
# the harp keeping the waltz pulse with a Viennese lilt, the strings singing theme A, the horns
# answering it, the flute taking the lighter theme B, a dark middle in F minor, a slow climb back,
# the theme in full with a soft wordless choir under its last phrase, and a coda that ritards onto
# a soft A-flat. 136 bars, about four and a half minutes.
#
# The harmony is written once below, one chord symbol a bar, and every part is derived from it: the
# cellos take each root, the pad holds an open root-fifth-octave, the harp rolls a triad or seventh
# on beats two and three, and the pizzicato plucks the same chord's third and fifth. The melodic
# long notes are chord tones, so the parts agree without the melody being flattened.
#
# Built by its own generator, tools/arranger/the-gilded-hour.mjs, from tools/arranger/lib.mjs:
# the form, the themes, the voicings, the figures, the velocities and the microtiming all live
# there. No oboe, no tubular bells; the glockenspiel is only a touch of colour, and the choir a
# single soft lift before the end.`;

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
  `about: ${'A slow, bittersweet orchestral waltz in A-flat major: a Viennese lilt on the harp, '
    + 'a singing string theme answered by the horns, a lighter flute second theme, a dark middle in '
    + 'F minor, a slow climb back, and a coda that slows onto a soft final chord.'}`,
].join('\n');

const TRACKS = [
  ['violins', 'track violins role=lead inst=strings vol=1 pan=-0.25 vol@129-136=1..0.72'],
  ['horns', 'track horns role=lead2 inst=brass vol=0.72 pan=-0.12'],
  ['flute', 'track flute role=counter vol=0.76 pan=0.26'],
  ['harp', 'track harp role=chords inst=harp vol=0.85 pan=0.3 vol@121-136=1..0.55'],
  ['pizz', 'track pizz role=chords inst=pizzicato vol=0.72 pan=0.2'],
  ['pad', 'track strings role=pad vol=0.85 pan=0.06 vol@117-136=1..0.42'],
  ['choir', 'track choir role=pad inst=bank:choir-ooh vol=1 pan=-0.04 vol@117-124=1..0.56'],
  ['glock', 'track glock role=arp inst=glockenspiel vol=1 pan=0.42'],
  ['cellos', 'track cellos role=bass vol=0.5 pan=0 vol@129-136=1..0.62'],
  ['timpani', 'track timpani role=drums vol=0.5 pan=-0.12 vol@117-136=1..0.5'],
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
