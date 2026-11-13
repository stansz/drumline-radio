// The Silent Keep, by DeepSeek V4 Flash & SZ. An original cinematic heavy-metal epic in E minor:
// a clean guitar and solo cello state the theme, the band kicks into a Phrygian gallop, twin
// guitars trade thirds and sixths, a long guitar solo climbs through sixteenth and sextuplet runs
// to a bent high E, and the fire dies back to a lone cello. Every melody and riff is written here;
// nothing is borrowed.
//   node tools/arranger/the-silent-keep.mjs [outDir]
import {
  chordText, MIXED, noteName, outDir, R, saveSong, sectionBuilder,
} from './lib.mjs';

const out = outDir();

const nm = (n) => noteName(n, MIXED);

// Each chord keeps one voicing everywhere. The bass sits low; the power chords are low-mid; the
// walls, pads and piano stay out of the lead's way; the clean arpeggio is written an octave above
// where clean-electric sounds, as guitar music is.
const CH = {
  Em: { bass: 40, fifth: 47, power: [52, 59], wall: [52, 55, 64, 67], pad: [52, 55, 64], pianoLow: [40, 52], pianoChord: [55, 59, 64], clean: [64, 71, 76, 79, 83, 79, 76, 71] },
  C: { bass: 48, fifth: 43, power: [60, 67], wall: [60, 64, 67, 72], pad: [60, 64, 67], pianoLow: [36, 48], pianoChord: [52, 55, 60], clean: [60, 67, 72, 76, 79, 76, 72, 67] },
  G: { bass: 43, fifth: 50, power: [55, 62], wall: [55, 59, 62, 67], pad: [55, 59, 62], pianoLow: [43, 55], pianoChord: [59, 62, 67], clean: [67, 71, 74, 79, 83, 79, 74, 71] },
  D: { bass: 50, fifth: 45, power: [62, 69], wall: [62, 69, 74], pad: [62, 69, 74], pianoLow: [50, 62], pianoChord: [54, 57, 62], clean: [62, 69, 74, 78, 81, 78, 74, 69] },
  B: { bass: 47, fifth: 42, power: [59, 66], wall: [59, 71], pad: [59, 71], pianoLow: [47, 59], pianoChord: [63, 66, 71], clean: [59, 66, 71, 75, 78, 75, 71, 66] },
  Am: { bass: 45, fifth: 40, power: [57, 64], wall: [57, 60, 64, 69], pad: [57, 60, 64], pianoLow: [45, 57], pianoChord: [60, 64, 69], clean: [57, 64, 69, 72, 76, 72, 69, 64] },
  F: { bass: 41, fifth: 36, power: [53, 60], wall: [53, 57, 60, 65], pad: [53, 57, 60], pianoLow: [41, 53], pianoChord: [57, 60, 65], clean: [53, 60, 65, 69, 72, 69, 65, 60] },
};

// Human feel: a tokenizer that adds per-note velocities and small start offsets. Rests keep their
// own timing, and the continuation of a tie or bend is left alone because the first token owns the
// offset and velocity.
function humanize(bar, { vel = 100, off = 0, pattern = [0], offPattern = null } = {}) {
  if (bar === 'R' || bar === null) return bar;
  const tokens = bar.match(/\[[^\]]*\][^\s]*|[^\s]+/g) ?? [];
  let held = false;
  let n = 0;
  return tokens
    .map((token) => {
      if (token === 'R') return token;
      const rest = token.startsWith('r');
      const continuation = held;
      held = /[~^]$/.test(token);
      if (rest || continuation) return token;
      const mark = /[~^]$/.exec(token)?.[0] ?? '';
      let core = mark ? token.slice(0, -1) : token;
      let existing = '';
      const vm = /:(\d+)$/.exec(core);
      if (vm) {
        existing = vm[0];
        core = core.slice(0, -vm[0].length);
      }
      const shift = off + (offPattern ? offPattern[n % offPattern.length] : 0);
      const level = Math.max(1, Math.min(127, vel + (pattern[n % pattern.length] ?? 0)));
      n += 1;
      return `${core}${shift >= 0 ? '+' : ''}${shift}${existing || `:${level}`}${mark}`;
    })
    .join(' ');
}

// Harmony and accompaniment helpers -----------------------------------------------------------
const power = (c) => chordText(CH[c].power, nm);
const hold = (c, time, v, which = 'pad') =>
  `${chordText(CH[c][which], nm)}${time === '6/8' ? '/2.' : '/1'}:${v}`;

function cleanBar(c, v, i = 0) {
  const raw = CH[c].clean.map((n) => `${nm(n)}/8`).join(' ');
  return humanize(raw, {
    vel: v,
    offPattern: [0, 6, 2, 8, 3, 7, 1, 5].map((x) => x + (i % 2)),
    pattern: [4, -4, 2, -6, 3, -5, 0, -3],
  });
}

function pianoBar(c, time, v, kind = 'half') {
  const low = chordText(CH[c].pianoLow, nm);
  const chord = chordText(CH[c].pianoChord, nm);
  if (time === '6/8') return `${low}/4.+8:${v} ${chord}/4.+14:${v - 4}`;
  if (kind === 'quarter') return `${low}/4:${v} ${chord}/4+12:${v - 4} ${low}/4:${v - 2} ${chord}/4+16:${v - 6}`;
  return `${low}/2:${v} ${chord}/2+14:${v - 4}`;
}

// The gallop: one eighth and two sixteenths per beat. The first note is a hair late, the two
// sixteenths closer to the grid, and the level of each group moves so the line breathes.
function gallopBass(c, time, v) {
  const root = nm(CH[c].bass);
  const groups = time === '6/8' ? 3 : 4;
  const parts = [];
  for (let g = 0; g < groups; g++) {
    const level = v + (g === 0 ? 4 : g === groups - 1 ? 2 : 0);
    parts.push(`${root}/8+${4 + (g % 2)}:${level}`);
    parts.push(`${root}/16+${2 + (g % 2)}:${level - 10}`);
    parts.push(`${root}/16+${3 + (g % 2)}:${level - 12}`);
  }
  return parts.join(' ');
}

