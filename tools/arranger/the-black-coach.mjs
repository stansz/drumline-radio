// The Black Coach, an original orchestral scherzo by Arena Agent & SZ. A night chase in G minor:
// 144 BPM in 3/4, three beats to the bar and never a moment's rest, the pizzicato swelling under a
// timpani pulse while the horns shout the theme and the violins answer from the rooftops. The trio
// swings the coach into B-flat major and the flute sings over sustained strings and a soft harp; then
// the ostinato comes back, the whole orchestra takes the theme, and a coda accelerates into one last
// hit on the tonic.
//
// Built by its own script, from tools/arranger/lib.mjs. Every musical choice - the chords, the
// theme, the ostinato figures, the voicings, the velocities, the microtiming - is written here.
//   node tools/arranger/the-black-coach.mjs [outDir]
import {
  barLength, chordText, clampVelocity, formHeader, noteName, offsetText, outDir, R, saveSong,
  sectionBuilder, MIXED,
} from './lib.mjs';

const BAR = 2880; // ticks in a 3/4 bar at 3840 a whole note
const out = outDir();

const nm = (midi) => noteName(midi, MIXED);
const vel = (v) => clampVelocity(v, 126);
const note = (pitch, dur, v, at = 0) => `${nm(pitch)}/${dur}${offsetText(at)}:${vel(v)}`;
const hit = (pitches, dur, v, at = 0) => `${chordText(pitches, nm)}/${dur}${offsetText(at)}:${vel(v)}`;
const rest = (dur) => `r/${dur}`;
const drum = (name, dur, v, at = 0) => `${name}/${dur}${offsetText(at)}:${vel(v)}`;

// ------------------------------------------------------------------ the chords and their voicings
// One row per chord the song uses. `root` is the cello's low note and `drive`/`space` the two bass
// figures; `pad` is the string-pad's open three-note spread; `pizz` is the six-eighth ostinato,
// always root-fifth-third neighbours so the ostinato can never wander off the harmony; `harp` is the
// rolled chord (a second, higher one is derived from it); `stab` is the horn/brass triad; `glock` is
// the two glockenspiel notes that answer in the development and the coda.
const V = {
  Gm: { root: 43, drive: [43, 43, 50, 43, 46, 50], space: [[43, '4'], [50, '8'], [43, '8'], [46, '4']],
    pad: [55, 62, 70], pizz: [55, 55, 62, 55, 58, 62], harp: [55, 62, 70, 74], stab: [62, 67, 70], glock: [79, 86] },
  Eb: { root: 39, drive: [39, 39, 46, 39, 43, 46], space: [[39, '4'], [46, '8'], [39, '8'], [43, '4']],
    pad: [51, 58, 67], pizz: [51, 51, 58, 51, 55, 58], harp: [51, 58, 63, 67], stab: [63, 67, 70], glock: [75, 82] },
  Cm: { root: 36, drive: [36, 36, 43, 36, 39, 43], space: [[36, '4'], [43, '8'], [36, '8'], [39, '4']],
    pad: [60, 63, 67], pizz: [48, 48, 55, 48, 51, 55], harp: [48, 55, 60, 63], stab: [60, 63, 67], glock: [79, 84] },
  D7: { root: 38, drive: [38, 38, 45, 38, 48, 45], space: [[38, '4'], [45, '8'], [38, '8'], [48, '4']],
    pad: [50, 57, 60], pizz: [50, 50, 57, 50, 54, 57], harp: [50, 57, 60, 66], stab: [62, 66, 69], glock: [81, 86] },
  F: { root: 41, drive: [41, 41, 48, 41, 45, 48], space: [[41, '4'], [48, '8'], [41, '8'], [45, '4']],
    pad: [53, 60, 69], pizz: [53, 53, 60, 53, 57, 60], harp: [53, 60, 65, 69], stab: [65, 69, 72], glock: [77, 84] },
  F7: { root: 41, drive: [41, 41, 48, 41, 39, 48], space: [[41, '4'], [48, '8'], [41, '8'], [39, '4']],
    pad: [53, 60, 63], pizz: [53, 53, 60, 53, 57, 63], harp: [53, 60, 63, 69], stab: [63, 69, 72], glock: [77, 87] },
  Ab: { root: 44, drive: [44, 44, 51, 44, 48, 51], space: [[44, '4'], [51, '8'], [44, '8'], [48, '4']],
    pad: [56, 60, 63], pizz: [56, 56, 63, 56, 60, 63], harp: [56, 63, 68, 72], stab: [63, 68, 72], glock: [80, 87] },
  Bb: { root: 46, drive: [46, 46, 53, 46, 50, 53], space: [[46, '4'], [53, '8'], [46, '8'], [50, '4']],
    pad: [58, 62, 65], pizz: [46, 46, 53, 46, 50, 53], harp: [58, 65, 70, 74], stab: [65, 70, 74], glock: [82, 89] },
  Dm: { root: 38, drive: [38, 38, 45, 38, 41, 45], space: [[38, '4'], [45, '8'], [38, '8'], [41, '4']],
    pad: [50, 53, 57], pizz: [50, 50, 57, 50, 53, 57], harp: [50, 57, 62, 65], stab: [62, 65, 69], glock: [81, 86] },
};

// Two chord symbols share a voicing with a plain one and exist to name a colour tone the melody
// holds: the 9th of C minor in bars 14, 30 and 126, and the 6th of F under the trio (bars 74, 98).
const V_ALIAS = { Cmadd9: 'Cm', F6: 'F' };
const voicing = (symbol) => V[V_ALIAS[symbol] ?? symbol];

