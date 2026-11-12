// Confetti Cannon: an original peak-time electro-house track for the Techno style, by Claude Fable 5.2
// and SZ, its sung opening reworked by MiMo v2.6 Pro. One bouncing two-bar riff in G major carries the song: a call that climbs root-3-5-6 in a
// 3+3+2 rhythm and an answer that jumps to the octave, leaves a hole, and falls back. It plays on
// the acid lead, doubled in fuzz (inst=fuzz-lead) in the full sections, over a 909, a sub on the
// off-beats, off-beat stabs, a dark pad, and a chopped wordless vocal (inst=vox-lead) that answers
// in the riff's hole. This script lays the parts out over 152 bars.
//   node tools/arranger/confetti-cannon.mjs [outDir]
import {
  chordText, clampVelocity, noteName, outDir, saveSong, SHARPS, writeBlock,
} from './lib.mjs';

const out = outDir();

const nm = (n) => noteName(n, SHARPS);

// A fixed pseudo-random stream per track, so the "human" velocities and offsets are uneven but the
// script always writes the same file.
const stream = (seed) => {
  let s = seed;
  return (lo, hi) => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return lo + Math.floor((s / 2147483648) * (hi - lo + 1));
  };
};

// The chords. Each has the riff's root (all four sit inside C3-G3, so the riff stays a bass riff),
// its third and "colour" step (the 6th on a major chord, the 7th on E minor), a stab voicing just
// above the riff, an open root-and-fifth pad, the sub's root, and the three notes of its vocal chop.
const CH = {
  G: { root: 55, third: 4, colour: 9, stab: [67, 71, 74], pad: [55, 62, 67], sub: 31, vox: [74, 76, 79] },
  Em: { root: 52, third: 3, colour: 10, stab: [67, 71, 76], pad: [59, 64, 71], sub: 28, vox: [71, 74, 76] },
  C: { root: 48, third: 4, colour: 9, stab: [67, 72, 76], pad: [55, 60, 67], sub: 36, vox: [76, 79, 81] },
  D: { root: 50, third: 4, colour: 9, stab: [66, 69, 74], pad: [57, 62, 69], sub: 38, vox: [78, 81, 86] },
};
const MAIN = ['G', 'G', 'Em', 'Em', 'C', 'C', 'D', 'D'];
const RISE = ['C', 'C', 'D', 'D', 'Em', 'Em', 'G', 'G'];
const BUILD = ['C', 'C', 'C', 'C', 'D', 'D', 'D', 'D'];

// The form, in 8-bar sections.
const FORM = [
  ['intro1', MAIN, 'the vocal sings the riff over a bare kick pulse'],
  ['intro2', MAIN, 'the beat and sub join under the vocal'],
  ['tease1', MAIN, 'the vocal hands the tune to the riff: only its call, quiet'],
  ['tease2', MAIN, 'the whole riff, louder every two bars; the pad and claps join'],
  ['groove1', MAIN, 'first groove: riff, off-beat stabs, claps, 16th hats'],
  ['groove2', MAIN, 'first groove: the fuzz double joins'],
  ['break1a', MAIN, 'breakdown 1: the kick drops; the pad and a quiet riff carry'],
  ['break1b', MAIN, 'breakdown 1: the vocal chop, a held sub and soft hats'],
  ['build1', BUILD, 'build 1: a snare roll (quarters, eighths, sixteenths) and a riser over C then D'],
  ['drop1a', MAIN, 'drop 1: everything'],
  ['drop1b', MAIN, 'drop 1: the vocal answers in the riff\'s hole'],
  ['break2', RISE, 'breakdown 2: the kick drops; the vocal sings a long line over a rising C-D-Em-G'],
  ['build2', BUILD, 'build 2: a faster roll, the riser an octave up'],
  ['finalA1', MAIN, 'final drop: a rolling sub, the vocal chops'],
  ['finalA2', MAIN, 'final drop: the same, with the fill into the lift'],
  ['finalB1', RISE, 'final drop, the lift: the riff climbs C-D-Em-G under the long vocal line, ride cymbal'],
  ['finalB2', RISE, 'final drop, the lift: second pass'],
  ['outro1', MAIN, 'outro: the riff\'s call fades over drums, sub and stabs'],
  ['outro2', MAIN, 'outro: kick, hats and sub, then kick and hats for the mixer'],
];
const total = FORM.length * 8;