function chugBar(c, time, v, kind = 'eighth') {
  const p = power(c);
  if (time === '6/8') {
    if (kind === 'quarter') return `${p}/4.'+8:${v} ${p}/4.'+14:${v - 5}`;
    if (kind === 'gallop')
      return [0, 1, 2]
        .map((g) => `${p}/8'+${10 + g}:${v + (g === 0 ? 4 : 0)} ${p}/16'+${12 + g}:${v - 8} ${p}/16'+${14 + g}:${v - 10}`)
        .join(' ');
    return [0, 1, 2, 3, 4, 5]
      .map((i) => `${p}/8'+${10 + (i % 3)}:${v + (i === 0 ? 5 : i === 3 ? 3 : i % 2 ? -6 : 0)}`)
      .join(' ');
  }
  if (kind === 'quarter')
    return [0, 1, 2, 3].map((i) => `${p}/4'+${8 + i}:${v + (i === 0 ? 5 : i === 2 ? 2 : -4)}`).join(' ');
  if (kind === 'gallop')
    return [0, 1, 2, 3]
      .map((g) => `${p}/8'+${10 + g}:${v + (g === 0 ? 5 : g === 2 ? 2 : 0)} ${p}/16'+${12 + g}:${v - 8} ${p}/16'+${14 + g}:${v - 10}`)
      .join(' ');
  return [0, 1, 2, 3, 4, 5, 6, 7]
    .map((i) => `${p}/8'+${10 + (i % 4)}:${v + (i === 0 ? 6 : i === 4 ? 4 : i % 2 ? -7 : -2)}`)
    .join(' ');
}

// Drums are written with their own offsets and levels. The snare sits behind the kick, and the
// sixteenth-note gallop on the kick is the engine of the metal sections.
const D4 = {
  verseA: 'k/8+2:104 k/16+3:90 k/16+4:92 s/4+14:110 k/8+3:104 k/16+2:90 k/16+4:92 s/4+16:112',
  verseB: 'k/8+2:104 k/16+3:90 k/16+4:92 s/4+14:110 k/8+3:104 k/16+2:90 k/16+4:92 s/8+16:108 s/8+18:92',
  chorus: 'k/8+2:112 k/16+3:98 k/16+4:100 s/4+14:116 k/8+3:112 k/16+2:98 k/16+4:100 s/4+16:118',
  drive: 'k/8+2:110 k/16+3:96 k/16+4:98 s/8+14:112 s/8+16:108 k/8+3:110 k/16+2:96 k/16+4:98 s/8+16:116 s/8+18:100',
  half: 'k/4+2:100 r/4 s/4+16:104 k/8+3:88 k/8+2:92',
  fill: 'k/8+2:104 s/8+12:108 s/8+8:96 s/8+10:100 tm/16+4:96 tm/16+6:100 th/16+4:104 th/16+6:108 tl/16+4:110 tl/16+6:114 s/16+10:118 s/16+12:122',
  fillBig: 'k/4+2:112 s/8+14:116 s/8+12:104 th/8+6:108 tm/8+8:112 tl/16+6:116 tl/16+8:120 s/8+14:122',
  stop: 'k/4+2:116 s/4+14:118 r/2',
};
const D6 = {
  drive: 'k/8+2:108 s/8+14:112 k/8+3:106 s/8+16:114 k/8+2:108 s/8+14:112',
  vary: 'k/8+2:108 s/8+14:112 s/8+12:104 k/8+3:106 s/8+16:114 s/8+14:108',
  fill: 'k/16+2:104 s/16+8:100 s/16+6:96 s/16+10:104 tm/16+4:96 tm/16+6:100 th/16+4:104 th/16+6:108 tl/16+4:112 tl/16+6:116 s/16+8:118 s/16+10:122',
};

function cym4(v, { crash = false, ride = false, open = false } = {}) {
  const offsets = [-4, 2, -6, 0, -3, 1, -5, -2];
  const levels = [8, -12, -4, -14, -6, -10, -8, -2];
  return Array.from({ length: 8 }, (_, i) => {
    const drum = crash && i === 0 ? '[cr h]' : ride ? 'rd' : open && i === 7 ? 'oh' : 'h';
    const off = crash && i === 0 ? 0 : offsets[i];
    return `${drum}/8${off >= 0 ? '+' : ''}${off}:${v + levels[i]}`;
  }).join(' ');
}
function cym6(v, { crash = false, ride = true } = {}) {
  const offsets = [-4, 2, -6, 0, -3, 1];
  const levels = [8, -12, -4, -14, -6, -8];
  return Array.from({ length: 6 }, (_, i) => {
    const drum = crash && i === 0 ? '[cr h]' : ride ? 'rd' : 'h';
    const off = crash && i === 0 ? 0 : offsets[i];
    return `${drum}/8${off >= 0 ? '+' : ''}${off}:${v + levels[i]}`;
  }).join(' ');
}