// ------------------------------------------------------------------------------------------ form
// Scherzo - trio - scherzo, then the coda. Every section says what happens in it.
const PLAN = [
  { name: 'Intro: timpani and pizzicato, a roll into the theme',
    chords: 'Gm Gm Eb Eb Cm Cm D7 D7' },
  { name: 'Scherzo A1: the horns state the theme, the violins answer in its gaps',
    chords: 'Gm Gm Eb Eb Cm Cmadd9 D7 D7 Gm Gm Cm Cm Ab Eb D7 Gm' },
  { name: 'Scherzo A2: the violins take the theme over, an octave up, the horns calling',
    chords: 'Gm Gm Eb Eb Cm Cmadd9 D7 D7 Gm Gm Cm Cm Ab Eb D7 Gm' },
  { name: 'Development: the theme in three-note fragments, violins answering the horns',
    chords: 'Gm Gm Eb Eb Cm Cm D7 D7' },
  { name: 'Development: stretto, two bars each for violins, horns, flute and cellos',
    chords: 'Cm Cm Gm Gm Ab Ab D7 D7' },
  { name: 'Development: silence and sudden accents, the glockenspiel in the holes',
    chords: 'Eb Eb F F D7 D7 Gm Gm' },
  { name: 'Development: a build on the ostinato, the horns holding F into the trio',
    chords: 'Gm Gm Cm Cm F F F7 F7' },
  { name: 'Trio: the flute sings in B-flat over sustained strings and soft harp',
    chords: 'Bb F6 Gm Eb Bb F Eb F7 Bb F Gm Eb Cm Eb F7 Bb' },
  { name: 'Trio: the middle darkens, the violins join on long notes',
    chords: 'Dm Dm Gm Gm Eb Eb Cm F7 Bb F6 Gm Eb Cm Eb F7 Bb' },
  { name: 'Build: quiet on the ostinato, a bar at a time, back into G minor',
    chords: 'Gm Gm Eb Eb Cm Cm D7 D7 Gm Gm Cm Cm Eb Eb D7 D7' },
  { name: 'Scherzo reprise: the violins take the theme, the horns stabbing under them',
    chords: 'Gm Gm Eb Eb Cm Cmadd9 D7 D7 Gm Gm Cm Cm Ab Eb D7 Gm' },
  { name: 'Scherzo reprise: a rising sequence, the whole orchestra in fragments',
    chords: 'Eb Eb F F D7 D7 Eb Eb' },
  { name: 'Scherzo reprise: the build into the coda',
    chords: 'Cm Cm Eb Eb F F D7 D7' },
  { name: 'Coda: accelerando, the fragments closing on one last hit',
    chords: 'Gm Gm D7 D7 Cm Cm Eb Eb F F D7 D7 Gm Gm D7 Gm' },
];

const HEADER = formHeader(PLAN.map(({ name, chords }) => ({ name, bars: chords })));
const TOTAL = HEADER.chords.length; // 168 bars, about 3:27 with the accelerando
if (TOTAL !== 168) throw new Error(`form is ${TOTAL} bars, wanted 168`);

// The chord of an absolute bar number.
const at = (bar) => HEADER.chords[bar - 1];

// ------------------------------------------------------------------------------------- patterns
// The ostinato: six eighths a bar, the downbeat accented and the rest uneven, so no two bars of
// plucked strings land at exactly the same weight.
const PIZZ_ACC = [1, 0.83, 0.94, 0.79, 0.9, 0.81];
const pizzBar = (chord, v, seed = 0) =>
  voicing(chord).pizz.map((pitch, i) => note(pitch, '8', v * PIZZ_ACC[i] + ((i + seed) % 3) - 1)).join(' ');
// The ostinato with a hole in it, for the hocket and the coda's fragments.
const pizzStub = (chord, v) => `${note(voicing(chord).pizz[0], '4', v)} ${rest('2')}`;
const pizzSparse = (chord, v) =>
  `${note(voicing(chord).pizz[0], '4', v)} ${rest('4')} ${note(voicing(chord).pizz[2], '8', v - 8)} ${note(voicing(chord).pizz[0], '8', v - 4)}`;

// The pad: one open chord a bar, held for the whole bar.
const padBar = (chord, v) => hit(voicing(chord).pad, '2.', v);
// Two rolled harp chords a bar, the second an octave up in the top voices.
const harpTop = (chord) => voicing(chord).harp.map((p) => p + 12).filter((p) => p <= 84);
const harpBar = (chord, v) => `${hit(voicing(chord).harp, '4.', v)} ${hit(harpTop(chord), '4.', v - 6)}`;
const harpHit = (chord, v) => hit(voicing(chord).harp, '2.', v);

// The cellos: `space` leaves air between the notes, `drive` runs through the bar in eighths.
const BASS_ACC = [1, 0.86, 0.93, 0.82, 0.9, 0.85];
const celloSpace = (chord, v) =>
  voicing(chord).space.map(([pitch, dur], i) => note(pitch, dur, v - i * 3)).join(' ');
const celloDrive = (chord, v, seed = 0) =>
  voicing(chord).drive.map((pitch, i) => note(pitch, '8', v * BASS_ACC[i] + ((i + seed) % 2))).join(' ');
// The trio's bass: a slow half note and a quarter, warm and out of the way.
const celloLong = (chord, v) => `${note(voicing(chord).root + 12, '2', v)} ${note(voicing(chord).drive[2], '4', v - 6)}`;

// Timpani, the engine of the whole piece.
const tPulse = (v) => `${drum('k', '4', v)} ${rest('4')} ${drum('k', '4', v - 7)}`;
const tCrash = (v) => `${drum('[k cr]', '4', v)} ${rest('4')} ${drum('k', '4', v - 9)}`;
const tRoll = (a, b) => Array.from({ length: 6 }, (_, i) => drum('k', '8', a + ((b - a) * i) / 5)).join(' ');
const tFill = (v) =>
  `${drum('k', '4', v)} ${drum('tl', '8', v - 10)} ${drum('tm', '8', v - 5)} ${drum('th', '8', v - 1)} ${drum('s', '8', v)}`;

// ------------------------------------------------------------------------------------ the tune
// Theme A: an eight-bar phrase for the horns, then the answering phrase that lands on the tonic.
// [pitch, duration] pairs, six eighth-units to the bar.
const THEME_A = [
  [[67, '4'], [70, '8'], [74, '8'], [70, '4']], //                                   Gm
  [[77, '8'], [74, '8'], [70, '8'], [74, '8'], [74, '4']], //                         Gm
  [[75, '4'], [70, '8'], [67, '8'], [75, '4']], //                                    Eb
  [[77, '8'], [75, '8'], [74, '8'], [75, '8'], [70, '4']], //                         Eb
  [[67, '4'], [72, '8'], [75, '8'], [72, '4']], //                                    Cm
  [[74, '8'], [72, '8'], [67, '8'], [72, '8'], [74, '4']], //                         Cm
  [[74, '4'], [72, '8'], [69, '8'], [74, '4']], //                                    D7
  [[69, '8'], [69, '8'], [69, '8'], [69, '8'], [74, '4']], //                         D7
];
const THEME_B = [
  [[62, '8'], [67, '8'], [70, '8'], [74, '8'], [70, '4']], //                         Gm
  [[72, '8'], [70, '8'], [69, '8'], [67, '8'], [74, '4']], //                         Gm
  [[75, '4'], [74, '8'], [72, '8'], [67, '4']], //                                    Cm
  [[72, '8'], [74, '8'], [75, '8'], [77, '8'], [75, '4']], //                         Cm
  [[68, '4'], [72, '8'], [75, '8'], [72, '4']], //                                    Ab
  [[70, '4'], [67, '8'], [75, '8'], [70, '4']], //                                    Eb
  [[74, '4'], [72, '8'], [69, '8'], [66, '4']], //                                    D7
  [[67, '2'], [null, '4']], //                                                        Gm
];

