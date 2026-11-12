// Ivory and Ash: a cinematic prog-rock piece for the Cinematic style, built section by section.
// The piano and the guitar trade phrases, so the melodies are written out by hand here; this script
// fills in the accompaniment (piano arpeggios, strings, bass, drums) from each section's chords.
//   node tools/arranger/ivory-and-ash.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6] };
const nm = (n) => `${SHARP[n % 12]}${Math.floor(n / 12) - 1}`;
const DUR = { 3840: '/1', 2880: '/2.', 1920: '/2', 1440: '/4.', 960: '/4', 480: '/8', 240: '/16' };

// 'Cm', 'Abmaj7', 'G7', 'Ddim', 'Cm/Bb' -> { pc, iv, bass }
function chord(sym) {
  const [main, slash] = sym.split('/');
  const m = /^([A-G](?:#|b)?)(maj7|m|7|dim)?$/.exec(main);
  if (!m) throw new Error(`bad chord ${sym}`);
  const pc = PC[m[1]];
  return { pc, iv: QUALITY[m[2] ?? ''], bass: slash ? PC[slash] : pc };
}
// One bar of chords ('Ddim G7') -> [{ c, ticks }]
const spans = (bar) => bar.split(' ').map((s) => ({ c: chord(s), ticks: 3840 / bar.split(' ').length }));
const each = (bars, fn) => bars.map((bar) => spans(bar).map(({ c, ticks }) => fn(c, ticks)).join(' '));
const fillU = (ticks, unit, fn) => Array.from({ length: ticks / unit }, (_, i) => fn(i, DUR[unit])).join(' ');

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
    return fillU(t, 480, (i, d) => `${nm(seq[i % 8])}${d}${i % 2 ? '+8' : ''}`);
  },
  // piano sweep in sixteenths across two octaves, up and back, off-beats a hair late
  arp16: (c, t) => {
    const b = arpBase(c);
    const up = [0, 7, 12, 12 + c.iv[1], 19, 24, 24 + c.iv[1], 31];
    const seq = [...up, ...up.slice().reverse()].map((i) => b + i);
    return fillU(t, 240, (i, d) => `${nm(seq[i % 16])}${d}${i % 2 ? '+6' : ''}`);
  },
  chord: (c, t) => `[${nm(low(c))} ${triad(c).map(nm).join(' ')}]${DUR[t]}`,
  pad: (c, t) => `[${c.iv.map((i) => nm(48 + c.pc + i - (c.pc >= 8 ? 12 : 0))).join(' ')}]${DUR[t]}`,
  hold: (c, t) => `${nm(bassNote(c))}${DUR[t]}`,
  halves: (c, t) => t === 3840 ? `${nm(bassNote(c))}/2 ${nm(bassNote(c))}/4 ${nm(bassNote(c) + 7)}/4` : `${nm(bassNote(c))}/2`,
  rock: (c, t) => {
    const r = bassNote(c);
    return t === 3840 ? `${nm(r)}/4. ${nm(r)}/8 ${nm(r + 12)}/4 ${nm(r + 7)}/4` : `${nm(r)}/4. ${nm(r)}/8`;
  },
  // analog synth arpeggio, sixteenths, high
  synth16: (c, t) => {
    const tones = [...triad(c, 60), 72 + c.pc];
    return fillU(t, 240, (i, d) => `${nm(tones[[0, 2, 1, 3][i % 4]])}${d}`);
  },
};