// The main theme, the vocal verse, and the twin-guitar return all use this line. THEME_B lifts it
// to the top of the guitar's register before the band enters.
const THEME_A = [
  'B4/2 E5/4 D5/4',
  'C5/2. B4/4',
  'G4/2 B4/4 D5/4',
  'D5/1',
  'E5/2 G5/4 F#5/4',
  'E5/2. D5/4',
  'C5/2 B4/4 D5/4',
  'B4/1',
];
const THEME_B = [
  'G5/2 E5/4 B4/4',
  'C5/2. E5/4',
  'D5/2 B4/4 G4/4',
  'A4/2. B4/4',
  'A4/2 C5/4 E5/4',
  'D#5/2 F#5/4 B5/4',
  'B5/2 G5/4 E5/4',
  'E5/1',
];
// The same theme transposed down two octaves for the solo cello.
const CELLO_A = [
  'B2/2 E3/4 D3/4',
  'C3/2. B2/4',
  'G2/2 B2/4 D3/4',
  'D3/1',
  'E3/2 G3/4 F#3/4',
  'E3/2. D3/4',
  'C3/2 B2/4 D3/4',
  'B2/1',
];
const CELLO_INTRO_END = [
  'E3/2 G3/4 B2/4',
  'C3/2. B2/4',
  'A2/2. B2/4',
  'B2/1',
];
// The chorus is its own wide, singable line.
const CHORUS = [
  'G4/2 C5/4 E5/4',
  'D5/2. F#5/4',
  'E5/2 G5/4 B5/4',
  'B5/2. A5/4',
  'G5/2 E5/4 C5/4',
  'D5/2. F#5/4',
  'F#5/2 D#5/4 B4/4',
  'B4/1',
  'G4/2 C5/4 E5/4',
  'D5/2. F#5/4',
  'E5/2 G5/4 B5/4',
  'B5/2. D6/4',
  'C6/2 G5/4 E5/4',
  'D6/2. A5/4',
  'B5/2 F#5/4 D#5/4',
  'B5/1',
];
const CHORUS_HARMONY = [
  'E4/2 G4/4 C5/4',
  'A4/2. D5/4',
  'B4/2 E5/4 G5/4',
  'G5/2. F#5/4',
  'E5/2 C5/4 G4/4',
  'A4/2. D5/4',
  'D#5/2 B4/4 F#4/4',
  'D#4/1',
  'E4/2 G4/4 C5/4',
  'A4/2. D5/4',
  'B4/2 E5/4 G5/4',
  'G5/2. B5/4',
  'E5/2 C5/4 G4/4',
  'A5/2. F#5/4',
  'F#5/2 D#5/4 B4/4',
  'D#5/1',
];
const THEME_HARMONY = [
  'G4/2 B4/4 G4/4',
  'A4/2. G4/4',
  'B3/2 G4/4 B4/4',
  'F#4/1',
  'G4/2 B4/4 D5/4',
  'G4/2. B4/4',
  'A4/2 G4/4 A4/4',
  'D#4/1',
  'B4/2 G4/4 E4/4',
  'E4/2. G4/4',
  'F#4/2 D4/4 B3/4',
  'F#4/2. A4/4',
  'C4/2 E4/4 A4/4',
  'F#4/2 B4/4 D#5/4',
  'D5/2 B4/4 G4/4',
  'G4/1',
];

// Section 6, the solo. Bars 101-148, at 160 BPM. The phrases mix pentatonic and harmonic-minor
// shapes, sixteenth and sextuplet runs, bends, tapping, and a trill. The second guitar answers in
// bars 119-120 and 123-124, then the lead climbs to the held, bent E6 in bars 147-148.
const SOLO = [
  // 101-108: the opening statement
  'B4/8^ E5/4. G5/8 A5/8 B5/4',
  'r/4 B5/8 A5/8 G5/4 E5/4',
  'F5/4. E5/8 C5/4 A4/4',
  'C5/8^ D5/8^ E5/4 F5/4 A5/4',
  'E5/16 F#5/16 G5/16 A5/16 B5/16 C6/16 B5/16 A5/16 G5/8 E5/8 D5/4',
  'B5/8 A5/8 G5/8 F#5/8 E5/8 D5/8 B4/4',
  'F#5/4 D#5/4 B4/4 F#5/4',
  'B5/8^ D#6/8^ F#6/4 B6/2',
  // 109-116: sixteenth and sextuplet runs, then a harmonic-minor descent
  'E5/16 G5/16 B5/16 E6/16 D6/16 B5/16 G5/16 E5/16 F#5/16 G5/16 A5/16 B5/16 D6/16 B5/16 A5/16 B5/16',
  'C6/16 B5/16 G5/16 E5/16 G5/16 B5/16 C6/16 E6/16 D6/16 C6/16 B5/16 G5/16 E5/16 G5/16 B5/16 D6/16',
  'G5/16 B5/16 D6/16 G6/16 F#6/16 D6/16 B5/16 G5/16 A5/16 B5/16 D6/16 B5/16 G5/16 D5/16 B4/16 G4/16',
  'D5/16 F#5/16 A5/16 D6/16 F#6/16 D6/16 A5/16 F#5/16 E5/16 F#5/16 A5/16 D6/16 A5/16 F#5/16 D5/16 A4/16',
  'E5/16t F#5/16t G5/16t A5/16t B5/16t C6/16t B5/16t A5/16t G5/16t F#5/16t E5/16t D5/16t E5/16t F#5/16t G5/16t A5/16t B5/16t D6/16t B5/16t A5/16t G5/16t F#5/16t E5/16t D5/16t',
  'C6/16t B5/16t A5/16t G5/16t E5/16t G5/16t A5/16t B5/16t C6/16t D6/16t E6/16t D6/16t C6/16t B5/16t A5/16t G5/16t E5/16t G5/16t A5/16t B5/16t C6/16t B5/16t G5/16t E5/16t',
  'B5/16 D#6/16 F#6/16 D#6/16 B5/16 F#5/16 D#5/16 B4/16 F#5/16 A#5/16 B5/16 D#6/16 F#6/16 B6/16 F#6/16 D#6/16',
  'B6/4^ A#6/4^ G#6/4^ F#6/4',
  // 117-120: lead, then the second guitar answers
  'E5/8 G5/8 B5/8 E6/8 D6/8 B5/8 G5/4',
  'C6/8 A5/8 F5/8 A5/8 C6/8 F6/8 E6/4',
  'R',
  'R',
  // 121-124: lead again, then the second guitar answers
  'E6/16 D6/16 C6/16 G5/16 E5/16 G5/16 C6/16 E6/16 D6/8 C6/8 G5/4',
  'F#6/16 E6/16 D6/16 A5/16 F#5/16 A5/16 D6/16 F#6/16 E6/8 D6/8 A5/4',
  'R',
  'R',
  // 125-132: wild pentatonic and harmonic-minor runs
  'E5/16t G5/16t A5/16t B5/16t D6/16t B5/16t A5/16t G5/16t E5/16t G5/16t A5/16t B5/16t D6/16t E6/16t D6/16t B5/16t A5/16t G5/16t E5/16t D5/16t E5/16t G5/16t A5/16t B5/16t',
  'C6/32 B5/32 G5/32 E5/32 G5/32 B5/32 C6/32 E6/32 D6/32 C6/32 B5/32 G5/32 E5/32 G5/32 B5/32 D6/32 C6/8 E6/8 G6/4',
  'G5/16 B5/16 D6/16 G6/16 F#6/16 D6/16 B5/16 G5/16 A5/16 B5/16 D6/16 G6/16 F#6/16 D6/16 B5/16 G5/16',
  'D5/16 F#5/16 A5/16 D6/16 F#6/16 A6/16 F#6/16 D6/16 A5/16 F#5/16 D5/16 A4/16 D5/16 F#5/16 A5/16 D6/16',
  'E5/16 F#5/16 G5/16 A5/16 B5/16 C6/16 D#6/16 E6/16 D#6/16 B5/16 A5/16 G5/16 F#5/16 E5/16 B4/16 E5/16',
  'C6/8 B5/8 A5/8 G5/8 E5/8 G5/8 A5/8 B5/8',
  'B5/16 D#6/16 F#6/16 B6/16 A#6/16 F#6/16 D#6/16 B5/16 F#5/16 A#5/16 B5/16 D#6/16 F#6/16 B6/16 D#6/16 F#5/16',
  'B6/8^ D#6/8^ B5/4 F#5/4 D#5/4',
  // 133-140: tapping and trill passage
  'E5/16 B5/16 E6/16 B5/16 E5/16 B5/16 E6/16 B5/16 E5/16 B5/16 E6/16 B5/16 E5/16 B5/16 E6/16 B5/16',
  'F5/16 C6/16 F6/16 C6/16 F5/16 C6/16 F6/16 C6/16 F5/16 C6/16 F6/16 C6/16 F5/16 C6/16 F6/16 C6/16',
  'B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t B5/16t A5/16t',
  'F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t F5/16t E5/16t',
  'C5/16 G5/16 C6/16 G5/16 C5/16 G5/16 C6/16 G5/16 C5/16 G5/16 C6/16 G5/16 C5/16 G5/16 C6/16 G5/16',
  'D5/16 A5/16 D6/16 A5/16 D5/16 A5/16 D6/16 A5/16 D5/16 A5/16 D6/16 A5/16 D5/16 A5/16 D6/16 A5/16',
  'B4/16 F#5/16 B5/16 F#5/16 B4/16 F#5/16 B5/16 F#5/16 B4/16 F#5/16 B5/16 F#5/16 B4/16 F#5/16 B5/16 F#5/16',
  'B5/8^ D#6/8^ F#6/4 B6/2',
  // 141-148: the climax, closing on the held, bent E6
  'E6/8 D6/8 B5/8 G5/8 E5/8 G5/8 B5/8 D6/8',
  'E6/16 D6/16 B5/16 G5/16 E5/16 G5/16 B5/16 D6/16 E6/8 G6/8 B6/4',
  'C6/8 G5/8 E5/8 G5/8 C6/8 E6/8 G6/8 E6/8',
  'D6/8 A5/8 F#5/8 A5/8 D6/8 F#6/8 A6/8 F#6/8',
  'E6/16 B5/16 G5/16 B5/16 E6/16 G6/16 B6/16 G6/16 E6/8 D6/8 B5/4',
  'C6/8 E6/8 G6/8 E6/8 C6/4 G5/4',
  'E5/8 F#5/8 G5/8 A5/8 B5/4^ E6/4~',
  'E6/1',
];
// The second guitar's answers, lined up with bars 119-120 and 123-124 of the solo.
const SOLO_ANSWERS = {
  18: 'B5/8 G5/8 E5/8 G5/8 B5/8 D6/8 B5/4',
  19: 'A5/8 F5/8 C5/8 F5/8 A5/8 C6/8 A5/4',
  22: 'B5/8 D#6/8 F#6/8 B6/8 A#6/8 F#6/8 D#6/4',
  23: 'F#6/8^ B6/4. B6/8 A#6/8 F#6/4',
};