// A phrase of [pitch, duration] bars into song text. The first note of a bar always leans in a
// little late (never early, so it can never sound under the chord before it), inner notes sway
// either side of the beat, and the same bar never gets exactly the same velocity twice.
const WEIGHT = { '2.': 2, '2': 4, '4': 6, '8': -2, '16': -6 };
const SWAY = [-9, 4, 12, -5, 16, 7, -11, 13];
function melody(bars, base, seed = 0, shift = 0) {
  return bars.map((bar, bi) => bar.map(([pitch, dur], i) => {
    if (pitch === null) return rest(dur);
    const late = i === 0 ? 10 + ((bi + seed) % 4) * 2 : SWAY[(bi * 5 + i * 3 + seed) % SWAY.length];
    const v = base + (WEIGHT[dur] ?? 0) + (i === 0 ? 7 : 0) + ((bi + i + seed) % 3) * 2;
    return note(pitch + shift, dur, v, late);
  }).join(' '));
}

// The trio tune for the flute, in B-flat: a long first phrase that settles, a second that turns
// the shape over, a darker middle on D minor, and the first phrase again to close.
const TRIO_A = [
  [[77, '4'], [74, '8'], [77, '8'], [82, '4']], //   Bb
  [[81, '4'], [79, '8'], [77, '8'], [74, '4']], //   F
  [[74, '4'], [77, '8'], [74, '8'], [79, '4']], //   Gm
  [[75, '4'], [79, '8'], [82, '8'], [79, '4']], //   Eb
  [[77, '4'], [82, '8'], [79, '8'], [74, '4']], //   Bb
  [[81, '4'], [84, '8'], [81, '8'], [77, '4']], //   F
  [[75, '4'], [82, '8'], [79, '8'], [75, '4']], //   Eb
  [[81, '4'], [79, '8'], [77, '8'], [75, '4']], //   F7
  [[74, '4'], [77, '8'], [79, '8'], [82, '4']], //   Bb
  [[84, '4'], [81, '8'], [79, '8'], [77, '4']], //   F
  [[79, '4'], [77, '8'], [74, '8'], [79, '4']], //   Gm
  [[82, '4'], [79, '8'], [75, '8'], [79, '4']], //   Eb
  [[79, '4'], [75, '8'], [72, '8'], [75, '4']], //   Cm
  [[79, '4'], [82, '8'], [75, '8'], [82, '4']], //   Eb
  [[81, '4'], [84, '8'], [81, '8'], [75, '4']], //   F7
  [[77, '2'], [null, '4']], //                       Bb
];
const TRIO_B = [
  [[77, '4'], [74, '8'], [72, '8'], [74, '4']], //   Dm
  [[69, '4'], [72, '8'], [74, '8'], [77, '4']], //   Dm
  [[74, '4'], [79, '8'], [77, '8'], [74, '4']], //   Gm
  [[70, '4'], [74, '8'], [77, '8'], [79, '4']], //   Gm
  [[75, '4'], [79, '8'], [82, '8'], [75, '4']], //   Eb
  [[79, '4'], [75, '8'], [79, '8'], [82, '4']], //   Eb
  [[79, '4'], [75, '8'], [72, '8'], [75, '4']], //   Cm
  [[81, '4'], [79, '8'], [77, '8'], [84, '4']], //   F7
  [[77, '4'], [82, '8'], [79, '8'], [74, '4']], //   Bb
  [[81, '4'], [79, '8'], [77, '8'], [74, '4']], //   F
  [[74, '4'], [77, '8'], [79, '8'], [74, '4']], //   Gm
  [[75, '4'], [79, '8'], [82, '8'], [79, '4']], //   Eb
  [[72, '4'], [75, '8'], [79, '8'], [75, '4']], //   Cm
  [[82, '4'], [79, '8'], [75, '8'], [82, '4']], //   Eb
  [[81, '4'], [84, '8'], [81, '8'], [75, '4']], //   F7
  [[77, '2.']], //                                   Bb
];

// ------------------------------------------------------------------------------------ assemble
const KEYS = ['violins', 'horns', 'flute', 'pizz', 'harp', 'glock', 'pad', 'cellos', 'timpani'];
const b = sectionBuilder(KEYS);
const rep = (bar, n) => Array(n).fill(bar);

// --- 1-8: intro. Timpani and pizzicato alone; the low strings and the pad creep in at bar 5.
b.section(PLAN[0].name, 8, {
  violins: rep(R, 8),
  horns: rep(R, 8),
  flute: rep(R, 8),
  glock: rep(R, 8),
  pizz: [
    pizzSparse('Gm', 96), pizzBar('Gm', 84), pizzBar('Eb', 86, 1), pizzBar('Eb', 88, 2),
    pizzBar('Cm', 92), pizzBar('Cm', 94, 1), pizzBar('D7', 96, 2), pizzBar('D7', 100, 1),
  ],
  harp: [R, R, R, R, harpHit('Cm', 54), harpHit('Cm', 56), harpHit('D7', 58), harpHit('D7', 60)],
  pad: [R, R, R, R, padBar('Cm', 58), padBar('Cm', 58), padBar('D7', 62), padBar('D7', 64)],
  cellos: [R, R, R, R, `${note(36, '2.', 74)}`, `${note(36, '2.', 74)}`, `${note(38, '2.', 78)}`, `${note(38, '2.', 80)}`],
  timpani: [
    tCrash(104), tPulse(90), tPulse(92), tPulse(88), tPulse(94), tPulse(90),
    tRoll(84, 112), tRoll(92, 118),
  ],
});