// --- The riff -------------------------------------------------------------------------------------
// Call (the first bar of a chord): root. root 3rd 5th. colour. 5th 3rd 2nd, in 3+1+2+3+3+2+1+1.
// Answer (the second bar): 5th. 5th colour octave, a hole, octave colour 5th 3rd.
// Climb (the answer at the end of a 16-bar unit): the answer's start, then a run up to the octave.
const call = (c, v, r, up = 0) => {
  const { root: o, third, colour } = CH[c];
  const steps = [[o, '/8.', 8], [o, '/16', -8], [o + third, '/8', 0], [o + 7, '/8.', 4], [o + colour, '/8.', 12], [o + 7, '/8', -2], [o + third, '/16', -8], [o + 2, '/16', -4]];
  return steps.map(([n, d, a]) => `${nm(n + up)}${d}:${clampVelocity(v + a + r(-3, 3))}`).join(' ');
};
const answer = (c, v, r, up = 0) => {
  const { root: o, third, colour } = CH[c];
  const head = [[o + 7, '/8.', 8], [o + 7, '/16', -8], [o + colour, '/8', 0], [o + 12, '/8', 12]];
  const tail = [[o + 12, '/16', 4], [o + colour, '/16', -6], [o + 7, '/8', 0], [o + third, '/8', -6]];
  const say = (list) => list.map(([n, d, a]) => `${nm(n + up)}${d}:${clampVelocity(v + a + r(-3, 3))}`).join(' ');
  return `${say(head)} r/8 ${say(tail)}`;
};
const climb = (c, v, r) => {
  const { root: o, third, colour } = CH[c];
  const steps = [[o + 7, '/8.', 4], [o + 7, '/16', -8], [o + colour, '/8', 0], [o + 12, '/8', 4], [o + 14, '/16', 0], [o + 12 + third, '/16', 3],
    [o + 19, '/16', 6], [o + 12 + colour, '/16', 9], [o + 24, '/8', 12], [o + 24, '/8', 14]];
  return steps.map(([n, d, a]) => `${nm(n)}${d}:${clampVelocity(v + a + r(-2, 2))}`).join(' ');
};

// Each section's riff: 'full' (call and answer), 'calls' (the call, then a bar's rest), 'build' (the
// call every bar), or silent; with the velocity at its first and last bar, and whether its last bar
// is the climb.
const RIFF = {
  tease1: ['calls', 70, 84], tease2: ['full', 74, 96, true],
  groove1: ['full', 104, 104], groove2: ['full', 108, 108, true],
  break1a: ['full', 58, 58], break1b: ['full', 70, 80],
  build1: ['build', 74, 110, true],
  drop1a: ['full', 114, 114], drop1b: ['full', 116, 116, true],
  break2: ['calls', 76, 84], build2: ['build', 78, 112, true],
  finalA1: ['full', 116, 116], finalA2: ['full', 118, 118, true],
  finalB1: ['full', 120, 120], finalB2: ['full', 122, 122, true],
  outro1: ['calls', 100, 72],
};
// The fuzz double plays the same notes, softer, in the full sections only.
const GRIT = { groove2: 0.78, drop1a: 0.8, drop1b: 0.8, finalA1: 0.8, finalA2: 0.8, finalB1: 0.82, finalB2: 0.82 };