// ---------------------------------------------------------------------------------------------
const keys = ['clean', 'lead', 'harmony', 'cello', 'piano', 'strings', 'chugs', 'wall', 'bass', 'drums', 'cymbals'];
const builder = sectionBuilder(keys, { label: (name, start, end) => `${name} (bars ${start}-${end})` });
const { tracks, block } = builder;
const form = builder.sections;

function section(name, n, time, parts) {
  const [num, den] = time.split('/').map(Number);
  builder.section(name, n, parts, { barTicks: (num * 3840) / den });
}

const theme = (bars, v, off) => bars.map((bar, i) => humanize(bar, { vel: v + (i >= 8 ? 3 : 0), off, pattern: [3, -3, 2, -4, 4, -2, 1, -5] }));
const harmony = (bars, v) => bars.map((bar) => humanize(bar, { vel: v, off: 6, pattern: [2, -2, 1, -3, 2, -1, 0, -2] }));
const celloLine = (bars, v) => bars.map((bar) => humanize(bar, { vel: v, off: 10, pattern: [3, -2, 1, -4, 2, -3, 0, -1] }));

// 1. Clean intro, 70 BPM: the arpeggio, the cello theme, then strings and piano.
section('Clean intro: the arpeggio and the cello', 12, '4/4', {
  clean: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
    const chords = ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B'];
    return cleanBar(chords[i], 52 + Math.min(i, 8), i);
  }),
  cello: celloLine([...CELLO_A, ...CELLO_INTRO_END], 68),
  strings: [R, R, R, R, 'Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B'].map((c, i) =>
    c === R ? R : hold(c, '4/4', 38 + i, 'pad'),
  ),
  piano: [R, R, R, R, R, R, R, R, 'Em', 'C', 'D', 'B'].map((c, i) =>
    c === R ? R : pianoBar(c, '4/4', 38 + i, 'half'),
  ),
});

// 2. Ballad verse, still 70 BPM: the theme on the lead guitar, piano and strings under it.
section('Ballad verse: the theme on the lead guitar', 16, '4/4', {
  lead: theme([...THEME_A, ...THEME_B], 76, 10),
  cello: celloLine(
    ['E3/1', 'C3/1', 'G2/1', 'D3/1', 'E3/1', 'C3/1', 'D3/1', 'B2/1', 'E3/1', 'C3/1', 'G2/1', 'D3/1', 'A2/1', 'B2/1', 'E3/1', 'E3/1'],
    54,
  ),
  piano: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Am', 'B', 'Em', 'Em'].map((c, i) =>
    pianoBar(c, '4/4', 44 + Math.min(i, 8), i >= 8 ? 'quarter' : 'half'),
  ),
  strings: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Am', 'B', 'Em', 'Em'].map((c, i) =>
    hold(c, '4/4', 42 + Math.min(i, 8), 'pad'),
  ),
});

