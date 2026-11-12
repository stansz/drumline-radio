// Für Elise (Beethoven, WoO 59), arranged for the Synthwave style. The notes follow Beethoven's
// score bar for bar (from the Mutopia Project edition, converted with tools/midi/midi2song.mjs):
// the lead plays the right hand, the bass the left hand's low notes, and the keys its high notes.
// The repeats are played as written. Two bars drop grace notes, and the big arpeggio's top bars drop
// an octave to stay inside the lead's range.
//   node tools/arranger/fur-elise.mjs [outDir]
import {
  MIXED, noteMidi, noteName, outDir, saveSong, transpose, valueAt, writeBlock,
} from './lib.mjs';

const out = outDir();

// Bars by number as converted from the score (0 is the pickup); the fixes below replace a few.
const MEL = {
  0: 'E5/16 Eb5/16',
  1: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  2: 'A4/8 r/16 C4/16 E4/16 A4/16',
  3: 'B4/8 r/16 E4/16 Ab4/16 B4/16',
  4: 'C5/8 r/16 E4/16 E5/16 Eb5/16',
  5: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  6: 'A4/8 r/16 C4/16 E4/16 A4/16',
  7: 'B4/8 r/16 E4/16 C5/16 B4/16',
  9: 'A4/8 r/16 B4/16 C5/16 D5/16',
  10: 'E5/8. G4/16 F5/16 E5/16',
  11: 'D5/8. F4/16 E5/16 D5/16',
  12: 'C5/8. E4/16 D5/16 C5/16',
  13: 'B4/8 r/16 E4/16 E5/16 r/16',
  14: 'r/16 E5/16 E6/16 r/8 Eb5/16',
  15: 'E5/8 r/16 Eb5/16 E5/16 Eb5/16',
  16: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  17: 'A4/8 r/16 C4/16 E4/16 A4/16',
  18: 'B4/8 r/16 E4/16 Ab4/16 B4/16',
  19: 'C5/8 r/16 E4/16 E5/16 Eb5/16',
  20: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  21: 'A4/8 r/16 C4/16 E4/16 A4/16',
  22: 'B4/8 r/16 E4/16 C5/16 B4/16',
  23: 'A4/8 r/16 B4/16 C5/16 D5/16',
  24: 'A4/8 r/16 [E4 C5]/16 [F4 C5]/16 [E4 G4 C5]/32 F4/32t A4/64t',
  25: 'C5/4 F5/16. E5/32',
  26: 'E5/8 D5/8 Bb5/16. A5/32',
  27: 'A5/16 G5/16 F5/16 E5/16 D5/16 C5/16',
  28: 'Bb4/8 A4/16.~ A4/32t Bb4/64t A4/32 G4/32 A4/32 Bb4/32',
  29: 'C5/4 D5/16 Eb5/16',
  30: 'E5/8. E5/16 F5/16 A4/16',
  31: 'C5/4 D5/16. B4/32',
  32: 'C5/32 G5/32 G4/32 G5/32 A4/32 G5/32 B4/32 G5/32 C5/32 G5/32 D5/32 G5/32',
  33: 'E5/32 G5/32 C6/32 B5/32 A5/32 G5/32 F5/32 E5/32 D5/32 G5/32 F5/32 D5/32',
  34: 'C5/32 G5/32 G4/32 G5/32 A4/32 G5/32 B4/32 G5/32 C5/32 G5/32 D5/32 G5/32',
  35: 'E5/32 G5/32 C6/32 B5/32 A5/32 G5/32 F5/32 E5/32 D5/32 G5/32 F5/32 D5/32',
  36: 'E5/32 F5/32 E5/32 Eb5/32 E5/32 B4/32 E5/32 Eb5/32 E5/32 B4/32 E5/32 Eb5/32',
  37: 'E5/8. B4/16 E5/16 Eb5/16',
  38: 'E5/8. B4/16 E5/16 Eb5/16',
  39: 'E5/16 Eb5/16 E5/16 Eb5/16 E5/16 Eb5/16',
  40: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  41: 'A4/8 r/16 C4/16 E4/16 A4/16',
  42: 'B4/8 r/16 E4/16 Ab4/16 B4/16',
  43: 'C5/8 r/16 E4/16 E5/16 Eb5/16',
  44: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  45: 'A4/8 r/16 C4/16 E4/16 A4/16',
  46: 'B4/8 r/16 E4/16 C5/16 B4/16',
  47: 'A4/8 r/16 B4/16 C5/16 D5/16',
  48: 'E5/8. G4/16 F5/16 E5/16',
  49: 'D5/8. F4/16 E5/16 D5/16',
  50: 'C5/8. E4/16 D5/16 C5/16',
  51: 'B4/8 r/16 E4/16 E5/16 r/16',
  52: 'r/16 E5/16 E6/16 r/8 Eb5/16',
  53: 'E5/16 r/8 Eb5/16 E5/16 Eb5/16',
  54: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  55: 'A4/8 r/16 C4/16 E4/16 A4/16',
  56: 'B4/8 r/16 E4/16 Ab4/16 B4/16',
  57: 'C5/8 r/16 E4/16 E5/16 Eb5/16',
  58: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  59: 'A4/8 r/16 C4/16 E4/16 A4/16',
  60: 'B4/8 r/16 E4/16 C5/16 B4/16',
  61: 'A4/8 r/4',
  62: '[E4 G4 Bb4 C#5]/4.',
  63: '[F4 A4 D5]/4 [C#5 E5]/16 [D5 F5]/16',
  64: '[Ab4 D5 F5]/4 [Ab4 D5 F5]/8',
  65: '[A4 C5 E5]/4.',
  66: '[F4 D5]/4 [E4 C5]/16 [D4 B4]/16',
  67: '[C4 F#4 A4]/4 [C4 A4]/8',
  68: '[C4 A4]/8 [E4 C5]/8 [D4 B4]/8',
  69: '[C4 A4]/4.',
  70: '[E4 G4 Bb4 C#5]/4.',
  71: '[F4 A4 D5]/4 [C#5 E5]/16 [D5 F5]/16',
  72: '[D5 F5]/4 [D5 F5]/8',
  73: '[D5 F5]/4.',
  74: '[G4 Eb5]/4 [F4 D5]/16 [Eb4 C5]/16',
  75: '[D4 F4 Bb4]/4 [D4 F4 A4]/8',
  76: '[D4 F4 Ab4]/4 [D4 F4 Ab4]/8',
  77: '[C4 E4 A4]/4 r/8',
  78: '[E4 B4]/8 r/4',
  79: 'A3/16t C4/16t E4/16t A4/16t C5/16t E5/16t D5/16t C5/16t B4/16t',
  80: 'A4/16t C5/16t E5/16t A5/16t C6/16t E6/16t D6/16t C6/16t B5/16t',
  81: 'A5/16t C6/16t E6/16t A6/16t C7/16t E7/16t D7/16t C7/16t B6/16t',
  82: 'Bb6/16t A6/16t Ab6/16t G6/16t F#6/16t F6/16t E6/16t Eb6/16t D6/16t',
  83: 'C#6/16t C6/16t B5/16t Bb5/16t A5/16t Ab5/16t G5/16t F#5/16t F5/16t',
  84: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  85: 'A4/8 r/16 C4/16 E4/16 A4/16',
  86: 'B4/8 r/16 E4/16 Ab4/16 B4/16',
  87: 'C5/8 r/16 E4/16 E5/16 Eb5/16',
  88: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  89: 'A4/8 r/16 C4/16 E4/16 A4/16',
  90: 'B4/8 r/16 E4/16 C5/16 B4/16',
  91: 'A4/8 r/16 B4/16 C5/16 D5/16',
  92: 'E5/8. G4/16 F5/16 E5/16',
  93: 'D5/8. F4/16 E5/16 D5/16',
  94: 'C5/8. E4/16 D5/16 C5/16',
  95: 'B4/8 r/16 E4/16 E5/16 r/16',
  96: 'r/16 E5/16 E6/16 r/8 Eb5/16',
  97: 'E5/16 r/8 Eb5/16 E5/16 Eb5/16',
  98: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  99: 'A4/8 r/16 C4/16 E4/16 A4/16',
  100: 'B4/8 r/16 E4/16 Ab4/16 B4/16',
  101: 'C5/8 r/16 E4/16 E5/16 Eb5/16',
  102: 'E5/16 Eb5/16 E5/16 B4/16 D5/16 C5/16',
  103: 'A4/8 r/16 C4/16 E4/16 A4/16',
  104: 'B4/8 r/16 E4/16 C5/16 B4/16',
  105: 'A4/8 r/4',
};
const LH = {
  0: 'R',
  1: 'R',
  2: 'A2/16 E3/16 A3/16 r/8.',
  3: 'E2/16 E3/16 Ab3/16 r/8.',
  4: 'A2/16 E3/16 A3/16 r/8.',
  5: 'R',
  6: 'A2/16 E3/16 A3/16 r/8.',
  7: 'E2/16 E3/16 Ab3/16 r/8.',
  9: 'A2/16 E3/16 A3/16 r/8.',
  10: 'C3/16 G3/16 C4/16 r/8.',
  11: 'G2/16 G3/16 B3/16 r/8.',
  12: 'A2/16 E3/16 A3/16 r/8.',
  13: 'E2/16 E3/16 E4/16 r/8 E4/16',
  14: 'E5/16 r/8 Eb5/16 E5/16 r/16',
  15: 'r/16 Eb5/16 E5/16 r/8.',
  16: 'R',
  17: 'A2/16 E3/16 A3/16 r/8.',
  18: 'E2/16 E3/16 Ab3/16 r/8.',
  19: 'A2/16 E3/16 A3/16 r/8.',
  20: 'R',
  21: 'A2/16 E3/16 A3/16 r/8.',
  22: 'E2/16 E3/16 Ab3/16 r/8.',
  23: 'A2/16 E3/16 A3/16 r/8.',
  24: 'A2/16 E3/16 A3/16 [Bb3 C4]/16 [A3 C4]/16 [G3 Bb3 C4]/16',
  25: 'F3/16 A3/16 C4/16 A3/16 C4/16 A3/16',
  26: 'F3/16 Bb3/16 D4/16 Bb3/16 D4/16 Bb3/16',
  27: 'F3/16 E4/16 [F3 G3 Bb3]/16 E4/16 [F3 G3 Bb3]/16 E4/16',
  28: 'F3/16 A3/16 C4/16 A3/16 C4/16 A3/16',
  29: 'F3/16 A3/16 C4/16 A3/16 C4/16 A3/16',
  30: 'E3/16 A3/16 C4/16 A3/16 [D3 D4]/16 F3/16',
  31: 'G3/16 E4/16 G3/16 E4/16 G3/16 F4/16',
  32: '[C4 E4]/8 r/16 [F4 G4]/16 [E4 G4]/16 [D4 F4 G4]/16',
  33: '[C4 E4 G4]/8 [F3 A3]/8 [G3 B3]/8',
  34: 'C4/8 r/16 [F4 G4]/16 [E4 G4]/16 [D4 F4 G4]/16',
  35: '[C4 E4 G4]/8 [F3 A3]/8 [G3 B3]/8',
  36: '[Ab3 B3]/8 r/4',
  37: 'R',
  38: 'R',
  39: 'R',
  40: 'R',
  41: 'A2/16 E3/16 A3/16 r/8.',
  42: 'E2/16 E3/16 Ab3/16 r/8.',
  43: 'A2/16 E3/16 A3/16 r/8.',
  44: 'R',
  45: 'A2/16 E3/16 A3/16 r/8.',
  46: 'E2/16 E3/16 Ab3/16 r/8.',
  47: 'A2/16 E3/16 A3/16 r/8.',
  48: 'C3/16 G3/16 C4/16 r/8.',
  49: 'G2/16 G3/16 B3/16 r/8.',
  50: 'A2/16 E3/16 A3/16 r/8.',
  51: 'E2/16 E3/16 E4/16 r/8 E4/16',
  52: 'E5/16 r/8 Eb5/16 E5/16 r/16',
  53: 'r/16 Eb5/16 E5/16 r/8.',
  54: 'R',
  55: 'A2/16 E3/16 A3/16 r/8.',
  56: 'E2/16 E3/16 Ab3/16 r/8.',
  57: 'A2/16 E3/16 A3/16 r/8.',
  58: 'R',
  59: 'A2/16 E3/16 A3/16 r/8.',
  60: 'E2/16 E3/16 Ab3/16 r/8.',
  61: 'A2/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  62: 'A2/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  63: 'A2/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  64: 'A2/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  65: 'A2/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  66: '[D2 A2]/16 [D2 A2]/16 [D2 A2]/16 [D2 A2]/16 [D2 A2]/16 [D2 A2]/16',
  67: '[Eb2 A2]/16 [Eb2 A2]/16 [Eb2 A2]/16 [Eb2 A2]/16 [Eb2 A2]/16 [Eb2 A2]/16',
  68: '[E2 A2]/16 [E2 A2]/16 [E2 A2]/16 [E2 A2]/16 [E2 Ab2]/16 [E2 Ab2]/16',
  69: '[A1 A2]/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  70: 'A2/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  71: 'A2/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  72: 'A2/16 A2/16 A2/16 A2/16 A2/16 A2/16',
  73: 'Bb2/16 Bb2/16 Bb2/16 Bb2/16 Bb2/16 Bb2/16',
  74: 'Bb2/16 Bb2/16 Bb2/16 Bb2/16 Bb2/16 Bb2/16',
  75: 'Bb2/16 Bb2/16 Bb2/16 Bb2/16 Bb2/16 Bb2/16',
  76: 'B2/16 B2/16 B2/16 B2/16 B2/16 B2/16',
  77: 'C3/4 r/8',
  78: '[E3 Ab3]/8 r/4',
  79: 'A1/8 r/8 [A3 C4 E4]/8',
  80: '[A3 C4 E4]/8 r/8 [A3 C4 E4]/8',
  81: '[A3 C4 E4]/8 r/8 [A3 C4 E4]/8',
  82: '[A3 C4 E4]/8 r/4',
  83: 'R',
  84: 'R',
  85: 'A2/16 E3/16 A3/16 r/8.',
  86: 'E2/16 E3/16 Ab3/16 r/8.',
  87: 'A2/16 E3/16 A3/16 r/8.',
  88: 'R',
  89: 'A2/16 E3/16 A3/16 r/8.',
  90: 'E2/16 E3/16 Ab3/16 r/8.',
  91: 'A2/16 E3/16 A3/16 r/8.',
  92: 'C3/16 G3/16 C4/16 r/8.',
  93: 'G2/16 G3/16 B3/16 r/8.',
  94: 'A2/16 E3/16 A3/16 r/8.',
  95: 'E2/16 E3/16 E4/16 r/8 E4/16',
  96: 'E5/16 r/8 Eb5/16 E5/16 r/16',
  97: 'r/16 Eb5/16 E5/16 r/8.',
  98: 'R',
  99: 'A2/16 E3/16 A3/16 r/8.',
  100: 'E2/16 E3/16 Ab3/16 r/8.',
  101: 'A2/16 E3/16 A3/16 r/8.',
  102: 'R',
  103: 'A2/16 E3/16 A3/16 r/8.',
  104: 'E2/16 E3/16 Ab3/16 r/8.',
  105: '[A1 A2]/8 r/4',
};