const riffBars = (scale) => {
  const r = stream(scale ? 7 : 3);
  return FORM.flatMap(([name, prog]) => {
    const plan = RIFF[name];
    if (!plan || (scale && !GRIT[name])) return Array(8).fill('R');
    const [kind, from, to, climbs] = plan;
    return prog.map((c, i) => {
      const v = (from + ((to - from) * i) / 7) * (scale ? GRIT[name] : 1);
      if (climbs && i === 7) return climb(c, v, r);
      if (kind === 'build') return call(c, v, r);
      if (i % 2 === 0) return call(c, v, r);
      return kind === 'calls' ? 'R' : answer(c, v, r);
    });
  });
};

// --- The vocal ------------------------------------------------------------------------------------
// The tune opens sung: the vocal sings the riff's call and answer an octave up over the bare pulse
// (VOX_FULL), thins to calls as the beat joins (VOX_CALL), and hands the tune to the acid at the
// tease. The chop: two pickup notes at the end of the call bar, then a long top note on the answer's
// downbeat and two notes falling through the riff's hole. Slightly behind the beat, like a singer.
const VOX_FULL = { intro1: [96, 102] };
const VOX_CALL = { intro2: [84, 72] };
const VOX_CHOP = { break1b: 88, drop1b: 114, finalA1: 114, finalA2: 116 };
// The long line, for the rising progression: one two-bar phrase per chord, climbing with it.
const LINE = {
  C: ['E5/2.+14 G5/4', 'A5/2+10 G5/4 E5/4+8'],
  D: ['F#5/2.+12 A5/4', 'B5/2+10 A5/4 F#5/4+8'],
  Em: ['G5/2.+14 B5/4', 'D6/2+12 B5/4 G5/4+8'],
  G: ['B5/2.+12 D6/4', 'D6/1+10'],
};
const VOX_LINE = { break2: 100, finalB1: 106, finalB2: 110 };

const voxBars = () => {
  const r = stream(11);
  return FORM.flatMap(([name, prog]) => {
    if (VOX_LINE[name]) return prog.map((c, i) => `v=${VOX_LINE[name] + r(-3, 3)} ${LINE[c][i % 2]}`);
    // up = 24 puts the sung tune an octave above the riff in the file; the writer drops it one.
    const full = VOX_FULL[name];
    if (full) {
      return prog.map((c, i) => (i % 2 === 0 ? call : answer)(c, clampVelocity(full[0] + ((full[1] - full[0]) * i) / 7), r, 24));
    }
    const sung = VOX_CALL[name];
    if (sung) {
      return prog.map((c, i) => (i % 2 === 0 ? call(c, clampVelocity(sung[0] + ((sung[1] - sung[0]) * i) / 7), r, 24) : 'R'));
    }
    const v = VOX_CHOP[name];
    if (!v) return Array(8).fill('R');
    return prog.map((c, i) => {
      const [x, y, z] = CH[c].vox;
      if (i % 2 === 0) return `r/2. ${nm(x)}/8+${r(8, 14)}:${clampVelocity(v - 10 + r(-3, 3))} ${nm(y)}/8+${r(6, 12)}:${clampVelocity(v - 4 + r(-3, 3))}`;
      return `${nm(z)}/4+${r(8, 14)}:${clampVelocity(v + 8 + r(-2, 2))} r/8 ${nm(y)}/8+${r(8, 14)}:${clampVelocity(v - 6 + r(-3, 3))} ${nm(x)}/8.+${r(6, 12)}:${clampVelocity(v + r(-3, 3))} r/16 r/4`;
    });
  });
};