// --- 9-24: A1, the horns' theme, the violins only in the gaps.
const A1_ANSWERS = [
  R, R, R, `${rest('4')} ${note(82, '8', 98)} ${note(87, '8', 104)} ${note(82, '4', 100)}`,
  R, R, R, `${rest('4')} ${note(81, '8', 98)} ${note(78, '8', 104)} ${note(74, '4', 102)}`,
  R, R, R, `${rest('4')} ${note(79, '8', 98)} ${note(84, '8', 104)} ${note(79, '4', 102)}`,
  R, R, R, `${rest('4')} ${note(79, '8', 104)} ${note(74, '8', 100)} ${rest('4')}`,
];
const bassline = (from, count, v) => Array.from({ length: count }, (_, i) => celloSpace(at(from + i), v + (i % 4) * 3));
const padline = (from, count, v) => Array.from({ length: count }, (_, i) => padBar(at(from + i), v + (i % 4) * 2));
const ostinato = (from, count, v) => Array.from({ length: count }, (_, i) => pizzBar(at(from + i), v + (i % 4) * 2, i));

b.section(PLAN[1].name, 16, {
  violins: A1_ANSWERS,
  horns: [...melody(THEME_A, 96, 1), ...melody(THEME_B, 102, 2)],
  flute: rep(R, 16),
  pizz: ostinato(9, 16, 92),
  harp: rep(R, 16),
  glock: rep(R, 16),
  pad: padline(9, 16, 72),
  cellos: bassline(9, 16, 54),
  timpani: [
    tCrash(112), tPulse(96), tPulse(98), tPulse(94), tPulse(100), tPulse(96), tFill(104), tRoll(92, 116),
    tPulse(104), tPulse(98), tPulse(100), tPulse(96), tPulse(102), tPulse(100), tFill(108), tRoll(96, 120),
  ],
});

// --- 25-40: A2. The violins take the theme an octave up; the horns call on beat 3, then double the
// answering phrase at written pitch, so the whole statement is fuller without a second tune.
const hornCalls = (from, count, v) => Array.from({ length: count }, (_, i) =>
  `${rest('4')} ${rest('4')} ${hit(voicing(at(from + i)).stab, '8', v + (i % 3) * 3)} ${rest('8')}`);
b.section(PLAN[2].name, 16, {
  violins: [...melody(THEME_A, 104, 3, 12), ...melody(THEME_B, 108, 4, 12)],
  horns: [...hornCalls(25, 8, 102), ...melody(THEME_B, 104, 5)],
  flute: rep(R, 16),
  pizz: ostinato(25, 16, 96),
  harp: rep(R, 16),
  glock: rep(R, 16),
  pad: padline(25, 16, 82),
  cellos: Array.from({ length: 16 }, (_, i) => celloDrive(at(25 + i), 88 + (i % 4) * 3, i)),
  timpani: [
    tCrash(116), tPulse(102), tPulse(104), tPulse(100), tPulse(106), tPulse(102), tFill(110), tRoll(100, 120),
    tPulse(108), tPulse(104), tPulse(106), tPulse(102), tPulse(108), tPulse(106), tFill(112), tRoll(100, 122),
  ],
});

// --- 41-48: development, the first fragment. The horns throw out three notes, the violins answer
// with the same shape turned over; nothing fills the holes between them but the ostinato.
b.section(PLAN[3].name, 8, {
  violins: [R, `${note(86, '8', 100)} ${note(82, '8', 104)} ${note(79, '2', 102)}`,
    R, `${note(87, '8', 102)} ${note(82, '8', 104)} ${note(79, '2', 104)}`,
    R, `${note(84, '8', 100)} ${note(79, '8', 104)} ${note(79, '2', 102)}`,
    R, `${note(81, '8', 102)} ${note(78, '8', 104)} ${note(74, '2', 106)}`],
  horns: [`${rest('4')} ${note(70, '8', 100)} ${note(74, '8', 104)} ${note(70, '4', 102)}`, R,
    `${rest('4')} ${note(70, '8', 102)} ${note(75, '8', 106)} ${note(70, '4', 104)}`, R,
    `${rest('4')} ${note(72, '8', 102)} ${note(75, '8', 106)} ${note(72, '4', 104)}`, R,
    `${rest('4')} ${note(69, '8', 102)} ${note(66, '8', 106)} ${note(69, '4', 104)}`, R],
  flute: rep(R, 8),
  pizz: ostinato(41, 8, 88),
  harp: rep(R, 8),
  glock: rep(R, 8),
  pad: padline(41, 8, 76),
  cellos: Array.from({ length: 8 }, (_, i) => celloDrive(at(41 + i), 88 + (i % 4) * 2, i)),
  timpani: [tCrash(118), tPulse(96), tFill(108), tPulse(98), tCrash(116), tPulse(100), tFill(110), tRoll(104, 120)],
});

// --- 49-56: stretto. Two bars each for violins, horns, flute and cellos, with the ostinato only
// under every second fragment, so the theme seems to be thrown across the orchestra.
b.section(PLAN[4].name, 8, {
  violins: [`${note(84, '8', 104)} ${note(79, '8', 106)} ${note(75, '8', 108)} ${note(79, '8', 106)} ${note(84, '4', 108)}`,
    `${note(87, '4', 110)} ${note(84, '8', 106)} ${note(79, '8', 104)} ${note(84, '4', 108)}`, R, R, R, R, R, R],
  horns: [R, R,
    `${note(67, '8', 104)} ${note(70, '8', 106)} ${note(74, '8', 108)} ${note(70, '8', 106)} ${note(67, '4', 108)}`,
    `${note(74, '4', 110)} ${note(70, '8', 106)} ${note(67, '8', 104)} ${note(70, '4', 108)}`, R, R, R, R],
  flute: [R, R, R, R,
    `${note(80, '8', 100)} ${note(84, '8', 104)} ${note(87, '8', 106)} ${note(84, '8', 104)} ${note(80, '4', 106)}`,
    `${note(87, '4', 108)} ${note(84, '8', 104)} ${note(80, '8', 102)} ${note(84, '4', 106)}`, R, R],
  pizz: [pizzStub('Cm', 92), pizzBar('Cm', 92, 1), pizzStub('Gm', 94), pizzBar('Gm', 94, 2),
    pizzStub('Ab', 96), pizzBar('Ab', 96, 1), pizzBar('D7', 96, 2), pizzBar('D7', 100, 3)],
  harp: rep(R, 8),
  glock: rep(R, 8),
  pad: padline(49, 8, 76),
  cellos: [celloDrive('Cm', 82, 1), celloDrive('Cm', 82, 2), celloDrive('Gm', 84, 1), celloDrive('Gm', 84, 2),
    celloDrive('Ab', 86, 1), celloDrive('Ab', 86, 2),
    `${note(50, '8', 86)} ${note(54, '8', 88)} ${note(57, '8', 90)} ${note(54, '8', 88)} ${note(50, '4', 90)}`,
    `${note(57, '4', 92)} ${note(54, '8', 88)} ${note(50, '8', 86)} ${note(54, '4', 90)}`],
  timpani: [tPulse(96), tFill(110), tPulse(98), tFill(112), tPulse(100), tFill(114), tRoll(104, 118), tRoll(112, 124)],
});