// 3. The band kicks in at 152 BPM: Phrygian gallop, chugs, and a short lead riff.
section('The band kicks in: the gallop', 8, '4/4', {
  lead: [
    'r/4 B4/8 B4/8 E5/2',
    'C5/4 A4/4 F4/2',
    'E5/4 G5/4 F#5/4 E5/4',
    'C5/2. A4/4',
    'B4/4 E5/4 G5/4 B5/4',
    'C5/4 A4/4 F4/4 C5/4',
    'B5/2 F#5/4 D#5/4',
    'B5/1',
  ].map((bar, i) => humanize(bar, { vel: 96 + i * 2, off: 8, pattern: [4, -4, 2, -5, 3, -3, 1, -2] })),
  chugs: ['Em', 'F', 'Em', 'F', 'Em', 'F', 'B', 'B'].map((c, i) => chugBar(c, '4/4', 88 + i * 2, 'eighth')),
  wall: [R, R, R, R, 'Em', 'F', 'B', 'B'].map((c, i) => (c === R ? R : hold(c, '4/4', 72 + i, 'wall'))),
  bass: ['Em', 'F', 'Em', 'F', 'Em', 'F', 'B', 'B'].map((c, i) => gallopBass(c, '4/4', 94 + i * 2)),
  drums: [D4.verseA, D4.verseA, D4.verseB, D4.verseB, D4.chorus, D4.chorus, D4.drive, D4.fillBig],
  cymbals: [cym4(92, { crash: true }), cym4(84), cym4(88), cym4(84), cym4(96, { crash: true }), cym4(88), cym4(92, { ride: true }), cym4(94, { crash: true })],
  strings: ['Em', 'F', 'Em', 'F', 'Em', 'F', 'B', 'B'].map((c, i) => hold(c, '4/4', 42 + i, 'pad')),
});

// 4. Verse at full speed: the theme as the vocal line over the chugs.
section('Verse: the theme at full speed', 16, '4/4', {
  lead: theme([...THEME_A, ...THEME_B], 96, 8),
  chugs: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Em', 'C', 'B', 'B'].map((c, i) => chugBar(c, '4/4', 84 + (i >= 8 ? 4 : 0), i % 4 === 3 ? 'quarter' : 'eighth')),
  bass: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Em', 'C', 'B', 'B'].map((c, i) => gallopBass(c, '4/4', 96 + (i >= 8 ? 2 : 0))),
  drums: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Em', 'C', 'B', 'B'].map((_, i) => (i === 7 || i === 15 ? D4.fill : i % 2 ? D4.verseB : D4.verseA)),
  cymbals: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Em', 'C', 'B', 'B'].map((_, i) => cym4(86 + (i >= 8 ? 4 : 0), { crash: i === 0 || i === 8, ride: i >= 8 })),
  strings: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Em', 'C', 'B', 'B'].map((c, i) => hold(c, '4/4', 42 + (i >= 8 ? 4 : 0), 'pad')),
});

// 5. Chorus: the big singable hook, wall guitars, and the full kit.
section('Chorus: the hook', 16, '4/4', {
  lead: CHORUS.map((bar, i) => humanize(bar, { vel: 108 + (i >= 8 ? 4 : 0), off: 9, pattern: [3, -3, 2, -4, 4, -2, 1, -5] })),
  chugs: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => chugBar(c, '4/4', 94 + (i >= 8 ? 4 : 0), 'quarter')),
  wall: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => hold(c, '4/4', 82 + (i >= 8 ? 4 : 0), 'wall')),
  piano: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => pianoBar(c, '4/4', 58 + (i >= 8 ? 4 : 0), 'quarter')),
  bass: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => gallopBass(c, '4/4', 104 + (i >= 8 ? 3 : 0))),
  drums: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((_, i) => (i === 7 ? D4.fillBig : i === 15 ? D4.fill : D4.chorus)),
  cymbals: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((_, i) => cym4(98 + (i >= 8 ? 2 : 0), { crash: i % 4 === 0, open: i % 2 === 0 })),
  strings: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => hold(c, '4/4', 52 + (i >= 8 ? 4 : 0), 'pad')),
});