const nm = (n) => noteName(n, MIXED);

// The first ending: the closing A with the pickup that starts the repeat.
MEL[8] = 'A4/4 E5/16 Eb5/16';
LH[8] = 'A2/16 E3/16 A3/16 r/8.';
// Grace notes left out.
MEL[24] = 'A4/8 r/16 [E4 C5]/16 [F4 C5]/16 [E4 G4 C5]/16';
MEL[28] = 'Bb4/8 A4/8 A4/32 G4/32 A4/32 Bb4/32';
// The arpeggio's top: an octave down from here on, so it stays at or under C7.
for (const n of [81, 82, 83]) MEL[n] = transpose(MEL[n], -12, nm);

// The order bars are played in, repeats unfolded.
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const ORDER = [
  ...range(1, 8), ...range(1, 7), 9, // A twice (the first ending, then the second)
  ...range(10, 23), ...range(10, 22), 24, // B twice
  ...range(25, 61), // C: the F-major episode, the run, and the theme
  ...range(62, 105), // D: the A pedal, the arpeggio, and the theme to the end
];
const SECTIONS = new Map([[0, 'The theme, twice'], [16, 'The second part, twice'], [44, 'The F-major episode'],
  [81, 'The pedal and the arpeggio'], [103, 'The theme, to the end']]);