// --- 57-64: the hocket. One gesture a bar and silence around it; the glockenspiel answers in the
// holes, and only bars 60 and 63 put the whole orchestra back on the beat.
b.section(PLAN[5].name, 8, {
  violins: [`${note(87, '4', 108)} ${rest('2')}`, R, `${rest('4')} ${note(84, '4', 110)} ${rest('4')}`, R,
    R, `${rest('4')} ${note(86, '4', 108)} ${rest('4')}`, `${hit([79, 86], '4', 116)} ${rest('2')}`, R],
  horns: [R, `${hit([63, 67, 70], '4', 110)} ${rest('2')}`, R, `${hit([65, 69, 72], '4', 108)} ${rest('2')}`,
    `${rest('4')} ${hit([62, 66, 69], '4', 108)} ${rest('4')}`, R, `${hit([62, 67, 70], '4', 116)} ${rest('8')} ${hit([62, 67, 70], '8', 104)} ${rest('4')}`, R],
  flute: rep(R, 8),
  pizz: [R, R, R, pizzBar('F', 98, 1), R, R, pizzBar('Gm', 104, 2), pizzBar('Gm', 96, 3)],
  harp: rep(R, 8),
  glock: [R, `${rest('4')} ${note(94, '8', 96)} ${note(87, '8', 92)} ${rest('4')}`,
    `${rest('2')} ${note(89, '8', 98)} ${rest('8')}`, R, R,
    `${rest('4')} ${rest('8')} ${note(93, '8', 100)} ${rest('4')}`, R,
    `${note(79, '8', 104)} ${note(86, '8', 100)} ${note(91, '8', 96)} ${note(94, '8', 94)} ${note(91, '4', 98)}`],
  pad: padline(57, 8, 74),
  cellos: [`${note(39, '2.', 92)}`, `${note(39, '2.', 88)}`, `${note(41, '2.', 92)}`, `${note(41, '8', 100)} ${note(41, '8', 96)} ${note(45, '8', 100)} ${note(48, '8', 102)} ${note(41, '4', 104)}`,
    `${note(38, '8', 106)} ${note(38, '8', 100)} ${note(45, '2', 104)}`, `R`, `R`, `R`],
  timpani: [tCrash(116), `${rest('4')} ${drum('k', '4', 112)} ${rest('4')}`, tCrash(112), tFill(114),
    tPulse(104), `${rest('4')} ${drum('[k cr]', '4', 118)} ${rest('4')}`, tCrash(120), tRoll(96, 126)],
});

// --- 65-72: the build. The ostinato and the cellos crescendo bar by bar under rising violin
// arpeggios while the horns hold F, the dominant of the trio's B-flat.
const climb = [
  [67, 70, 74, 79, 82, 86], [86, 82, 79, 74], [72, 75, 79, 84, 87, 84], [87, 84, 79, 75],
  [77, 81, 84, 89, 84, 81], [89, 84, 81, 77], [84, 87, 84, 81], [89, 89, 89, 89],
];
const climbDur = [['8', '8', '8', '8', '8', '8'], ['4', '8', '8', '4'], ['8', '8', '8', '8', '8', '8'],
  ['4', '8', '8', '4'], ['8', '8', '8', '8', '8', '8'], ['4', '8', '8', '4'], ['4', '8', '8', '4'],
  ['8', '8', '4', '4']];
b.section(PLAN[6].name, 8, {
  violins: climb.map((bar, bi) => bar.map((pitch, i) => note(pitch, climbDur[bi][i], 92 + bi * 4 + (i === 0 ? 6 : 0), i === 0 ? 10 : SWAY[(bi + i) % SWAY.length])).join(' ')),
  horns: [R, R, R, R, `${note(77, '2.', 88)}`, `${note(77, '2.', 96)}`, `${note(77, '2.', 106)}`, `${note(77, '2.', 116)}`],
  flute: rep(R, 8),
  pizz: ostinato(65, 8, 84).map((bar, i) => pizzBar(at(65 + i), 84 + i * 4, i)),
  harp: rep(R, 8),
  glock: [R, R, R, R, R, R, `${rest('4')} ${note(89, '8', 104)} ${note(94, '8', 100)} ${note(91, '8', 96)} ${rest('8')}`,
    `${note(91, '8', 108)} ${note(94, '8', 104)} ${note(96, '8', 100)} ${note(94, '8', 98)} ${note(93, '4', 104)}`],
  pad: padline(65, 8, 78),
  cellos: Array.from({ length: 8 }, (_, i) => celloDrive(at(65 + i), 92 + i * 3, i)),
  timpani: [tPulse(88), tPulse(92), tPulse(96), tPulse(100), tPulse(104), tPulse(108), tRoll(104, 118), tRoll(112, 126)],
});

// --- 73-88: the trio. Flute over a sustained pad, a slow cello, soft harp and a whisper of
// timpani; the pizzicato drops out completely, which is the whole point of arriving here.
b.section(PLAN[7].name, 16, {
  violins: rep(R, 16),
  horns: rep(R, 16),
  flute: melody(TRIO_A, 74, 6),
  pizz: rep(R, 16),
  harp: Array.from({ length: 16 }, (_, i) => harpBar(at(73 + i), 54 + (i % 4) * 2)),
  glock: rep(R, 16),
  pad: padline(73, 16, 60),
  cellos: Array.from({ length: 16 }, (_, i) => celloLong(at(73 + i), 74 + (i % 4) * 2)),
  timpani: Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? `${drum('k', '4', 70)} ${rest('2')}` : `${rest('4')} ${drum('k', '4', 60)} ${rest('4')}`)),
});