// 6. The long instrumental middle: 6/8 twin-guitar harmony in thirds and sixths.
const MIDDLE_CHORDS = ['Em', 'F', 'G', 'F', 'Em', 'F', 'G', 'F', 'Em', 'F', 'G', 'F', 'Em', 'F', 'B', 'B'];
section('Instrumental middle: 6/8 twin guitars', 16, '6/8', {
  lead: [
    'B4/8 E5/8 G5/8 B5/8 A5/8 G5/8',
    'A5/8 G5/8 F5/8 E5/8 C5/8 A4/8',
    'B4/8 D5/8 G5/8 B5/8 A5/8 G5/8',
    'F5/8 E5/8 C5/8 A4/8 F4/8 A4/8',
    'E5/8 G5/8 B5/8 G5/8 E5/8 D5/8',
    'C5/8 A4/8 C5/8 F5/8 E5/8 C5/8',
    'D5/8 G5/8 B5/8 A5/8 G5/8 D5/8',
    'C5/8 A4/8 F4/8 A4/8 C5/8 F5/8',
    'B5/8 A5/8 G5/8 F#5/8 G5/8 B5/8',
    'C6/8 A5/8 F5/8 A5/8 C6/8 A5/8',
    'D6/8 B5/8 G5/8 B5/8 D6/8 B5/8',
    'C6/8 A5/8 F5/8 C5/8 A4/8 F4/8',
    'E5/8 G5/8 B5/8 E6/8 B5/8 G5/8',
    'C6/8 A5/8 F5/8 A5/8 C6/8 F6/8',
    'B5/8 D#6/8 F#6/8 B6/8 F#6/8 D#6/8',
    'B6/2.',
  ].map((bar, i) => humanize(bar, { vel: 96 + (i >= 12 ? 4 : 0), off: i >= 12 ? -6 : 8, pattern: [3, -3, 2, -4, 4, -2] })),
  harmony: [
    'G4/8 B4/8 E5/8 G5/8 F#5/8 E5/8',
    'F5/8 E5/8 C5/8 C5/8 A4/8 F4/8',
    'G4/8 B4/8 D5/8 G5/8 F#5/8 D5/8',
    'C5/8 C5/8 A4/8 F4/8 C4/8 F4/8',
    'G4/8 B4/8 D5/8 B4/8 G4/8 F#4/8',
    'A4/8 F4/8 A4/8 C5/8 A4/8 F4/8',
    'B4/8 D5/8 B4/8 G4/8 B4/8 F#4/8',
    'A4/8 F4/8 C5/8 A4/8 F4/8 C5/8',
    'G5/8 F#5/8 E5/8 D5/8 E5/8 G5/8',
    'A5/8 F5/8 C5/8 F5/8 A5/8 F5/8',
    'B5/8 G5/8 D5/8 G5/8 B5/8 G5/8',
    'A5/8 F5/8 C5/8 A4/8 F4/8 C4/8',
    'G4/8 B4/8 D5/8 G5/8 D5/8 B4/8',
    'A4/8 F4/8 C5/8 F5/8 A5/8 C6/8',
    'D#5/8 F#5/8 B5/8 D#6/8 B5/8 F#5/8',
    'D#6/2.',
  ].map((bar, i) => humanize(bar, { vel: 88 + (i >= 12 ? 4 : 0), off: 2, pattern: [2, -2, 1, -3, 2, -1] })),
  chugs: MIDDLE_CHORDS.map((c, i) => chugBar(c, '6/8', 82 + (i >= 12 ? 4 : 0), i >= 12 ? 'gallop' : 'quarter')),
  wall: MIDDLE_CHORDS.map((c, i) => hold(c, '6/8', 68 + (i >= 12 ? 4 : 0), 'wall')),
  strings: MIDDLE_CHORDS.map((c, i) => hold(c, '6/8', 46 + (i >= 12 ? 4 : 0), 'pad')),
  piano: MIDDLE_CHORDS.map((c, i) => pianoBar(c, '6/8', 54 + (i >= 12 ? 4 : 0), 'half')),
  bass: MIDDLE_CHORDS.map((c, i) => gallopBass(c, '6/8', 94 + (i >= 12 ? 4 : 0))),
  drums: MIDDLE_CHORDS.map((_, i) => (i >= 12 ? (i === 15 ? D6.fill : D6.vary) : i % 2 ? D6.vary : D6.drive)),
  cymbals: MIDDLE_CHORDS.map((_, i) => cym6(88 + (i >= 12 ? 4 : 0), { crash: i === 0 || i === 8 || i === 12, ride: i >= 4 })),
});

// 7. Back to 4/4 at 160 for the buildup into the solo.
const BUILD_CHORDS = ['Em', 'F', 'Em', 'F', 'C', 'D', 'B', 'B', 'Em', 'F', 'Em', 'F', 'C', 'D', 'B', 'B'];
section('Buildup: back to 4/4, then the solo', 16, '4/4', {
  lead: [
    'B4/4 E5/4 G5/4 B5/4',
    'C5/4 A4/4 F4/4 A4/4',
    'B4/4 E5/4 G5/4 B5/4',
    'C5/4 A4/4 C5/4 E5/4',
    'E5/4 G5/4 C6/4 G5/4',
    'F#5/4 A5/4 D6/4 A5/4',
    'F#5/4 D#5/4 B4/4 D#5/4',
    'F#5/4 B5/4 D#6/4 F#6/4',
    'E6/4 B5/4 G5/4 B5/4',
    'C6/4 A5/4 F5/4 A5/4',
    'E6/4 B5/4 G5/4 E5/4',
    'C6/4 A5/4 F5/4 C5/4',
    'G5/4 E5/4 C5/4 E5/4',
    'A5/4 F#5/4 D5/4 F#5/4',
    'B5/4 D#6/4 F#6/4 B6/4',
    'B6/1',
  ].map((bar, i) => humanize(bar, { vel: 100 + Math.min(i * 2, 16), off: 7, pattern: [4, -4, 2, -5, 3, -3, 1, -2] })),
  harmony: [
    R, R, R, R,
    'G4/4 C5/4 E5/4 C5/4',
    'D5/4 F#5/4 A5/4 F#5/4',
    'D#5/4 B4/4 F#4/4 B4/4',
    'D#5/4 F#5/4 B5/4 D#6/4',
    'G5/4 E5/4 B4/4 E5/4',
    'A5/4 F5/4 C5/4 F5/4',
    'G5/4 E5/4 B4/4 G4/4',
    'A5/4 F5/4 C5/4 A4/4',
    'E5/4 C5/4 G4/4 C5/4',
    'F#5/4 D5/4 A4/4 D5/4',
    'D#5/4 F#5/4 B5/4 D#6/4',
    'D#6/1',
  ].map((bar, i) => (bar === R ? R : humanize(bar, { vel: 94 + Math.min((i - 4) * 2, 12), off: 5, pattern: [2, -2, 1, -3, 2, -1, 0, -2] }))),
  chugs: BUILD_CHORDS.map((c, i) => chugBar(c, '4/4', 88 + (i >= 8 ? 4 : 0), i >= 8 ? 'gallop' : 'eighth')),
  wall: BUILD_CHORDS.map((c, i) => (i >= 4 ? hold(c, '4/4', 70 + Math.min(i, 12), 'wall') : R)),
  strings: BUILD_CHORDS.map((c, i) => hold(c, '4/4', 44 + Math.min(i, 12), 'pad')),
  piano: BUILD_CHORDS.map((c, i) => (i >= 8 ? pianoBar(c, '4/4', 56 + Math.min(i, 12), 'quarter') : R)),
  bass: BUILD_CHORDS.map((c, i) => gallopBass(c, '4/4', 96 + Math.min(i, 12))),
  drums: [
    D4.verseA, D4.verseB, D4.verseA, D4.verseB,
    D4.chorus, D4.chorus, D4.drive, D4.drive,
    D4.chorus, D4.chorus, D4.drive, D4.drive,
    D4.chorus, D4.chorus, D4.drive, D4.fillBig,
  ],
  cymbals: [
    cym4(88, { crash: true }), cym4(84), cym4(88), cym4(84),
    cym4(94, { ride: true }), cym4(94, { ride: true }), cym4(96, { ride: true }), cym4(96, { ride: true }),
    cym4(98, { crash: true }), cym4(96, { ride: true }), cym4(98, { ride: true }), cym4(96, { ride: true }),
    cym4(100, { ride: true }), cym4(100, { ride: true }), cym4(102, { ride: true }), cym4(104, { crash: true }),
  ],
});

