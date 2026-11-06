// Club tracks, built section by section like ivory-and-ash.mjs:
//   underpass.song           an original in the manner of a synth film score (Synthwave)
//   ivory-and-ash-128.song   Ivory and Ash at 128 BPM: the same melodies with every note doubled in
//                            length, so the tune keeps its pace over a four-on-the-floor beat
//   node tools/arranger/club.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const SHARP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6] };
const nm = (n) => `${SHARP[n % 12]}${Math.floor(n / 12) - 1}`;
const midi = (n) => {
  const m = /^([A-G](?:#|b)?)(\d)$/.exec(n);
  return (Number(m[2]) + 1) * 12 + PC[m[1]];
};
const DUR = { 3840: '/1', 2880: '/2.', 1920: '/2', 1440: '/4.', 960: '/4', 720: '/8.', 480: '/8', 240: '/16' };
const BAR = 3840;

// 'Cm', 'Abmaj7', 'G7', 'Ddim', 'Cm/Bb' -> { pc, iv, bass }
function chord(sym) {
  const [main, slash] = sym.split('/');
  const m = /^([A-G](?:#|b)?)(maj7|m|7|dim)?$/.exec(main);
  if (!m) throw new Error(`bad chord ${sym}`);
  const pc = PC[m[1]];
  return { pc, iv: QUALITY[m[2] ?? ''], bass: slash ? PC[slash] : pc };
}
const fillU = (ticks, unit, fn) => Array.from({ length: ticks / unit }, (_, i) => fn(i, DUR[unit])).join(' ');
const bassNote = (c) => (c.bass >= 8 ? 24 + c.bass : 36 + c.bass); // Ab1-G2
const stabChord = (c) => `[${c.iv.slice(0, 3).map((i) => nm(60 + c.pc + i - (c.pc >= 7 ? 12 : 0))).join(' ')}]`;

// Textures, each filling one bar of a single chord.
const T = {
  // offbeat eighths, the intro bass
  off8: (c) => fillU(BAR, 960, () => `r/8 ${nm(bassNote(c))}/8`),
  // the rolling bass: silent on the kick, three sixteenths after it
  roll: (c) => fillU(BAR, 960, () => { const r = nm(bassNote(c)); return `r/16 ${r}/16 ${r}/16 ${r}/16`; }),
  // rolling with an octave pop on the third sixteenth
  rollPop: (c) => fillU(BAR, 960, () => { const r = bassNote(c); return `r/16 ${nm(r)}/16 ${nm(r + 12)}/16 ${nm(r)}/16`; }),
  hold: (c) => `${nm(bassNote(c))}/1`,
  // a syncopated acid riff around the root, an octave above the sub
  riff: (c) => {
    const r = bassNote(c) + 12;
    // the flat seventh drops below the root when it would leave the bass range
    const top = r + 10 > 60 ? -2 : 10;
    const steps = [0, null, 0, c.iv[1], null, 0, 7, null, 0, null, top, null, 0, c.iv[1]];
    return `${steps.map((s) => (s === null ? 'r/16' : `${nm(r + s)}/16`)).join(' ')} r/8`;
  },
  stabs: (c) => { const s = stabChord(c); return `r/8 ${s}/8 r/4 r/8 ${s}/8 r/8 ${s}/8`; },
  pad: (c) => `[${c.iv.map((i) => nm(48 + c.pc + i - (c.pc >= 8 ? 12 : 0))).join(' ')}]/1`,
  arp16: (c) => {
    const tones = [...c.iv.slice(0, 3).map((i) => 60 + c.pc + i), 72 + c.pc];
    return fillU(BAR, 240, (i, d) => `${nm(tones[[0, 2, 1, 3, 2, 1, 3, 0][i % 8]])}${d}`);
  },
  // piano sweep in sixteenths, up and back
  sweep: (c) => {
    const b = 48 + c.pc;
    const up = [0, 7, 12, 12 + c.iv[1], 19, 24, 24 + c.iv[1], 31];
    const seq = [...up, ...up.slice().reverse()].map((i) => b + i);
    return fillU(BAR, 240, (i, d) => `${nm(seq[i % 16])}${d}`);
  },
};
// Bars of chord symbols (one chord per bar here) through a texture.
const each = (chords, fn) => chords.map((sym) => fn(chord(sym)));

const beat = (i, clap) => `[k${clap && i % 2 ? ' cl' : ''} h]/16 h/16 oh/16 h/16`;
const DRUMS = {
  four: 'k/4 k/4 k/4 k/4',
  hats: [0, 1, 2, 3].map((i) => beat(i, false)).join(' '),
  clap: [0, 1, 2, 3].map((i) => beat(i, true)).join(' '),
  end: '[k cr]/4 r/2.',
};
const PERC = {
  tick: 'r/8 h/8 r/8 h/8 r/8 h/8 r/8 h/8',
  groove: 'r/8 rim/16 r/16 r/8 rim/8 r/16 tm/16 r/8 rim/8 r/8',
  // a four-bar snare roll that speeds up into the drop
  roll: ['v=60 s/4 s/4 s/4 s/4', 'v=74 s/8 s/8 s/8 s/8 s/8 s/8 s/8 s/8', `v=88 ${fillU(BAR, 240, () => 's/16')}`,
    `v=104 ${fillU(1920, 240, () => 's/16')} r/2`],
};

const R = 'R';
const rep = (bar, n) => Array(n).fill(bar);
const v = (vel, bars) => bars.map((bar, i) => (bar === null || bar === R ? R : i === 0 || (bars[i - 1] ?? R) === R ? `v=${vel} ${bar}` : bar));
const cyc = (list, n) => Array.from({ length: n }, (_, i) => list[i % list.length]);

// A song is a list of tracks, each filled section by section; parts not named in a section rest.
function songBuilder(keys) {
  const tracks = Object.fromEntries(keys.map((k) => [k, []]));
  const marks = [];
  return {
    tracks,
    section(name, n, parts) {
      marks.push([tracks[keys[0]].length, name]);
      for (const key of keys) {
        const bars = parts[key];
        if (bars && bars.length > n) throw new Error(`${name}: ${key} has ${bars.length} bars, section has ${n}`);
        for (let b = 0; b < n; b++) tracks[key].push(bars?.[b] ?? R);
      }
    },
    block(key) {
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
    },
    get length() { return tracks[keys[0]].length; },
  };
}
const write = (file, head, song, header) => {
  writeFileSync(join(out, file), `${head}\n\n${header.map(([key, line]) => `${line}\n${song.block(key)}`).join('\n\n')}\n`);
  console.log(`wrote ${out}/${file} (${song.length} bars)`);
};

// ---------------------------------------------------------------------------------------------
// Underpass: F minor, 124 BPM, for the Synthwave style, in the manner of a synth film score: an
// octave-pulse bass in sixteenths, a step-sequencer arpeggio, brass-like held chords, an eighth-note
// string ostinato, a heroic lead in long notes, and cinematic hits that switch between half-time and
// four-on-the-floor. The stab hook from the first version comes back in the breakdown.

{
  const LOOP = ['Fm', 'Fm', 'Db', 'Db', 'Ab', 'Ab', 'Eb', 'Eb'];
  const BREAK = ['Db', 'Db', 'Eb', 'Eb', 'Fm', 'Fm', 'Db', 'Eb'];
  const THEME = [
    'F4/2 C5/2', 'Ab5/2. G5/8 F5/8', 'F5/2 Db5/2', 'Ab4/1',
    'Eb5/2 Ab5/2', 'C6/2. Bb5/8 Ab5/8', 'G5/2 Bb5/2', 'G5/1',
  ];
  const HOOK = [
    'C5/8 r/16 C5/16 Ab4/8 F4/8 r/8 Ab4/8 C5/8 Eb5/8', 'C5/8. Bb4/16 Ab4/4 r/2',
    'C5/8 r/16 C5/16 Ab4/8 F4/8 r/8 Ab4/8 Db5/8 F5/8', 'Eb5/8. Db5/16 Bb4/4 G4/4 r/4',
  ];
  // A second voice under the melody: the nearest chord tone at least a minor third below each note.
  const under = (bar, sym) => {
    const c = chord(sym);
    return bar.replace(/\b([A-G](?:#|b)?)(\d)\b/g, (n) => {
      let m = midi(n) - 3;
      while (!c.iv.includes((((m - c.pc) % 12) + 12) % 12)) m -= 1;
      return nm(m);
    });
  };
  const lowRoot = (c) => 24 + ((c.pc - 0 + 12) % 12) + (c.pc < 1 ? 12 : 0); // C#1 .. C2
  const T2 = {
    // the octave pulse: low root, root an octave up, every sixteenth
    pulse: (c) => Array(8).fill(`${nm(lowRoot(c))}/16 ${nm(lowRoot(c) + 12)}/16`).join(' '),
    pulseHalf: (c) => Array(4).fill(`${nm(lowRoot(c))}/8 ${nm(lowRoot(c) + 12)}/8`).join(' '),
    // the step sequencer: chord tones in a fixed 8-step pattern
    seq: (c) => {
      const t = [0, 7, 12, 12 + c.iv[1], 19, 12, 7, 12 + c.iv[1]].map((i) => 53 + ((c.pc - 5 + 12) % 12) + i);
      return [...t, ...t].map((n) => `${nm(n)}/16`).join(' ');
    },
    // the string ostinato: the chord on every eighth, accent on the beat
    ost: (c) => { const s = stabChord(c); return Array(4).fill(`${s}/8 ${s}/8:70`).join(' '); },
    brass: (c) => `[${c.iv.map((i) => nm(48 + c.pc + i - (c.pc >= 8 ? 12 : 0))).join(' ')}]/1`,
  };
  const D2 = {
    hit: '[k cr]/1',
    // micro-timing: the half-time snare drags a little, the off-beat hats lean in a little
    half: 'k/4 h/8 h/8 [s cl]/4+10 h/8 k/8',
    halfFill: 'k/4 h/8 h/8 [s cl]/4+10 tm/16 tm/16 tl/16 tl/16',
    four: 'k/8 h/8-6 [k cl]/8 h/8-6 k/8 h/8-6 [k cl]/8 oh/8-6',
    fourCrash: '[k cr]/8 h/8-6 [k cl]/8 h/8-6 k/8 h/8-6 [k cl]/8 oh/8-6',
    toms: 'th/8 th/8 tm/8 tm/8 tl/8 tl/8 [k s]/8 [k s]/8',
    end: '[k cr]/1',
  };
  const fourBars = (n) => Array.from({ length: n }, (_, i) => (i % 8 === 0 ? D2.fourCrash : i % 8 === 7 ? D2.toms : D2.four));
  const halfBars = (n) => Array.from({ length: n }, (_, i) => (i % 8 === 7 ? D2.halfFill : D2.half));
  const keys = ['lead', 'harmony', 'hook', 'seq', 'ostinato', 'brass', 'bass', 'drums'];
  const s = songBuilder(keys);
  const loop = (n) => cyc(LOOP, n);

  s.section('The grid wakes: the pulse alone, low hits', 8, {
    bass: v(92, each(loop(8), T2.pulse)),
    brass: [...rep(null, 4), ...v(50, each(loop(8).slice(4), T2.brass))],
    drums: v(96, [D2.hit, null, D2.hit, null, D2.hit, null, D2.hit, null]),
  });
  s.section('The sequencer starts, half-time drums', 8, {
    seq: v(70, each(loop(8), T2.seq)),
    bass: v(96, each(loop(8), T2.pulse)),
    brass: v(56, each(loop(8), T2.brass)),
    drums: v(100, halfBars(8)),
  });
  s.section('The theme, half-time', 16, {
    lead: v(96, cyc(THEME, 16)),
    seq: v(66, each(loop(16), T2.seq)),
    ostinato: [...rep(null, 8), ...v(70, each(loop(8), T2.ost))],
    brass: v(62, each(loop(16), T2.brass)),
    bass: v(100, each(loop(16), T2.pulse)),
    drums: v(104, halfBars(16)),
  });
  s.section('Build', 8, {
    seq: v(74, each(loop(8), T2.seq)),
    ostinato: v(76, each(loop(8), T2.ost)),
    brass: v(66, each(loop(8), T2.brass)),
    bass: v(104, [...each(loop(7), T2.pulse), null]),
    drums: v(104, [...halfBars(4), ...PERC.roll]),
  });
  s.section('Drop: four on the floor, the theme up high', 16, {
    lead: v(108, cyc(THEME, 16).map((b) => b.replace(/\b([A-G](?:#|b)?)(\d)\b/g, (n) => (midi(n) + 12 <= 96 ? nm(midi(n) + 12) : n)))),
    harmony: v(84, cyc(THEME, 16)),
    seq: v(70, each(loop(16), T2.seq)),
    ostinato: v(80, each(loop(16), T2.ost)),
    brass: v(70, each(loop(16), T2.brass)),
    bass: v(112, each(loop(16), T2.pulse)),
    drums: v(112, fourBars(16)),
  });
  s.section('Breakdown: the old stab hook over the brass', 12, {
    hook: [...rep(null, 4), ...v(84, cyc(HOOK, 8))],
    seq: v(58, each(cyc(BREAK, 12), T2.seq)),
    brass: v(66, each(cyc(BREAK, 12), T2.brass)),
    bass: v(90, each(cyc(BREAK, 12), T2.pulseHalf)),
    drums: v(90, [D2.hit, null, null, null, D2.hit, null, null, null, ...PERC.roll]),
  });
  s.section('Final: everything, the theme in two voices', 24, {
    lead: v(112, cyc(THEME, 24)),
    harmony: v(88, cyc(THEME, 24).map((bar, i) => under(bar, LOOP[i % 8]))),
    hook: [...rep(null, 16), ...v(80, cyc(HOOK, 8))],
    seq: v(74, each(loop(24), T2.seq)),
    ostinato: v(84, each(loop(24), T2.ost)),
    brass: v(74, each(loop(24), T2.brass)),
    bass: v(116, each(loop(24), T2.pulse)),
    drums: v(116, fourBars(24)),
  });
  s.section('Outro: the pulse fades', 8, {
    seq: v(60, each(loop(4), T2.seq)),
    brass: v(60, each(loop(8), T2.brass)),
    bass: v(100, [...each(loop(6), T2.pulse), ...each(loop(1), T2.pulseHalf)]),
    drums: v(100, [...halfBars(4), D2.hit, null, null, D2.end]),
  });

  write('underpass.song', `# Underpass, by Claude and SZ. Synthwave in the manner of a synth film score: an octave-pulse bass,
# a step sequencer, brass chords, and a heroic theme that goes from half-time to four on the floor.
title: Underpass
composer: Claude & SZ
year: 2026
source: original
category: originals
key: F minor
style: synthwave
tempo: 124
time: 4/4`, s, [
    ['lead', 'track lead role=lead vol=0.7'],
    ['harmony', 'track harmony role=lead2 vol=0.45 pan=0.2'],
    ['hook', 'track hook role=counter vol=0.5 pan=-0.2'],
    ['seq', 'track sequencer role=arp vol=0.55 pan=0.3'],
    ['ostinato', 'track ostinato role=chords vol=0.45 pan=-0.3'],
    ['brass', 'track brass role=pad vol=0.5'],
    ['bass', 'track bass role=bass vol=0.7'],
    ['drums', 'track drums role=drums vol=0.8'],
  ]);
}

// ---------------------------------------------------------------------------------------------
// Ivory and Ash (128 Mix): C minor, 128 BPM. The melodies come from ivory-and-ash.mjs.

const TICKS = { 1: 3840, 2: 1920, 4: 960, 8: 480, 16: 240 };
const SPLIT = [3840, 2880, 1920, 1440, 960, 720, 480, 240];
const pieces = (t) => {
  const outList = [];
  for (const d of SPLIT) while (t >= d) { outList.push(DUR[d]); t -= d; }
  if (t) throw new Error(`cannot write ${t} ticks`);
  return outList;
};
// One bar of melody -> two bars with every duration doubled; notes crossing the bar line are tied.
function stretch(bar) {
  if (bar === null) return [null, null];
  const bars = [[], []];
  let pos = 0;
  let last = 960;
  for (const tok of bar.split(' ')) {
    const m = /^([A-G](?:#|b)?\d|r)(?:\/(\d+)(\.)?)?([~^])?$/.exec(tok);
    if (!m) throw new Error(`stretch: ${tok}`);
    const t = m[2] ? TICKS[m[2]] * (m[3] ? 1.5 : 1) : last;
    last = t;
    let left = t * 2;
    while (left > 0) {
      const seg = Math.min(left, BAR - (pos % BAR));
      const where = Math.floor(pos / BAR);
      left -= seg;
      pos += seg;
      const ps = pieces(seg);
      ps.forEach((d, i) => {
        const end = left === 0 && i === ps.length - 1;
        const mark = m[1] === 'r' ? '' : end ? (m[4] ?? '') : '~';
        bars[where].push(`${m[1]}${d}${mark}`);
      });
    }
  }
  if (pos !== 2 * BAR) throw new Error(`stretch: ${bar} is not one bar`);
  return bars.map((b) => b.join(' '));
}
const stretchAll = (bars) => bars.flatMap(stretch);
// Chord bars -> two bars each; a bar with two chords gives one bar to each.
const stretchChords = (bars) => bars.flatMap((bar) => { const c = bar.split(' '); return c.length === 2 ? c : [c[0], c[0]]; });

{
  const THEME = stretchChords(['Cm', 'Cm/Bb', 'Abmaj7', 'G7', 'Fm', 'Cm/Eb', 'Ddim G7', 'Cm']);
  const BUILD = stretchChords(['Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Eb', 'Fm', 'G']);
  const RISE = stretchChords(['Fm', 'Bb', 'Eb', 'Ab', 'Ddim', 'G', 'Cm', 'Cm G7']);

  const PIANO_THEME = [
    'r/4 G4/4 C5/4 Eb5/4', 'D5/2. C5/4', 'C5/4 Bb4/4 Ab4/4 G4/4', 'B4/2 D5/4 F5/4',
    'Ab5/2. G5/8 F5/8', 'Eb5/2 G4/2', 'F5/4 Eb5/4 D5/4 B4/4', 'C5/1',
  ];
  const GUITAR_ANSWER = [null, null, 'r/2 Eb5/8^ F5/4.', 'F5/8^ G5/8~ G5/4 D5/2', null, null, 'Ab5/4^ Bb5/4^ Ab5/4 G5/4', 'G5/1'];
  const GUITAR_BUILD = [
    'C5/2. Eb5/4', 'G5/8^ Ab5/8~ Ab5/4 G5/2', 'F5/2. D5/4', 'Eb5/4 D5/4 C5/2',
    'C6/2. Bb5/8 Ab5/8', 'G5/1', 'Ab5/4. G5/8 F5/4 Eb5/4', 'D5/8^ Eb5/8^ D5/2.',
  ];
  const GUITAR_RISE = [
    'Ab5/4 C6/4 Eb6/2', 'D6/2. C6/8 Bb5/8', 'Bb5/2 G5/2', 'C6/8^ Db6/8^ C6/2.',
    'Ab5/4 F5/4 D5/4 Ab5/4', 'G5/8^ A5/8^ B5/2.', 'C6/1', 'r/2 B5/4 D6/4',
  ];
  const GUITAR_SOLO = [
    'C6/4^ Db6/4^ C6/4 Ab5/4', 'Bb5/8 C6/8 D6/4^ Eb6/4^ D6/4', 'G6/2. F6/8 Eb6/8', 'Eb6/4^ F6/4^ Eb6/4 C6/4',
    'F6/4. Eb6/8 D6/4 Ab5/4', 'B5/8^ C6/8^ B5/4 D6/4 F6/4', 'Eb6/8^ F6/8^ G6/2.~', 'G6/2. r/4',
  ];
  const TRADE_PIANO = ['r/8 G4/8 C5/8 Eb5/8 G5/4 F5/4', null, 'r/8 Ab4/8 C5/8 Eb5/8 G5/4 Eb5/4', null,
    'r/8 F4/8 Ab4/8 C5/8 F5/4 Ab5/4', null, 'D5/8 F5/8 Ab5/8 B5/8 D6/4 B5/4', null];
  // The trade's last guitar bar resolves to C for the ending.
  const TRADE_GUITAR = [null, 'G5/8^ Ab5/8^ G5/4 F5/4 Eb5/4', null, 'F5/4^ G5/4 D5/4 B4/4',
    null, 'Bb5/8^ C6/8~ C6/2 G5/4', null, 'C6/1'];

  const keys = ['guitar', 'piano', 'arp', 'stabs', 'pad', 'sub', 'drums', 'perc', 'cym'];
  const s = songBuilder(keys);

  s.section('Intro: the beat and the theme chords', 16, {
    pad: v(54, each(THEME, T.pad)),
    arp: [...rep(null, 8), ...v(44, each(THEME.slice(8), T.arp16))],
    sub: [...rep(null, 8), ...v(90, each(THEME.slice(8), T.off8))],
    drums: v(100, [...rep(DRUMS.four, 4), ...rep(DRUMS.hats, 8), ...rep(DRUMS.clap, 4)]),
    perc: [...rep(null, 4), ...v(70, rep(PERC.groove, 12))],
  });
  s.section('The piano theme, the guitar answers', 16, {
    piano: v(84, stretchAll(PIANO_THEME.map((bar, i) => (GUITAR_ANSWER[i] ? null : bar)))),
    guitar: v(90, stretchAll(GUITAR_ANSWER)),
    stabs: v(92, each(THEME, T.stabs)),
    pad: v(50, each(THEME, T.pad)),
    sub: v(102, each(THEME, T.roll)),
    drums: v(106, rep(DRUMS.clap, 16)),
    perc: v(74, rep(PERC.groove, 16)),
    cym: ['v=90 cr/1'],
  });
  s.section('The build, snare roll', 16, {
    guitar: v(96, stretchAll(GUITAR_BUILD)),
    arp: v(56, each(BUILD, T.arp16)),
    stabs: v(94, each(BUILD, T.stabs)),
    pad: v(56, each(BUILD, T.pad)),
    sub: v(104, [...each(BUILD.slice(0, 15), T.roll), null]),
    drums: v(106, [...rep(DRUMS.clap, 12), ...rep(DRUMS.four, 3), null]),
    perc: [...v(74, rep(PERC.groove, 12)), ...PERC.roll],
  });
  s.section('Drop: the guitar rises', 16, {
    guitar: v(108, stretchAll(GUITAR_RISE)),
    arp: v(64, each(RISE, T.arp16)),
    stabs: v(106, each(RISE, T.stabs)),
    pad: v(60, each(RISE, T.pad)),
    sub: v(114, each(RISE, T.rollPop)),
    drums: v(114, rep(DRUMS.clap, 16)),
    perc: v(82, rep(PERC.groove, 16)),
    cym: ['v=100 cr/1', ...rep(null, 7), 'cr/1'],
  });
  s.section('Breakdown: the piano alone with the pad', 16, {
    piano: v(80, stretchAll(PIANO_THEME)),
    pad: v(60, each(THEME, T.pad)),
    sub: [...rep(null, 8), ...v(84, each(THEME.slice(8), T.hold))],
    arp: [...rep(null, 8), ...v(46, each(THEME.slice(8), T.arp16))],
    perc: [...rep(null, 12), ...PERC.roll],
  });
  s.section('Second drop: the guitar solo', 16, {
    guitar: v(114, stretchAll(GUITAR_SOLO)),
    piano: v(70, each(RISE, T.sweep)),
    arp: v(62, each(RISE, T.arp16)),
    stabs: v(104, each(RISE, T.stabs)),
    pad: v(62, each(RISE, T.pad)),
    sub: v(116, each(RISE, T.rollPop)),
    drums: v(116, rep(DRUMS.clap, 16)),
    perc: v(84, rep(PERC.groove, 16)),
    cym: ['v=104 cr/1', ...rep(null, 7), 'cr/1'],
  });
  s.section('Outro: piano and guitar trade', 16, {
    piano: v(80, stretchAll(TRADE_PIANO)),
    guitar: v(94, stretchAll(TRADE_GUITAR)),
    stabs: v(92, each(THEME.slice(0, 8), T.stabs)),
    pad: v(54, each(THEME, T.pad)),
    sub: [...v(104, each(THEME.slice(0, 8), T.roll)), ...v(90, each(THEME.slice(8, 12), T.off8)), ...v(84, each(THEME.slice(12, 15), T.hold))],
    drums: v(104, [...rep(DRUMS.clap, 8), ...rep(DRUMS.hats, 4), ...rep(DRUMS.four, 3), DRUMS.end]),
    perc: v(74, rep(PERC.groove, 12)),
  });

  write('ivory-and-ash-128.song', `# Ivory and Ash (128 Mix), by Claude and SZ. The Ivory and Ash melodies at 128 BPM: every note is
# twice as long, so the tune keeps its pace while a four-on-the-floor beat and a rolling bass run
# underneath. The acid lead takes the guitar part and the stabs take the piano; try it in Cinematic too.
title: Ivory and Ash (128 Mix)
composer: Claude & SZ
year: 2026
source: original
category: originals
hidden: true
key: C minor
style: techno
tempo: 128
time: 4/4`, s, [
    ['guitar', 'track guitar role=lead vol=0.6 pan=0.15'],
    ['piano', 'track piano role=lead2 vol=0.6 pan=-0.15'],
    ['arp', 'track arp role=arp vol=0.3 pan=0.3'],
    ['stabs', 'track stabs role=chords vol=0.75 pan=-0.25'],
    ['pad', 'track pad role=pad vol=0.4'],
    ['sub', 'track bass role=bass vol=0.62'],
    ['drums', 'track drums role=drums vol=0.75'],
    ['perc', 'track perc role=drums vol=0.5 pan=0.2'],
    ['cym', 'track cymbals role=drums vol=0.45'],
  ]);
}