// --- 89-104: the trio's dark middle. The violins join on long notes, the pad opens out, and the
// trio closes back in B-flat with the ostinato still gone.
const TRIO_SUSTAIN = [
  `${note(86, '2.', 70)}`, `${note(81, '2.', 72)}`, `${note(82, '2.', 74)}`, `${note(79, '2.', 72)}`,
  `${note(87, '2.', 76)}`, `${note(82, '2.', 74)}`, `${note(84, '2.', 78)}`, `${note(84, '2.', 80)}`,
];
b.section(PLAN[8].name, 16, {
  violins: [...TRIO_SUSTAIN, ...rep(R, 8)],
  horns: [...rep(R, 12), `${note(55, '2.', 66)}`, `${note(58, '2.', 70)}`, `${note(60, '2.', 72)}`, `${note(62, '2.', 74)}`],
  flute: melody(TRIO_B, 78, 7),
  pizz: rep(R, 16),
  harp: Array.from({ length: 16 }, (_, i) => harpBar(at(89 + i), 58 + (i % 4) * 3)),
  glock: rep(R, 16),
  pad: padline(89, 16, 66),
  cellos: Array.from({ length: 16 }, (_, i) => celloLong(at(89 + i), 78 + (i % 4) * 2)),
  timpani: Array.from({ length: 16 }, (_, i) => (i % 4 === 2 ? `${drum('k', '4', 72)} ${rest('4')} ${drum('k', '4', 66)}` : `${drum('k', '4', 68)} ${rest('2')}`)),
});

// --- 105-120: the build back into G minor. Pizzicato first, then the cellos, the pad, the violins
// on a pedal and the horns; the timpani rolls into the reprise.
const pedalLadder = (from, count, pitch, v0, step) =>
  Array.from({ length: count }, (_, i) => {
    const v = v0 + i * step;
    return Array.from({ length: 6 }, (_, j) => note(pitch, '8', v - (j % 2 ? 6 : 0) + (i % 2))).join(' ');
  });
b.section(PLAN[9].name, 16, {
  violins: [...rep(R, 8), ...pedalLadder(113, 4, 79, 62, 6), ...pedalLadder(117, 4, 81, 84, 7)],
  horns: [...rep(R, 6), `${note(66, '2.', 70)}`, `${note(66, '2.', 76)}`,
    `${rest('4')} ${note(62, '8', 84)} ${note(65, '8', 88)} ${note(70, '4', 92)}`,
    `${rest('4')} ${note(62, '8', 90)} ${note(65, '8', 94)} ${note(70, '4', 98)}`,
    `${note(72, '2.', 100)}`, `${note(72, '2.', 104)}`,
    `${note(67, '2.', 108)}`, `${note(67, '2.', 112)}`,
    `${rest('4')} ${note(66, '8', 114)} ${note(69, '8', 116)} ${note(74, '4', 118)}`,
    `${note(74, '2.', 120)}`],
  flute: rep(R, 16),
  pizz: [...Array.from({ length: 8 }, (_, i) => pizzSparse(at(105 + i), 58 + i * 4)),
    ...Array.from({ length: 8 }, (_, i) => pizzBar(at(113 + i), 80 + i * 3, i))],
  harp: rep(R, 16),
  glock: rep(R, 16),
  pad: [...rep(R, 4), ...padline(109, 12, 62)],
  cellos: [...rep(R, 4), ...Array.from({ length: 12 }, (_, i) => celloSpace(at(109 + i), 60 + i * 3))],
  timpani: [...Array.from({ length: 14 }, (_, i) => tPulse(52 + i * 3)), tFill(100), tRoll(96, 124)],
});

// --- 121-136: the scherzo in tutti. Violins on the theme an octave up with the horns stabbing
// under them, then the horns take the theme and the violins double it from above.
b.section(PLAN[10].name, 16, {
  violins: [...melody(THEME_A, 112, 8, 12), ...melody(THEME_B, 110, 9, 12)],
  horns: [...hornCalls(121, 8, 112), ...melody(THEME_B, 108, 10)],
  flute: rep(R, 16),
  pizz: ostinato(121, 16, 104),
  harp: rep(R, 16),
  glock: rep(R, 16),
  pad: padline(121, 16, 88),
  cellos: Array.from({ length: 16 }, (_, i) => celloDrive(at(121 + i), 104 + (i % 4) * 3, i)),
  timpani: [
    tCrash(122), tPulse(108), tPulse(110), tPulse(106), tPulse(112), tPulse(108), tFill(116), tRoll(108, 124),
    tCrash(120), tPulse(110), tPulse(112), tPulse(108), tPulse(114), tPulse(112), tFill(118), tRoll(112, 126),
  ],
});

// --- 137-144: a rising sequence over Eb - F - D7 - Eb, the violins breaking the theme into its
// arpeggio and the horns answering with the stab.
const SEQ = [
  `${note(75, '8', 106)} ${note(79, '8', 108)} ${note(82, '8', 110)} ${note(87, '8', 108)} ${note(82, '4', 110)}`,
  `${note(82, '8', 108)} ${note(79, '8', 106)} ${note(75, '8', 108)} ${note(79, '8', 108)} ${note(82, '4', 110)}`,
  `${note(77, '8', 108)} ${note(81, '8', 110)} ${note(84, '8', 112)} ${note(81, '8', 110)} ${note(77, '4', 112)}`,
  `${note(84, '4', 114)} ${note(81, '8', 110)} ${note(77, '8', 108)} ${note(81, '4', 112)}`,
  `${note(74, '8', 110)} ${note(78, '8', 112)} ${note(81, '8', 114)} ${note(86, '8', 112)} ${note(81, '4', 114)}`,
  `${note(86, '4', 116)} ${note(84, '8', 112)} ${note(81, '8', 110)} ${note(78, '4', 112)}`,
  `${note(75, '8', 112)} ${note(79, '8', 114)} ${note(82, '8', 116)} ${note(87, '8', 114)} ${note(82, '4', 116)}`,
  `${note(87, '4', 118)} ${note(82, '8', 114)} ${note(79, '8', 112)} ${note(75, '4', 114)}`,
];
b.section(PLAN[11].name, 8, {
  violins: SEQ,
  horns: [`${hit([63, 67, 70], '4', 112)} ${rest('4')} ${hit([63, 67, 70], '8', 104)} ${rest('8')}`,
    `${rest('4')} ${hit([63, 67, 70], '4', 108)} ${rest('4')}`,
    `${hit([65, 69, 72], '4', 112)} ${rest('4')} ${hit([65, 69, 72], '8', 106)} ${rest('8')}`,
    `${rest('4')} ${hit([65, 69, 72], '4', 110)} ${rest('4')}`,
    `${hit([62, 66, 69], '4', 114)} ${rest('4')} ${hit([62, 66, 69], '8', 108)} ${rest('8')}`,
    `${hit([62, 66, 69], '4', 116)} ${rest('4')} ${hit([62, 66, 69], '8', 110)} ${rest('8')}`,
    `${hit([63, 67, 70], '4', 114)} ${rest('4')} ${hit([63, 67, 70], '8', 108)} ${rest('8')}`,
    `${hit([63, 67, 70], '4', 116)} ${rest('4')} ${hit([63, 67, 70], '8', 112)} ${rest('8')}`],
  flute: rep(R, 8),
  pizz: ostinato(137, 8, 106),
  harp: rep(R, 8),
  glock: rep(R, 8),
  pad: padline(137, 8, 90),
  cellos: Array.from({ length: 8 }, (_, i) => celloDrive(at(137 + i), 106 + (i % 4) * 3, i)),
  timpani: [tCrash(124), tFill(118), tPulse(112), tFill(120), tCrash(124), tFill(118), tPulse(114), tRoll(112, 126)],
});