// 8. The guitar solo, 48 bars at 160 BPM.
const SOLO_CHORDS = [
  'Em', 'Em', 'F', 'F', 'Em', 'Em', 'B', 'B',
  'Em', 'C', 'G', 'D', 'Em', 'C', 'B', 'B',
  'Em', 'F', 'Em', 'F', 'C', 'D', 'B', 'B',
  'Em', 'C', 'G', 'D', 'Em', 'C', 'B', 'B',
  'Em', 'F', 'Em', 'F', 'C', 'D', 'B', 'B',
  'Em', 'Em', 'C', 'D', 'Em', 'C', 'B', 'B',
];
const SOLO_OFFSETS = [
  12, 10, 8, 14, -6, 8, 10, 14,
  -6, -6, -5, -5, -8, -8, -7, 14,
  8, 8, 10, 10, -5, -5, 12, 14,
  -8, -8, -6, -6, -5, 8, -7, 12,
  -6, -6, 2, 2, -6, -6, 10, 12,
  8, -6, -5, -5, 8, 8, 12, 16,
];
const SOLO_LEVELS = [
  104, 98, 100, 106, 102, 98, 104, 110,
  106, 106, 108, 108, 110, 110, 112, 114,
  108, 108, 110, 110, 112, 112, 114, 116,
  110, 110, 112, 112, 114, 110, 116, 118,
  112, 112, 114, 114, 116, 116, 118, 120,
  114, 116, 116, 118, 118, 120, 122, 124,
];
const soloLead = SOLO.map((bar, i) => {
  if (bar === 'R') return R;
  return humanize(bar, { vel: SOLO_LEVELS[i], off: SOLO_OFFSETS[i], pattern: [4, -4, 3, -5, 2, -3, 1, -2] });
});
// Bar 148 continues the tied bend from bar 147, so it must stay unshifted.
soloLead[47] = 'E6/1';
const soloHarmony = SOLO.map((_, i) => {
  const answer = SOLO_ANSWERS[i];
  return answer ? humanize(answer, { vel: 100 + (i >= 32 ? 4 : 0), off: 7, pattern: [3, -3, 2, -4, 1, -2] }) : R;
});
section('Guitar solo: 48 bars', 48, '4/4', {
  lead: soloLead,
  harmony: soloHarmony,
  chugs: SOLO_CHORDS.map((c, i) => chugBar(c, '4/4', 90 + (i >= 32 ? 4 : 0), i >= 32 ? 'gallop' : 'eighth')),
  wall: SOLO_CHORDS.map((c, i) => (i >= 36 ? hold(c, '4/4', 76 + (i >= 40 ? 4 : 0), 'wall') : R)),
  strings: SOLO_CHORDS.map((c, i) => hold(c, '4/4', 42 + (i >= 32 ? 4 : 0), 'pad')),
  bass: SOLO_CHORDS.map((c, i) => gallopBass(c, '4/4', 98 + (i >= 32 ? 3 : 0))),
  drums: SOLO_CHORDS.map((_, i) => {
    if (i === 15 || i === 31 || i === 39) return D4.fill;
    if (i === 47) return D4.fillBig;
    return i >= 32 ? D4.drive : i % 2 ? D4.verseB : D4.verseA;
  }),
  cymbals: SOLO_CHORDS.map((_, i) => cym4(94 + (i >= 32 ? 4 : 0), { crash: i === 0 || i === 16 || i === 32 || i === 40, ride: i >= 16 })),
});

// 9. The theme returns as a twin-guitar harmony.
section('The theme returns: twin guitars', 16, '4/4', {
  lead: theme([...THEME_A, ...THEME_B], 112, 9),
  harmony: harmony(THEME_HARMONY, 104),
  chugs: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Am', 'B', 'Em', 'Em'].map((c, i) => chugBar(c, '4/4', 94 + (i >= 8 ? 4 : 0), 'eighth')),
  wall: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Am', 'B', 'Em', 'Em'].map((c, i) => hold(c, '4/4', 82 + (i >= 8 ? 4 : 0), 'wall')),
  strings: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Am', 'B', 'Em', 'Em'].map((c, i) => hold(c, '4/4', 52 + (i >= 8 ? 4 : 0), 'pad')),
  bass: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Am', 'B', 'Em', 'Em'].map((c, i) => gallopBass(c, '4/4', 104 + (i >= 8 ? 3 : 0))),
  drums: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Am', 'B', 'Em', 'Em'].map((_, i) => (i === 15 ? D4.fillBig : D4.chorus)),
  cymbals: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B', 'Em', 'C', 'G', 'D', 'Am', 'B', 'Em', 'Em'].map((_, i) => cym4(100 + (i >= 8 ? 2 : 0), { crash: i % 8 === 0, open: true })),
});

// 10. Final chorus: both guitars, the wall, and the full kit.
section('Final chorus: both guitars', 16, '4/4', {
  lead: CHORUS.map((bar, i) => humanize(bar, { vel: 116 + (i >= 8 ? 4 : 0), off: 8, pattern: [3, -3, 2, -4, 4, -2, 1, -5] })),
  harmony: CHORUS_HARMONY.map((bar, i) => humanize(bar, { vel: 106 + (i >= 8 ? 4 : 0), off: 4, pattern: [2, -2, 1, -3, 2, -1, 0, -2] })),
  chugs: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => chugBar(c, '4/4', 98 + (i >= 8 ? 4 : 0), 'quarter')),
  wall: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => hold(c, '4/4', 88 + (i >= 8 ? 4 : 0), 'wall')),
  piano: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => pianoBar(c, '4/4', 62 + (i >= 8 ? 4 : 0), 'quarter')),
  bass: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => gallopBass(c, '4/4', 108 + (i >= 8 ? 3 : 0))),
  drums: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((_, i) => (i === 7 ? D4.fillBig : i === 15 ? D4.fillBig : D4.chorus)),
  cymbals: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((_, i) => cym4(104 + (i >= 8 ? 2 : 0), { crash: i % 4 === 0, open: true })),
  strings: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B', 'C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'].map((c, i) => hold(c, '4/4', 56 + (i >= 8 ? 4 : 0), 'pad')),
});