// --- The stabs ------------------------------------------------------------------------------------
// Off-beat skanks, each a little late and never the same velocity twice. 'skank' answers the riff's
// two bars (four off-beats, then a doubled one on beat 3); 'busy' doubles every bar; 'soft' plays two.
const STABS = {
  groove1: ['skank', 90], groove2: ['skank', 94], break1b: ['soft', 62],
  drop1a: ['skank', 98], drop1b: ['skank', 98], finalA1: ['skank', 100], finalA2: ['skank', 100],
  finalB1: ['busy', 102], finalB2: ['busy', 104], outro1: ['skank', 88],
};
const stabBars = () => {
  const r = stream(19);
  return FORM.flatMap(([name, prog]) => {
    const plan = STABS[name];
    if (!plan) return Array(8).fill('R');
    const [kind, v] = plan;
    return prog.map((c, i) => {
      const s = chordText(CH[c].stab, nm);
      const hit = (d, a = 0) => `${s}${d}'+${r(12, 22)}:${clampVelocity(v + a + r(-7, 6))}`;
      if (kind === 'soft') return `r/8 ${hit('/8')} r/2 r/8 ${hit('/8', -6)}`;
      if (kind === 'busy' || i % 2 === 1) {
        return `r/8 ${hit('/8')} r/8 ${hit('/8', -4)} r/8 ${s}/16'+${r(8, 14)}:${clampVelocity(v - 8 + r(-5, 5))} ${s}/16'+${r(10, 18)}:${clampVelocity(v + 4 + r(-4, 4))} r/8 ${hit('/8', 2)}`;
      }
      return `r/8 ${hit('/8')} r/8 ${hit('/8', -5)} r/8 ${hit('/8', 2)} r/8 ${hit('/8', -3)}`;
    });
  });
};

// --- The pad --------------------------------------------------------------------------------------
// Root and fifth only, held two bars a chord, so the riff's 6ths and the vocal never rub a third.
const PAD = {
  intro1: 64,
  tease2: 74, groove1: 82, groove2: 82, break1a: 104, break1b: 104, build1: 96, drop1a: 86, drop1b: 86,
  break2: 106, build2: 98, finalA1: 88, finalA2: 88, finalB1: 92, finalB2: 92, outro1: 72,
};
const padBars = () =>
  FORM.flatMap(([name, prog]) => {
    const v = PAD[name];
    if (!v) return Array(8).fill('R');
    return prog.map((c, i) => {
      const held = i % 2 === 0 && prog[i + 1] === c;
      const tied = i % 2 === 1 && prog[i - 1] === c;
      return `${tied ? '' : `v=${v} `}${chordText(CH[c].pad, nm)}/1${held ? '~' : ''}`;
    });
  });

// --- The sub --------------------------------------------------------------------------------------
// Always off the kick: 'off' is the off-beat pump (with an octave pop at the end of every second
// bar), 'roll' fills the three 16ths after each kick, 'held' is one long root under a breakdown.
const SUB = {
  intro2: ['off', 88], tease1: ['off', 58], tease2: ['off', 86], groove1: ['off', 96], groove2: ['off', 98],
  break1b: ['held', 52], drop1a: ['off', 100], drop1b: ['off', 102], break2: ['held', 50],
  finalA1: ['roll', 100], finalA2: ['roll', 100], finalB1: ['roll', 102], finalB2: ['roll', 102],
  outro1: ['off', 80], outro2: ['off', 84],
};
const subBars = () => {
  const r = stream(23);
  return FORM.flatMap(([name, prog]) => {
    const plan = SUB[name];
    if (!plan) return Array(8).fill('R');
    const [kind, v] = plan;
    return prog.map((c, i) => {
      const n = CH[c].sub;
      if (name === 'outro2' && i >= 4) return 'R';
      if (kind === 'held') return i % 2 === 0 ? `v=${v} ${nm(n)}/1~` : `${nm(n)}/1`;
      if (kind === 'roll') {
        return [0, 1, 2, 3].map((b) => `r/16 ${nm(n)}/16:${clampVelocity(v - 14 + r(-3, 3))} ${nm(n)}/16:${clampVelocity(v + r(-3, 3))} ${nm(b === 3 && i % 2 === 1 ? n + 12 : n)}/16:${clampVelocity(v - 8 + r(-3, 3))}`).join(' ');
      }
      const off = () => `r/8 ${nm(n)}/8:${clampVelocity(v + r(-4, 4))}`;
      if (i % 2 === 1 && name !== 'intro2' && name !== 'outro2') {
        return `${off()} ${off()} ${off()} r/8 ${nm(n)}/16:${clampVelocity(v + r(-3, 3))} ${nm(n + 12)}/16:${clampVelocity(v - 10 + r(-3, 3))}`;
      }
      return `${off()} ${off()} ${off()} ${off()}`;
    });
  });
};