// A slow counter-line of chord tones for the solo strings, moving as little as possible.
function counterLine(bars, start = 55) {
  let prev = start;
  return each(bars, (c, t) => {
    const pool = [];
    for (let n = 48; n <= 67; n++) if (c.iv.includes((((n - c.pc) % 12) + 12) % 12)) pool.push(n);
    prev = pool.reduce((best, n) => (Math.abs(n - prev) < Math.abs(best - prev) ? n : best), pool[0]);
    return `${nm(prev)}${DUR[t]}`;
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

const tracks = { guitar: [], piano: [], keys: [], cello: [], strings: [], synth: [], arp: [], bass: [], drums: [], cym: [] };
const marks = [];
const R = 'R';
// Adds a section: each part is a list of bars (or null for rests).
function section(name, n, parts) {
  marks.push([tracks.guitar.length, name]);
  for (const key of Object.keys(tracks)) {
    const bars = parts[key];
    for (let b = 0; b < n; b++) tracks[key].push(bars?.[b] ?? R);
  }
}
const v = (vel, bars) => bars.map((bar, i) => (bar === null || bar === R ? R : i === 0 || (bars[i - 1] ?? R) === R ? `v=${vel} ${bar}` : bar));
const rep = (bar, n) => Array(n).fill(bar);
const pick = (list, idx) => list.map((bar, i) => (idx.includes(i) ? bar : null));

section('Intro: piano alone, strings join', 8, {
  piano: v(64, PIANO_THEME),
  keys: v(48, each(THEME, T.lh)),
  strings: [null, null, null, null, ...v(44, each(THEME.slice(4), T.pad))],
});

section('The guitar answers', 8, {
  piano: v(70, pick(PIANO_THEME, [0, 1, 4, 5])),
  guitar: v(84, lay(THEME.map((_, i) => GUITAR_ANSWER[i] ?? null), GUITAR_LAG)),
  keys: v(52, each(THEME, T.lh)),
  strings: v(52, each(THEME, T.pad)),
  bass: v(62, each(THEME, T.hold)),
});

section('The build', 8, {
  guitar: v(92, lay(GUITAR_BUILD, GUITAR_LAG)),
  keys: v(66, each(BUILD, T.arp8)),
  strings: v(62, each(BUILD, T.pad)),
  synth: v(50, each(BUILD, T.pad)),
  bass: v(78, each(BUILD, T.halves)),
  drums: v(72, [...rep(DRUMS.light, 7), DRUMS.fill]),
});

section('First crescendo', 8, {
  guitar: v(104, lay(GUITAR_RISE, GUITAR_LAG)),
  keys: v(82, each(RISE, T.arp8)),
  cello: v(78, lay(counterLine(RISE), CELLO_LAG)),
  strings: v(84, each(RISE, T.pad)),
  synth: v(66, each(RISE, T.pad)),
  arp: v(58, each(RISE, T.synth16)),
  bass: v(96, each(RISE, T.rock)),
  drums: v(96, [...rep(DRUMS.full, 7), DRUMS.stop]),
  cym: ['v=90 cr/1', null, null, null, 'cr/1', null, null, null],
});

section('Quiet: piano and cello', 4, {
  piano: v(56, PIANO_THEME.slice(0, 4)),
  keys: v(42, each(THEME.slice(0, 4), T.lh)),
  cello: v(58, lay(counterLine(THEME.slice(0, 4), 51), CELLO_LAG)),
  strings: v(36, each(THEME.slice(0, 4), T.pad)),
});

section('Piano and guitar trade', 8, {
  piano: v(80, TRADE_PIANO),
  guitar: v(96, lay(TRADE_GUITAR, GUITAR_LAG)),
  keys: v(58, each(THEME, T.lh)),
  strings: v(60, each(THEME, T.pad)),
  synth: v(52, each(THEME, T.pad)),
  bass: v(84, each(THEME, T.halves)),
  drums: v(82, [...rep(DRUMS.ride, 7), DRUMS.fill]),
  cym: ['v=80 cr/1', null, null, null, null, null, null, null],
});

section('Final crescendo', 8, {
  guitar: v(112, lay(GUITAR_SOLO, GUITAR_LAG)),
  keys: v(90, [...each(RISE.slice(0, 7), T.arp16), each(['Cm'], T.chord)[0]]),
  cello: v(90, lay(counterLine(RISE), CELLO_LAG)),
  strings: v(98, [...each(RISE.slice(0, 7), T.pad), each(['Cm'], T.pad)[0]]),
  synth: v(80, [...each(RISE.slice(0, 7), T.pad), each(['Cm'], T.pad)[0]]),
  arp: v(66, [...each(RISE.slice(0, 7), T.synth16), null]),
  bass: v(104, [...each(RISE.slice(0, 7), T.rock), each(['Cm'], T.hold)[0]]),
  drums: v(106, [...rep(DRUMS.full, 6), DRUMS.fill, DRUMS.hit]),
  cym: ['v=100 cr/1', null, null, null, 'cr/1', null, null, 'cr/1'],
});

section('Piano reprise', 4, {
  piano: v(46, PIANO_THEME.slice(0, 4)),
  keys: v(36, each(THEME.slice(0, 4), T.lh)),
  strings: [...v(32, each(THEME.slice(0, 2), T.pad)), null, null],
});

section('One last note', 2, {
  guitar: v(80, ['C5/1~', 'C5/1']),
  keys: v(40, ['[C3 G3 C4 Eb4 G4]/1', null]),
  strings: v(34, rep('[C4 Eb4 G4]/1', 2)),
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
const block = (key) => {
  const lines = [];
  const at = new Map(marks);
  let row = [];
  const flush = () => { if (row.length) lines.push(`| ${row.join(' | ')} |`); row = []; };
  tracks[key].forEach((bar, i) => {
    if (at.has(i)) { flush(); lines.push(`# ${at.get(i)}`); }
    row.push(bar);
    if (row.length === 4) flush();
  });
  flush();
  return lines.join('\n');
};

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
writeFileSync(join(out, 'ivory-and-ash.song'), text);
console.log(`wrote ${out}/ivory-and-ash.song (${total} bars)`);