// 11. Outro: the band leaves, the clean figure and the cello return, and the last chord rings.
section('Outro: the clean figure returns', 4, '4/4', {
  clean: ['Em', 'C', 'D', 'B'].map((c, i) => cleanBar(c, 56 - i * 4, i)),
  cello: celloLine(['E3/1', 'C3/1', 'A2/1', 'B2/1'], 60),
  piano: ['Em', 'C', 'D', 'B'].map((c, i) => pianoBar(c, '4/4', 46 - i * 2, 'half')),
  strings: ['Em', 'C', 'D', 'B'].map((c, i) => hold(c, '4/4', 44 - i * 2, 'pad')),
});
section('Outro: the theme one last time', 8, '4/4', {
  clean: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B'].map((c, i) => cleanBar(c, 50 - i * 2, i)),
  cello: celloLine(CELLO_A, 56),
  piano: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B'].map((c, i) => pianoBar(c, '4/4', 42 - i, 'half')),
  strings: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B'].map((c, i) => hold(c, '4/4', 40 - i, 'pad')),
});
section('Outro: the last E minor chord', 2, '4/4', {
  cello: ['E3/1~', 'E3/1'],
  piano: ['[E2 E3 G3 B3]/1~', '[E2 E3 G3 B3]/1'],
  strings: ['[E3 G3 B3]/1~', '[E3 G3 B3]/1'],
  clean: ['R', 'R'],
});

// Mix: the strings were written very soft and sat about 25 dB under the lead, so their velocities
// are scaled up here (and their volume raised below).
tracks.strings = tracks.strings.map((bar) =>
  bar.replace(/:(\d+)/g, (_, v) => `:${Math.min(110, Math.round(Number(v) * 1.6))}`),
);

const total = tracks.lead.length;
if (total !== 194) throw new Error(`expected 194 bars, got ${total}`);

const HEADERS = {
  clean: 'track clean role=arp inst=bank:clean-electric vol=0.8 pan=0.2',
  lead: 'track lead role=lead inst=guitar vol=1 pan=-0.15',
  harmony: 'track harmony role=lead2 inst=guitar vol=0.88 pan=0.2',
  cello: 'track cello role=counter inst=cello vol=0.75 pan=-0.25',
  piano: 'track piano role=chords inst=grand-piano vol=0.78 pan=-0.3',
  strings: 'track strings role=pad inst=strings vol=1 pan=0.35',
  chugs: 'track chugs role=chords inst=bank:power-chords vol=0.72 pan=-0.35',
  wall: 'track wall role=pad inst=bank:guitar-wall vol=0.62 pan=0.4',
  bass: 'track bass role=bass inst=bank:pick-bass vol=0.27 pan=0',
  drums: 'track drums role=drums inst=bank:rock-kit vol=0.55 pan=0',
  cymbals: 'track cymbals role=drums inst=bank:rock-kit vol=0.45 pan=-0.1',
};

const chordsComments = [
  '# Chords intro: Em | C | G | D | Em | C | D | B | Em | C | D | B',
  '# Chords ballad: Em | C | G | D | Em | C | D | B | Em | C | G | D | Am | B | Em | Em',
  '# Chords riff: Em | F | Em | F | Em | F | B | B',
  '# Chords verse: Em | C | G | D | Em | C | D | B | Em | C | G | D | Em | C | B | B',
  '# Chords chorus: C | D | Em | Em | C | D | B | B (twice)',
  '# Chords 6/8 middle: Em | F | G | F | Em | F | G | F | Em | F | G | F | Em | F | B | B',
  '# Chords buildup: Em | F | Em | F | C | D | B | B (twice)',
  '# Chords solo: Em Em F F Em Em B B / Em C G D Em C B B / Em F Em F C D B B /',
  '#              Em C G D Em C B B / Em F Em F C D B B / Em Em C D Em C B B',
  '# The snare drags 12-18 ticks, guitar chugs trail the kick by 10-16, and the solo runs sit',
  '# slightly ahead of the beat while its bends lean back. The Phrygian F is a deliberate colour.',
];
const formComments = form.map(({ name, start, end }) => `# Form ${start}-${end}: ${name}`);

const text = [
  '# The Silent Keep, by DeepSeek V4 Flash & SZ. An original cinematic heavy-metal epic in E',
  '# minor: a clean guitar and solo cello state the theme, the band kicks into a Phrygian gallop,',
  '# twin guitars trade thirds and sixths, a 48-bar solo climbs through sixteenth and sextuplet',
  '# runs to a held, bent high E, and the fire dies back to a lone cello. Built by',
  '# tools/arranger/the-silent-keep.mjs from hand-written melodies, riffs, and one harmonic map.',
  ...chordsComments,
  ...formComments,
  'title: The Silent Keep',
  'composer: DeepSeek V4 Flash & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: cinematic',
  'key: E minor',
  'tempo: 70',
  'time: 4/4',
  'about: A six-minute heavy-metal ballad-epic: a clean guitar and cello state the theme, the band kicks into a Phrygian gallop, twin guitars trade harmonies, and a long solo climbs to a bent high E before the fire dies back to a lone cello.',
  '',
  '@bar 29 tempo=152',
  '@bar 69 time=6/8',
  '@bar 85 time=4/4 tempo=160',
  '@bars 181-184 tempo=160..70',
  '',
  Object.keys(tracks)
    .map((id) => `${HEADERS[id]}\n${block(id)}`)
    .join('\n\n'),
  '',
].join('\n');

saveSong(out, 'the-silent-keep.song', text);
console.log(`wrote ${out}/the-silent-keep.song (${total} bars)`);