// --- The riser ------------------------------------------------------------------------------------
// 16ths on one chord tone a bar, climbing through the build and getting louder; the last beat of
// the build is left empty for the drop.
const RISER = { build1: [67, 67, 72, 72, 74, 74, 78, 81], build2: [79, 79, 84, 84, 86, 86, 90, 93] };
const riserBars = () =>
  FORM.flatMap(([name]) => {
    const notes = RISER[name];
    if (!notes) return Array(8).fill('R');
    return notes.map((n, i) => {
      const count = i === 7 ? 12 : 16;
      const run = Array.from({ length: count }, (_, k) => `${nm(n)}/16':${clampVelocity(52 + ((i * 16 + k) * 70) / 127 + (k % 4 === 0 ? 6 : 0))}`).join(' ');
      return i === 7 ? `${run} r/4` : run;
    });
  });

// --- The drums ------------------------------------------------------------------------------------
// The kick holds the grid (a drum machine). The off-beat hats swing a few ticks late, the 16th
// before each beat later still, and no two hats share a velocity.
const DRUMS = {
  intro1: 'pulse', intro2: 'offhat', tease1: 'open', tease2: 'open', groove1: 'full', groove2: 'full',
  break1a: 'none', break1b: 'hats', build1: 'build', drop1a: 'full', drop1b: 'full', break2: 'tick',
  build2: 'build', finalA1: 'full', finalA2: 'full', finalB1: 'ride', finalB2: 'ride', outro1: 'full', outro2: 'offhat',
};
const CRASH = new Set(['intro2', 'tease2', 'groove1', 'drop1a', 'finalA1', 'finalB1', 'outro1']);
const FILL = new Set(['intro1', 'tease2', 'groove1', 'groove2', 'drop1a', 'drop1b', 'finalA1', 'finalA2', 'finalB1', 'finalB2']);

const drumBars = () => {
  const r = stream(29);
  const kick = () => clampVelocity(110 + r(-2, 2));
  return FORM.flatMap(([name]) => {
    const kind = DRUMS[name];
    return Array.from({ length: 8 }, (_, i) => {
      const first = (len) => (i === 0 && CRASH.has(name) ? `[k cr]${len}:${kick()}` : `k${len}:${kick()}`);
      const beats = [0, 1, 2, 3].map((b) => {
        const k8 = b === 0 ? first('/8') : `k/8:${kick()}`;
        const k16 = b === 0 ? first('/16') : `k/16:${kick()}`;
        if (kind === 'none') return 'r/4';
        // 'pulse': the kick on 1 and 3 under the sung tune; hats on the off-beats of 2 and 4 later.
        if (kind === 'pulse') return b % 2 === 0 ? `k/4:${kick()}` : (i < 4 ? 'r/4' : `r/8 h/8+${r(6, 12)}:${clampVelocity(58 + r(-8, 8))}`);
        if (kind === 'intro') return i < 4 ? `k/4:${kick()}` : `${k8} h/8+${r(6, 12)}:${clampVelocity(62 + r(-8, 8))}`;
        if (kind === 'offhat') return name === 'intro2' && i >= 4 ? `${k8} oh/8+${r(8, 14)}:${clampVelocity(72 + r(-7, 7))}` : `${k8} h/8+${r(6, 12)}:${clampVelocity(66 + r(-8, 8))}`;
        if (kind === 'open') return `${k8} oh/8+${r(8, 14)}:${clampVelocity(78 + r(-7, 7))}`;
        if (kind === 'hats') return `r/8 h/8+${r(8, 14)}:${clampVelocity(56 + i * 3 + r(-6, 6))}`;
        if (kind === 'tick') return i < 4 ? 'r/4' : `r/8 h/8+${r(8, 14)}:${clampVelocity(50 + i * 3 + r(-6, 6))}`;
        if (kind === 'build') {
          // The kick comes back halfway through the build and stops a beat before the drop.
          if (i < 4 || (i === 7 && b === 3)) return 'r/4';
          return `k/4:${clampVelocity(92 + (i - 4) * 6 + r(-2, 2))}`;
        }
        const top = kind === 'ride' && b % 2 === 0 ? `[k rd]/16:${kick()}` : k16;
        return `${b === 0 && i === 0 && CRASH.has(name) ? k16 : top} h/16:${clampVelocity(50 + r(-6, 6))} oh/16+${r(8, 14)}:${clampVelocity(86 + r(-7, 7))} h/16+${r(12, 20)}:${clampVelocity(60 + r(-7, 7))}`;
      });
      if (FILL.has(name) && i === 7) beats[3] = `k/16:${kick()} s/16:${clampVelocity(80 + r(-4, 4))} s/16+8:${clampVelocity(94 + r(-4, 4))} s/16:${clampVelocity(108 + r(-3, 3))}`;
      if (name === 'outro2' && i === 7) return `k/4:${kick()} k/4:${kick()} k/4:${kick()} k/4:${kick()}`;
      return beats.every((b) => b === 'r/4') ? 'R' : beats.join(' ');
    });
  });
};