// --- 145-152: the last build of the scherzo, everything climbing into the accelerando.
const RISE = [
  `${note(72, '8', 106)} ${note(75, '8', 108)} ${note(79, '8', 110)} ${note(84, '8', 110)} ${note(87, '8', 112)} ${note(84, '8', 110)}`,
  `${note(87, '4', 114)} ${note(84, '8', 110)} ${note(79, '8', 108)} ${note(84, '4', 112)}`,
  `${note(75, '8', 108)} ${note(79, '8', 110)} ${note(82, '8', 112)} ${note(87, '8', 112)} ${note(91, '8', 114)} ${note(87, '8', 112)}`,
  `${note(91, '4', 116)} ${note(87, '8', 112)} ${note(82, '8', 110)} ${note(87, '4', 114)}`,
  `${note(77, '8', 110)} ${note(81, '8', 112)} ${note(84, '8', 114)} ${note(89, '8', 114)} ${note(84, '8', 116)} ${note(81, '8', 114)}`,
  `${note(89, '4', 118)} ${note(84, '8', 114)} ${note(81, '8', 112)} ${note(84, '4', 116)}`,
  `${note(74, '8', 112)} ${note(78, '8', 114)} ${note(81, '8', 116)} ${note(86, '8', 116)} ${note(81, '8', 118)} ${note(78, '8', 116)}`,
  `${note(86, '2', 120)} ${rest('4')}`,
];
b.section(PLAN[12].name, 8, {
  violins: RISE,
  horns: [`${note(60, '2.', 104)}`, `${note(63, '2.', 108)}`, `${note(63, '2.', 110)}`, `${note(67, '2.', 112)}`,
    `${note(65, '2.', 114)}`, `${note(72, '2.', 116)}`, `${note(66, '2.', 118)}`, `${note(74, '2.', 120)}`],
  flute: rep(R, 8),
  pizz: ostinato(145, 8, 108),
  harp: rep(R, 8),
  glock: rep(R, 8),
  pad: padline(145, 8, 90),
  cellos: Array.from({ length: 8 }, (_, i) => celloDrive(at(145 + i), 108 + i * 2, i)),
  timpani: [tCrash(124), tFill(120), tPulse(114), tFill(122), tCrash(124), tFill(120), tRoll(112, 124), tRoll(118, 126)],
});

// --- 153-168: the coda, speeding up. Fragments with silence, then the ostinato at full tilt, a
// rising sequence, and one last hit on G minor in the last bar.
b.section(PLAN[13].name, 16, {
  violins: [`${hit([79, 86], '4', 118)} ${rest('2')}`, R, `${rest('4')} ${note(86, '8', 118)} ${note(82, '8', 116)} ${note(81, '4', 118)}`, R,
    `${note(84, '8', 112)} ${note(79, '8', 114)} ${note(84, '8', 116)} ${note(87, '8', 114)} ${note(84, '4', 116)}`,
    `${note(87, '4', 118)} ${note(84, '8', 114)} ${note(79, '8', 112)} ${note(84, '4', 116)}`,
    `${note(75, '8', 114)} ${note(79, '8', 116)} ${note(82, '8', 118)} ${note(87, '8', 116)} ${note(82, '4', 118)}`,
    `${note(87, '2', 120)} ${rest('4')}`,
    `${note(77, '8', 116)} ${note(81, '8', 118)} ${note(84, '8', 120)} ${note(89, '8', 118)} ${note(84, '4', 120)}`,
    `${note(89, '4', 122)} ${note(84, '8', 118)} ${note(81, '8', 116)} ${note(84, '4', 120)}`,
    `${note(74, '8', 118)} ${note(78, '8', 120)} ${note(81, '8', 122)} ${note(86, '8', 120)} ${note(81, '4', 122)}`,
    `${note(86, '4', 124)} ${note(81, '8', 120)} ${note(78, '8', 118)} ${note(86, '4', 122)}`,
    `${hit([79, 86], '4', 120)} ${rest('4')} ${hit([79, 86], '8', 114)} ${rest('8')}`,
    `${hit([79, 86], '4', 122)} ${rest('4')} ${hit([79, 86], '8', 116)} ${rest('8')}`,
    `${hit([81, 86], '4', 124)} ${rest('4')} ${hit([81, 86], '8', 118)} ${rest('8')}`,
    `${hit([79, 86, 91], '2.', 126)}`],
  horns: [R, `${hit([62, 67, 70], '4', 116)} ${rest('2')}`, R, `${rest('4')} ${hit([62, 66, 69], '4', 118)} ${rest('4')}`,
    `${hit([60, 63, 67], '4', 114)} ${rest('4')} ${hit([60, 63, 67], '8', 108)} ${rest('8')}`,
    `${rest('4')} ${hit([60, 63, 67], '4', 112)} ${rest('4')}`,
    `${hit([63, 67, 70], '4', 116)} ${rest('4')} ${hit([63, 67, 70], '8', 110)} ${rest('8')}`,
    `${rest('4')} ${hit([63, 67, 70], '4', 114)} ${rest('4')}`,
    `${hit([65, 69, 72], '4', 118)} ${rest('4')} ${hit([65, 69, 72], '8', 112)} ${rest('8')}`,
    `${rest('4')} ${hit([65, 69, 72], '4', 116)} ${rest('4')}`,
    `${hit([62, 66, 69], '4', 120)} ${rest('4')} ${hit([62, 66, 69], '8', 114)} ${rest('8')}`,
    `${rest('4')} ${hit([62, 66, 69], '4', 118)} ${rest('4')}`,
    `${hit([62, 67, 70], '4', 120)} ${rest('4')} ${hit([62, 67, 70], '8', 114)} ${rest('8')}`,
    `${hit([62, 67, 70], '4', 122)} ${rest('4')} ${hit([62, 67, 70], '8', 116)} ${rest('8')}`,
    `${hit([62, 66, 69], '4', 124)} ${rest('4')} ${hit([62, 66, 69], '8', 118)} ${rest('8')}`,
    `${hit([62, 67, 70], '2.', 126)}`],
  flute: rep(R, 16),
  pizz: [pizzStub('Gm', 110), R, pizzStub('D7', 112), R,
    ...ostinato(157, 4, 110),
    ...ostinato(161, 4, 114),
    pizzBar('Gm', 116, 1), pizzBar('Gm', 116, 2), pizzBar('D7', 118, 3), hit(voicing('Gm').pizz, '2.', 122)],
  harp: [...rep(R, 15), harpHit('Gm', 96)],
  glock: [...rep(R, 12), `${rest('4')} ${note(91, '8', 112)} ${note(86, '8', 108)} ${rest('4')}`,
    `${note(91, '8', 114)} ${note(96, '8', 110)} ${note(91, '8', 108)} ${note(86, '8', 106)} ${note(91, '4', 110)}`,
    `${note(93, '8', 112)} ${note(89, '8', 108)} ${note(86, '8', 106)} ${note(81, '8', 104)} ${note(86, '4', 114)}`,
    `${hit([86, 91], '2.', 116)}`],
  pad: padline(153, 16, 88),
  cellos: [`${note(43, '2.', 110)}`, `${note(43, '8', 106)} ${note(43, '8', 102)} ${note(50, '8', 106)} ${note(43, '8', 108)} ${note(46, '4', 110)}`,
    `${note(38, '2.', 112)}`, `${note(38, '8', 108)} ${note(38, '8', 104)} ${note(45, '8', 108)} ${note(38, '8', 110)} ${note(48, '4', 112)}`,
    ...Array.from({ length: 8 }, (_, i) => celloDrive(at(157 + i), 110 + i * 2, i)),
    `${note(43, '2.', 120)}`, `${note(43, '2.', 120)}`, `${note(38, '2.', 122)}`, `${note(43, '2.', 126)}`],
  timpani: [tCrash(122), `${rest('4')} ${drum('k', '4', 116)} ${rest('4')}`, tCrash(120),
    `${rest('4')} ${drum('[k cr]', '4', 118)} ${rest('4')}`,
    ...Array.from({ length: 8 }, (_, i) => (i % 4 === 3 ? tFill(116) : tPulse(112 + i))),
    tCrash(126), tCrash(126), tRoll(100, 126),
    `${drum('[k cr]', '2.', 127)}`],
});