// Velocity by position in ORDER: [first index, velocity].
const DYN = [[0, 88], [16, 94], [44, 100], [56, 106], [62, 94], [81, 110], [99, 116], [103, 90]];

// The left hand split by register: low notes to the bass, high notes to the keys.
function splitLh(bar) {
  if (bar === 'R') return ['R', 'R'];
  const low = []; const high = [];
  for (const tok of bar.match(/\[[^\]]+\]\S*|\S+/g)) {
    const m = /^(\[[^\]]+\]|[A-G](?:#|b)?\d|r)(\/[\dt.]+)(~?)$/.exec(tok);
    if (!m) throw new Error(`bad token ${tok}`);
    const [, pitch, dur, tie] = m;
    if (pitch === 'r') { low.push(`r${dur}`); high.push(`r${dur}`); continue; }
    const ps = pitch.replace(/[[\]]/g, '').split(' ');
    const lo = ps.filter((p) => noteMidi(p) <= 60);
    const hi = ps.filter((p) => noteMidi(p) > 60);
    const fmt = (list) => (list.length === 0 ? `r${dur}` : `${list.length > 1 ? `[${list.join(' ')}]` : list[0]}${dur}${tie}`);
    low.push(fmt(lo)); high.push(fmt(hi));
  }
  const tidy = (list) => (list.every((t) => t.startsWith('r')) ? 'R' : list.join(' '));
  return [tidy(low), tidy(high)];
}