// The claps drag behind the beat on their own track; the same track plays the snare rolls.
const CLAPS = { tease2: 90, groove1: 98, groove2: 100, drop1a: 104, drop1b: 104, finalA1: 104, finalA2: 106, finalB1: 108, finalB2: 108, outro1: 96 };
const clapBars = () => {
  const r = stream(31);
  return FORM.flatMap(([name]) => {
    if (name === 'build1' || name === 'build2') {
      const fast = name === 'build2';
      // Hits per bar: quarters, eighths, sixteenths (build 2 starts on eighths and ends on 32nds).
      const rate = fast ? [8, 8, 8, 8, 16, 16, 16, 32] : [4, 4, 8, 8, 8, 8, 16, 16];
      let k = 0;
      const hits = rate.reduce((a, b) => a + b, 0);
      return rate.map((n, i) => {
        const count = i === 7 ? (n * 3) / 4 : n;
        const bar = Array.from({ length: count }, (_, j) => {
          const v = clampVelocity(54 + (k++ * 58) / hits + r(-3, 3));
          const onBeat = (j * 4) % n === 0;
          const drum = onBeat && i >= 4 ? '[s cl]' : 's';
          return `${drum}/${n}${onBeat || n > 8 ? '' : `+${r(4, 10)}`}:${v}`;
        }).join(' ');
        return i === 7 ? `${bar} r/4` : bar;
      });
    }
    if (name === 'break1b') return Array.from({ length: 8 }, (_, i) => (i < 4 ? 'R' : `r/2. cl/4+${r(10, 16)}:${clampVelocity(58 + i * 4)}`));
    const v = CLAPS[name];
    if (!v) return Array(8).fill('R');
    const lift = name.startsWith('finalB');
    return Array.from({ length: 8 }, (_, i) => {
      const cl = (a = 0) => `cl/4+${r(8, 16)}:${clampVelocity(v + a + r(-5, 5))}`;
      if (lift && i % 2 === 1) return `r/4 ${cl()} r/4 cl/8.+${r(8, 16)}:${clampVelocity(v + 2 + r(-4, 4))} cl/16+${r(4, 10)}:${clampVelocity(v - 28 + r(-4, 4))}`;
      return `r/4 ${cl(-2)} r/4 ${cl(2)}`;
    });
  });
};

// --- Writing the file -----------------------------------------------------------------------------
// One comment per section, then its eight bars, two to a line.
const marks = FORM.map(([, , about], s) => [s * 8, `${s * 8 + 1}-${s * 8 + 8}: ${about}`]);
const block = (bars) => writeBlock(bars, marks, { perRow: 2, collapseRests: true });

