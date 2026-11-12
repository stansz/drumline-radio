// Ivory and Ash: a cinematic prog-rock piece for the Cinematic style, built section by section.
// The piano and the guitar trade phrases, so the melodies are written out by hand here; this script
// fills in the accompaniment (piano arpeggios, strings, bass, drums) from each section's chords.
//   node tools/arranger/ivory-and-ash.mjs [outDir]
import {
  durationText, eachChord, entryVelocity, fillUnits, MIXED, noteName, outDir, repeatBar,
  saveSong, sectionBuilder,
} from './lib.mjs';

const out = outDir();

const nm = (n) => noteName(n, MIXED);

// Micro-timing (ticks, 960 per quarter). Moves each note's start, never its written length.
// The first note of a tie or bend chain owns the offset, so continuations (even across a bar line)
// are left alone. Takes and returns a list of bars; null bars stay null.
function lay(bars, ticks) {
  let held = false;
  return bars.map((bar) => {
    if (bar === null) { held = false; return null; }
    return bar.split(' ').map((tok) => {
      const m = /^([A-G](?:#|b)?\d\/\d+\.?t?)(.*)$/.exec(tok);
      const out = m && !held ? `${m[1]}${ticks >= 0 ? '+' : ''}${ticks}${m[2]}` : tok;
      held = /[~^]$/.test(tok);
      return out;
    }).join(' ');
  });
}
// The guitar sits behind the beat; the cello leans back a little less.
const GUITAR_LAG = 20;
const CELLO_LAG = 10;

const low = (c) => 36 + c.bass; // a low octave for the bass and the left hand, C2-B2
const bassNote = (c) => (c.bass >= 8 ? 24 + c.bass : 36 + c.bass); // Ab1-G2
const triad = (c, base = 48) => c.iv.slice(0, 3).map((i) => base + c.pc + i);
const arpBase = (c) => (c.pc < 6 ? 48 + c.pc : 36 + c.pc);

// Accompaniment textures, each for one chord span.
const T = {
  // piano left hand: a low octave, then the chord, played a touch after it
  lh: (c, t) => t === 3840
    ? `[${nm(low(c))} ${nm(low(c) + 12)}]/2 [${triad(c).map(nm).join(' ')}]/2+14`
    : `[${nm(low(c))} ${nm(low(c) + 12)}]/4 [${triad(c).map(nm).join(' ')}]/4+14`,
  // piano arpeggio in eighths: 1 5 8 10 12 10 8 5, off-beats a hair late
  arp8: (c, t) => {
    const b = arpBase(c);
    const seq = [0, 7, 12, 12 + c.iv[1], 19, 12 + c.iv[1], 12, 7].map((i) => b + i);
    return fillUnits(t, 480, (i, d) => `${nm(seq[i % 8])}${d}${i % 2 ? '+8' : ''}`);
  },
  // piano sweep in sixteenths across two octaves, up and back, off-beats a hair late
  arp16: (c, t) => {
    const b = arpBase(c);
    const up = [0, 7, 12, 12 + c.iv[1], 19, 24, 24 + c.iv[1], 31];
    const seq = [...up, ...up.slice().reverse()].map((i) => b + i);
    return fillUnits(t, 240, (i, d) => `${nm(seq[i % 16])}${d}${i % 2 ? '+6' : ''}`);
  },
  chord: (c, t) => `[${nm(low(c))} ${triad(c).map(nm).join(' ')}]${durationText(t)}`,
  pad: (c, t) => `[${c.iv.map((i) => nm(48 + c.pc + i - (c.pc >= 8 ? 12 : 0))).join(' ')}]${durationText(t)}`,
  hold: (c, t) => `${nm(bassNote(c))}${durationText(t)}`,
  halves: (c, t) => t === 3840 ? `${nm(bassNote(c))}/2 ${nm(bassNote(c))}/4 ${nm(bassNote(c) + 7)}/4` : `${nm(bassNote(c))}/2`,
  rock: (c, t) => {
    const r = bassNote(c);
    return t === 3840 ? `${nm(r)}/4. ${nm(r)}/8 ${nm(r + 12)}/4 ${nm(r + 7)}/4` : `${nm(r)}/4. ${nm(r)}/8`;
  },
  // analog synth arpeggio, sixteenths, high
  synth16: (c, t) => {
    const tones = [...triad(c, 60), 72 + c.pc];
    return fillUnits(t, 240, (i, d) => `${nm(tones[[0, 2, 1, 3][i % 4]])}${d}`);
  },
};

// A slow counter-line of chord tones for the solo strings, moving as little as possible.
function counterLine(bars, start = 55) {
  let prev = start;
  return eachChord(bars, (c, t) => {
    const pool = [];
    for (let n = 48; n <= 67; n++) if (c.iv.includes((((n - c.pc) % 12) + 12) % 12)) pool.push(n);
    prev = pool.reduce((best, n) => (Math.abs(n - prev) < Math.abs(best - prev) ? n : best), pool[0]);
    return `${nm(prev)}${durationText(t)}`;
  });
}

// The backbeat drags behind the kick, and the off-beat hats are softer.
const DRUMS = {
  light: '[k h]/8 h/8:70 h/8 h/8:70 [rim h]/8+12 h/8:70 h/8 h/8:70',
  full: '[k h]/8 h/8:70 h/8 [k h]/8 [s h]/8+16 h/8:70 h/8 h/8:70',
  ride: '[k rd]/8 rd/8:72 rd/8 [k rd]/8 [s rd]/8+16 rd/8:72 rd/8 rd/8:72',
  fill: 'k/8 s/8+10 s/8+6 tm/8 tm/16 tm/16+6 tl/16 tl/16+6 tl/8 [k s]/8',
  stop: '[k h]/8 h/8:70 h/8 h/8:70 [s h]/8+16 r/8 r/4',
  hit: '[k s]/2. r/4',
};

// The chord progressions.
const THEME = ['Cm', 'Cm/Bb', 'Abmaj7', 'G7', 'Fm', 'Cm/Eb', 'Ddim G7', 'Cm'];
const BUILD = ['Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Eb', 'Fm', 'G'];
const RISE = ['Fm', 'Bb', 'Eb', 'Ab', 'Ddim', 'G', 'Cm', 'Cm G7'];

// The piano theme, and the guitar's answers.
const PIANO_THEME = [
  'r/4 G4/4 C5/4 Eb5/4', 'D5/2. C5/4', 'C5/4 Bb4/4 Ab4/4 G4/4', 'B4/2 D5/4 F5/4',
  'Ab5/2. G5/8 F5/8', 'Eb5/2 G4/2', 'F5/4 Eb5/4 D5/4 B4/4', 'C5/1',
];
const GUITAR_ANSWER = {
  2: 'r/2 Eb5/8^ F5/4.',
  3: 'F5/8^ G5/8~ G5/4 D5/2',
  6: 'Ab5/4^ Bb5/4^ Ab5/4 G5/4',
  7: 'G5/1',
};
const GUITAR_BUILD = [
  'C5/2. Eb5/4', 'G5/8^ Ab5/8~ Ab5/4 G5/2', 'F5/2. D5/4', 'Eb5/4 D5/4 C5/2',
  'C6/2. Bb5/8 Ab5/8', 'G5/1', 'Ab5/4. G5/8 F5/4 Eb5/4', 'D5/8^ Eb5/8^ D5/2.',
];
const GUITAR_RISE = [
  'Ab5/4 C6/4 Eb6/2', 'D6/2. C6/8 Bb5/8', 'Bb5/2 G5/2', 'C6/8^ Db6/8^ C6/2.',
  'Ab5/4 F5/4 D5/4 Ab5/4', 'G5/8^ A5/8^ B5/2.', 'C6/1', 'r/2 B5/4 D6/4',
];
// The trade: piano on odd bars, the guitar answering on even bars.
const TRADE_PIANO = ['r/8 G4/8 C5/8 Eb5/8 G5/4 F5/4', null, 'r/8 Ab4/8 C5/8 Eb5/8 G5/4 Eb5/4', null,
  'r/8 F4/8 Ab4/8 C5/8 F5/4 Ab5/4', null, 'D5/8 F5/8 Ab5/8 B5/8 D6/4 B5/4', null];
const TRADE_GUITAR = [null, 'G5/8^ Ab5/8^ G5/4 F5/4 Eb5/4', null, 'F5/4^ G5/4 D5/4 B4/4',
  null, 'Bb5/8^ C6/8~ C6/2 G5/4', null, 'C6/2. Bb5/8 G5/8'];
const GUITAR_SOLO = [
  'C6/4^ Db6/4^ C6/4 Ab5/4', 'Bb5/8 C6/8 D6/4^ Eb6/4^ D6/4', 'G6/2. F6/8 Eb6/8', 'Eb6/4^ F6/4^ Eb6/4 C6/4',
  'F6/4. Eb6/8 D6/4 Ab5/4', 'B5/8^ C6/8^ B5/4 D6/4 F6/4', 'Eb6/8^ F6/8^ G6/2.~', 'G6/2. r/4',
];

const keys = ['guitar', 'piano', 'keys', 'cello', 'strings', 'synth', 'arp', 'bass', 'drums', 'cym'];
const { tracks, section, block } = sectionBuilder(keys);
const pick = (list, idx) => list.map((bar, i) => (idx.includes(i) ? bar : null));

section('Intro: piano alone, strings join', 8, {
  piano: entryVelocity(64, PIANO_THEME),
  keys: entryVelocity(48, eachChord(THEME, T.lh)),
  strings: [null, null, null, null, ...entryVelocity(44, eachChord(THEME.slice(4), T.pad))],
});

section('The guitar answers', 8, {
  piano: entryVelocity(70, pick(PIANO_THEME, [0, 1, 4, 5])),
  guitar: entryVelocity(84, lay(THEME.map((_, i) => GUITAR_ANSWER[i] ?? null), GUITAR_LAG)),
  keys: entryVelocity(52, eachChord(THEME, T.lh)),
  strings: entryVelocity(52, eachChord(THEME, T.pad)),
  bass: entryVelocity(62, eachChord(THEME, T.hold)),
});

section('The build', 8, {
  guitar: entryVelocity(92, lay(GUITAR_BUILD, GUITAR_LAG)),
  keys: entryVelocity(66, eachChord(BUILD, T.arp8)),
  strings: entryVelocity(62, eachChord(BUILD, T.pad)),
  synth: entryVelocity(50, eachChord(BUILD, T.pad)),
  bass: entryVelocity(78, eachChord(BUILD, T.halves)),
  drums: entryVelocity(72, [...repeatBar(DRUMS.light, 7), DRUMS.fill]),
});

section('First crescendo', 8, {
  guitar: entryVelocity(104, lay(GUITAR_RISE, GUITAR_LAG)),
  keys: entryVelocity(82, eachChord(RISE, T.arp8)),
  cello: entryVelocity(78, lay(counterLine(RISE), CELLO_LAG)),
  strings: entryVelocity(84, eachChord(RISE, T.pad)),
  synth: entryVelocity(66, eachChord(RISE, T.pad)),
  arp: entryVelocity(58, eachChord(RISE, T.synth16)),
  bass: entryVelocity(96, eachChord(RISE, T.rock)),
  drums: entryVelocity(96, [...repeatBar(DRUMS.full, 7), DRUMS.stop]),
  cym: ['v=90 cr/1', null, null, null, 'cr/1', null, null, null],
});

section('Quiet: piano and cello', 4, {
  piano: entryVelocity(56, PIANO_THEME.slice(0, 4)),
  keys: entryVelocity(42, eachChord(THEME.slice(0, 4), T.lh)),
  cello: entryVelocity(58, lay(counterLine(THEME.slice(0, 4), 51), CELLO_LAG)),
  strings: entryVelocity(36, eachChord(THEME.slice(0, 4), T.pad)),
});

section('Piano and guitar trade', 8, {
  piano: entryVelocity(80, TRADE_PIANO),
  guitar: entryVelocity(96, lay(TRADE_GUITAR, GUITAR_LAG)),
  keys: entryVelocity(58, eachChord(THEME, T.lh)),
  strings: entryVelocity(60, eachChord(THEME, T.pad)),
  synth: entryVelocity(52, eachChord(THEME, T.pad)),
  bass: entryVelocity(84, eachChord(THEME, T.halves)),
  drums: entryVelocity(82, [...repeatBar(DRUMS.ride, 7), DRUMS.fill]),
  cym: ['v=80 cr/1', null, null, null, null, null, null, null],
});

section('Final crescendo', 8, {
  guitar: entryVelocity(112, lay(GUITAR_SOLO, GUITAR_LAG)),
  keys: entryVelocity(90, [...eachChord(RISE.slice(0, 7), T.arp16), eachChord(['Cm'], T.chord)[0]]),
  cello: entryVelocity(90, lay(counterLine(RISE), CELLO_LAG)),
  strings: entryVelocity(98, [...eachChord(RISE.slice(0, 7), T.pad), eachChord(['Cm'], T.pad)[0]]),
  synth: entryVelocity(80, [...eachChord(RISE.slice(0, 7), T.pad), eachChord(['Cm'], T.pad)[0]]),
  arp: entryVelocity(66, [...eachChord(RISE.slice(0, 7), T.synth16), null]),
  bass: entryVelocity(104, [...eachChord(RISE.slice(0, 7), T.rock), eachChord(['Cm'], T.hold)[0]]),
  drums: entryVelocity(106, [...repeatBar(DRUMS.full, 6), DRUMS.fill, DRUMS.hit]),
  cym: ['v=100 cr/1', null, null, null, 'cr/1', null, null, 'cr/1'],
});

section('Piano reprise', 4, {
  piano: entryVelocity(46, PIANO_THEME.slice(0, 4)),
  keys: entryVelocity(36, eachChord(THEME.slice(0, 4), T.lh)),
  strings: [...entryVelocity(32, eachChord(THEME.slice(0, 2), T.pad)), null, null],
});

section('One last note', 2, {
  guitar: entryVelocity(80, ['C5/1~', 'C5/1']),
  keys: entryVelocity(40, ['[C3 G3 C4 Eb4 G4]/1', null]),
  strings: entryVelocity(34, repeatBar('[C4 Eb4 G4]/1', 2)),
});

const total = tracks.guitar.length;
const HEADER = [
  ['guitar', 'track guitar role=lead vol=0.7 pan=0.15'],
  ['piano', 'track piano role=lead2 vol=0.75 pan=-0.15'],
  ['keys', 'track keys role=chords vol=0.55 pan=-0.2'],
  ['cello', 'track cello role=counter vol=0.5 pan=0.3'],
  ['strings', 'track strings role=pad vol=0.5'],
  ['synth', 'track synth role=pad inst=synth-pad vol=0.35 pan=-0.3'],
  ['arp', 'track arp role=arp vol=0.3 pan=0.35'],
  ['bass', 'track bass role=bass vol=0.7'],
  ['drums', 'track drums role=drums vol=0.75'],
  ['cym', 'track cymbals role=drums vol=0.45'],
];
const text = `# Ivory and Ash, by Claude and SZ. A cinematic prog-rock piece: a Romantic piano and a soaring
# blues guitar trade phrases, building through two crescendos to a fragile piano reprise.
title: Ivory and Ash
composer: Claude & SZ
year: 2026
source: original
category: originals
key: C minor
style: cinematic
tempo: 66
time: 4/4

@bars ${total - 5}-${total} tempo=66..52

${HEADER.map(([key, head]) => `${head}\n${block(key)}`).join('\n\n')}
`;
saveSong(out, 'ivory-and-ash.song', text);
console.log(`wrote ${out}/ivory-and-ash.song (${total} bars)`);