// ------------------------------------------------------------------------------------- the text
const CHORD_LINES = HEADER.chordLines.join('\n');
const FORM_LINES = HEADER.formLines.join('\n');

const ABOUT =
  'An orchestral scherzo, a night chase in G minor at 144 BPM in 3/4: a pizzicato ostinato and a timpani pulse under a horn theme, the violins taking it an octave up, a development that hacks the theme into fragments across the orchestra, a lyrical trio in B-flat for solo flute over sustained strings and harp, and a coda that accelerates into one last hit.';

const HEADER_NOTE = `# The Black Coach, an original orchestral scherzo in G minor by Arena Agent & SZ.
# Form: timpani-and-pizzicato intro - scherzo A (horns) - scherzo A (violins) - development in
# fragments - trio in B-flat (flute) - a quiet build on the ostinato - the scherzo in tutti - a coda
# that accelerates. 3/4 at 144 BPM, 168 bars, about three and a half minutes.
#
# The ostinato is the whole piece: the pizzicato plays six eighths a bar (root, root, fifth, root,
# third, fifth) with the downbeat accented and no two beats at the same weight, and the timpani
# answers it on beats 1 and 3, rolling into every section change. The horns state theme A over that
# grid, the violins take it an octave up, and the development breaks it into three-note fragments
# handed from the violins to the horns to the flute to the cellos, with whole bars of silence
# between them. The trio moves to B-flat: the pizzicato stops dead, the flute sings over an open
# string pad, a slow cello and rolled harp chords, and the timpani drops to a whisper. Then the
# ostinato returns quietly and climbs back into G minor for the tutti reprise and the accelerando.
#
# Borrowed from the bank, both through this style: the pizzicato strings ('pizzicato') for the
# ostinato, and the glockenspiel for the holes in the hocket and the last bar. No oboe, no bells.
#
# Built by its own generator, tools/arranger/the-black-coach.mjs, from tools/arranger/lib.mjs:
# the harmony, the theme, the figures, the voicings, the velocities and the microtiming all live there.
#
# Human feel: the first note of a horn or flute bar always leans in +10 to +16 ticks (never early,
# so it can never sound under the bar before it) and the inner notes sway -11 to +16; the pizzicato
# stays on the grid but its six eighths never land at the same velocity twice; the timpani rolls
# into every section change; nothing swings.`;

const HEADER_TEXT = [
  'title: The Black Coach',
  'composer: Arena Agent & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: orchestral',
  'key: G minor to B-flat major',
  'tempo: 144',
  'time: 3/4',
  `about: ${ABOUT}`,
].join('\n');

const TRACKS = [
  ['violins', 'track violins role=lead inst=strings vol=1 pan=-0.25'],
  ['horns', 'track horns role=lead2 inst=brass vol=0.78 pan=-0.12'],
  ['flute', 'track flute role=counter vol=0.72 pan=0.26'],
  ['pizz', 'track pizzicato role=arp inst=pizzicato vol=0.95 pan=0.2'],
  ['harp', 'track harp role=chords vol=0.5 pan=0.32'],
  ['glock', 'track glockenspiel role=arp vol=0.58 pan=0.42'],
  ['pad', 'track strings role=pad vol=0.82 pan=0.08'],
  ['cellos', 'track cellos role=bass vol=0.5 pan=0'],
  ['timpani', 'track timpani role=drums vol=0.46 pan=-0.15'],
];

// Every bar has to fill exactly one 3/4 bar, or the parser would reject the file and a wrong note
// count would hide behind it.
for (const key of KEYS) {
  b.tracks[key].forEach((bar, index) => {
    if (bar === R) return;
    const ticks = barLength(bar, BAR);
    if (ticks !== BAR) throw new Error(`${key}, bar ${index + 1}: ${ticks} ticks instead of ${BAR}: ${bar}`);
  });
}

const text = `${HEADER_NOTE}
#
${CHORD_LINES}
#
# Form:
${FORM_LINES}
#
${HEADER_TEXT}

@bars 153-168 tempo=148..186

${TRACKS.map(([key, head]) => `${head}\n${b.block(key)}`).join('\n\n')}
`;

const path = saveSong(out, 'the-black-coach.song', text);
console.log(`wrote ${path} (${TOTAL} bars)`);