// The chord map for the checker: one line per change of progression. The answer bars are named by
// the colour the riff and the vocal add there (the 6th, or the 7th on E minor).
const COLOUR = { G: 'G6', Em: 'Em7', C: 'C6', D: 'D6' };
const symbols = (prog) => prog.map((c, i) => (prog !== BUILD && i % 2 === 1 ? COLOUR[c] : c));
const chordLines = [];
FORM.forEach(([, prog], s) => {
  if (s === 0 || FORM[s - 1][1] !== prog) chordLines.push(`# chords${s === 0 ? '' : ` @${s * 8 + 1}`}: ${symbols(prog).join(' ')}`);
});

const text = `# Confetti Cannon, by Claude Fable 5.2, MiMo v2.6 Pro and SZ. An original peak-time electro-house track for the
# Techno style, in G major: brighter and sillier than the other Techno originals. One two-bar riff
# carries it. The call climbs root-3-5-6 in a 3+3+2 bounce; the answer jumps to the octave, leaves a
# hole, and falls back. The tune opens sung: the vocal sings the riff an octave up over a bare kick
# pulse, the beat joins under it, and the vocal hands the tune to the acid lead at the tease. It sits
# low (every root is between C3 and G3) on the acid lead, doubled in fuzz (inst=fuzz-lead) in the
# full sections, over a 909, a sub that only ever plays off the kick, off-beat stabs just above the
# riff, and an open root-and-fifth dark pad. The chopped wordless vocal (inst=vox-lead) answers in
# the riff's hole in the drops.
#
# The loop is G - Em - C - D, two bars a chord; the riff's answer bar adds the 6th (the 7th on Em).
# The second breakdown and the last 16 bars of the final drop turn it around into a rising
# C - D - Em - G (the lift), where the vocal sings one long climbing line. Both builds sit on C
# then D. Generated by tools/arranger/confetti-cannon.mjs.
${chordLines.join('\n')}
#
${FORM.map(([, , about], s) => `# Form ${s * 8 + 1}-${s * 8 + 8}: ${about}`).join('\n')}
#
# Human feel: the kick, sub and riff stay on the grid (a sequencer). The off-beat hats swing 8 to
# 14 ticks late and the 16th before each beat 12 to 20, the claps drag 8 to 16, the stabs land 12
# to 22 late, the vocal sits behind the beat, and every hat, clap and stab has its own velocity.
title: Confetti Cannon
composer: Claude Fable 5.2, MiMo v2.6 Pro & SZ
about: Peak-time electro house at 126 in G major: one bouncing bass riff on the acid lead, doubled in fuzz, over an off-beat sub and a 909, with a chopped vocal answering in the drops and a rising lift at the end.
year: 2026
source: original
category: originals
style: techno
key: G major
tempo: 126
time: 4/4

track riff role=lead vol=0.7
${block(riffBars(false))}

track grit role=lead2 inst=fuzz-lead vol=0.42 pan=0.15
${block(riffBars(true))}

track vox role=counter inst=vox-lead vol=0.9 pan=0.1
${block(voxBars().map((bar) => bar.replace(/([A-G][#b]?)(\d)/g, (m, n, o) => `${n}${o - 1}`)))}

track stabs role=chords vol=0.95 pan=-0.15
${block(stabBars())}

track pad role=pad vol=0.95
${block(padBars())}

track sub role=bass inst=dx-bass vol=0.3
${block(subBars())}

track riser role=arp vol=1 pan=-0.2
${block(riserBars())}

track drums role=drums inst=electro-kit vol=0.6
${block(drumBars())}

track claps role=drums inst=electro-kit vol=1 pan=0.12
${block(clapBars())}
`;
saveSong(out, 'confetti-cannon.song', text);
console.log(`wrote ${out}/confetti-cannon.song (${total} bars)`);