const tracks = { melody: [], bass: [], keys: [] };
let prevVel = { melody: null, bass: null, keys: null };
const push = (key, bar, i) => {
  const vel = valueAt(DYN, i);
  const text = bar !== 'R' && prevVel[key] !== vel ? `v=${key === 'melody' ? vel : vel - 10} ${bar}` : bar;
  if (bar !== 'R') prevVel[key] = vel;
  tracks[key].push(text);
};
ORDER.forEach((n, i) => {
  push('melody', MEL[n], i);
  const [low, high] = splitLh(LH[n]);
  push('bass', low, i);
  push('keys', high, i);
});

const block = (key, pickup) => writeBlock(tracks[key], SECTIONS, { perRow: 6, first: pickup });
const total = ORDER.length;

const text = `# Für Elise by Ludwig van Beethoven, arranged by Claude and SZ for the Synthwave style. Beethoven's
# notes bar for bar with the repeats as written: lead on the right hand, bass and keys on the left.
title: Für Elise
composer: Ludwig van Beethoven
arranger: Claude & SZ
about: A short piano piece Beethoven wrote around 1810. It was only published in 1867, forty years after he died, and nobody knows for sure who Elise was. One theory is that the title was misread and was meant for his friend Therese.
year: 1810
source: public-domain
category: classics
key: A minor
style: synthwave
tempo: 66
time: 3/8
pickup: /8

@bars ${total - 2}-${total} tempo=66..50

track melody role=lead vol=0.95
${block('melody', `v=88 ${MEL[0]}`)}

track keys role=chords vol=0.65 pan=0.2
${block('keys', 'r/8')}

track bass role=bass vol=0.8
${block('bass', 'r/8')}
`;
saveSong(out, 'fur-elise.song', text);
console.log(`wrote ${out}/fur-elise.song (${total} bars and a pickup)`);
