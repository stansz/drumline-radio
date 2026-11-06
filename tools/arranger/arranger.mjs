// The arranger: turns a melody plus chords into a full .song file (intro, passes, ending) with
// named bass lines and drum grooves. Used by songs.mjs; see tools/README.md.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const midi = (n) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  return (Number(m[3]) + 1) * 12 + LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
export const nm = (n) => SHARP[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
const tr = (bar, s) => (s === 0 ? bar : bar.replace(/\b([A-G])(#|b)?(\d)\b/g, (x) => nm(midi(x) + s)));
const notesIn = (bar) => (bar.match(/\b[A-G](#|b)?\d\b/g) ?? []).map(midi);

const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6] };
function chord(sym, shift = 0) {
  const m = /^([A-G])(#|b)?(maj7|m7|m|7|dim)?$/.exec(sym);
  if (!m) throw new Error('bad chord ' + sym);
  const pc = (LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + shift + 24) % 12;
  return { pc, iv: QUALITY[m[3] ?? ''] };
}
const DUR = { 3840: '/1', 2880: '/2.', 1920: '/2', 1440: '/4.', 960: '/4', 720: '/8.', 480: '/8', 240: '/16' };
const dur = (t) => {
  if (!DUR[t]) throw new Error('no duration for ' + t);
  return DUR[t];
};
const barTicks = ([n, d]) => (n * 3840) / d;

function padSpan(c, ticks, voices = 3) {
  const notes = c.iv.slice(0, voices).map((i) => nm(48 + c.pc + i));
  return `[${notes.join(' ')}]${dur(ticks)}`;
}
function fill(ticks, unit, fn) {
  if (ticks % unit !== 0) unit = 480;
  if (ticks % unit !== 0) unit = 240;
  const out = [];
  for (let i = 0; i < ticks / unit; i++) out.push(fn(i, unit));
  return out.join(' ');
}

// Bass lines by name. Each fills one chord span.
function bassSpan(kind, c, ticks) {
  const root = 36 + c.pc;
  const third = root + c.iv[1];
  const fifth = root + 7;
  const N = (n, u) => `${nm(n)}${dur(u)}`;
  switch (kind) {
    case 'octave8': return fill(ticks, 480, (i, u) => N(i % 2 ? root + 12 : root, u));
    case 'root5': return fill(ticks, 960, (i, u) => N(i % 2 ? root + 7 : root + 12, u));
    case 'offbeat8': return fill(ticks, 480, (i, u) => (i % 2 ? N(root, u) : `r${dur(u)}`));
    case 'pulse16': return fill(ticks, 240, (i, u) => N(i % 4 === 3 ? root + 12 : root, u));
    case 'oompah': return fill(ticks, 960, (i, u) => (i % 2 ? `r${dur(u)}` : N(i % 4 === 0 ? root : fifth - 12, u)));
    case 'walk': return fill(ticks, 960, (i, u) => N([root, third, fifth, root + 9][i % 4], u));
    case 'gallop': return fill(ticks, 960, () => `${nm(root)}/8 ${nm(root)}/16 ${nm(root + 12)}/16`);
    case 'syncop':
      if (ticks === 3840) return `${nm(root)}/4. ${nm(root)}/8 r/4 ${nm(fifth)}/4`;
      if (ticks === 1920) return `${nm(root)}/4. ${nm(fifth)}/8`;
      return N(root, ticks);
    case 'waltz':
      if (ticks === 2880) return `${nm(root)}/4 r/4 ${nm(fifth)}/4`;
      return N(root, ticks);
    case 'lofi':
      if (ticks === 3840) return `${nm(root)}/4. ${nm(root)}/8 r/4 ${nm(fifth)}/8 ${nm(root + 12)}/8`;
      if (ticks === 1920) return `${nm(root)}/4. ${nm(fifth)}/8`;
      return N(root, ticks);
    default: return N(root, ticks); // held
  }
}
function arpSpan(unitTicks, c, ticks) {
  const tones = [...c.iv.slice(0, 3).map((i) => 60 + c.pc + i), 72 + c.pc];
  const order = [0, 1, 2, 3, 2, 1];
  return fill(ticks, unitTicks, (i, u) => `${nm(tones[order[i % order.length]])}${dur(u)}`);
}

// Drum grooves by name: [verse, fuller] per time signature.
const GROOVES = {
  gated: {
    '4/4': ['[k h]/8 h/8 h/8 h/8 [k h]/8 h/8 h/8 h/8', '[k h]/8 h/8 [s h]/8 h/8 [k h]/8 h/8 [s h]/8 h/8'],
  },
  chip: {
    '4/4': ['k/4 h/4 k/4 h/4', 'k/8 h/8 s/8 h/8 k/8 k/8 s/8 h/8'],
  },
  orch: {
    '4/4': ['k/2 r/2', 'k/4 r/4 k/4 k/4'],
    '3/4': ['k/4 r/2', 'k/4 k/4 r/4'],
  },
  four: { '4/4': ['k/4 k/4 k/4 k/4', 'k/8 oh/8 [k cl]/8 oh/8 k/8 oh/8 [k cl]/8 oh/8'] },
  march: {
    '4/4': ['k/4 s/8 s/8 k/4 s/4', '[k s]/8 s/16 s/16 s/8 s/8 [k s]/8 s/16 s/16 s/4'],
    '2/4': ['k/4 s/8 s/8', '[k s]/8 s/16 s/16 s/8 s/8'],
  },
  polka: {
    '4/4': ['k/4 s/4 k/4 s/4', 'k/8 h/8 s/8 h/8 k/8 h/8 s/8 h/8'],
    '2/4': ['k/4 s/4', 'k/8 h/8 s/8 h/8'],
  },
  shuffle: {
    '4/4': ['k/4t h/8t h/4t h/8t k/4t h/8t h/4t h/8t', 'k/4t h/8t s/4t h/8t k/4t h/8t s/4t h/8t'],
  },
  halftime: {
    '4/4': ['[k h]/8 h/8 h/8 h/8 [k h]/8 h/8 h/8 h/8', '[k h]/8 h/8 h/8 h/8 [s h]/8 h/8 h/8 k/8'],
  },
  disco: {
    '4/4': ['k/8 oh/8 k/8 oh/8 k/8 oh/8 k/8 oh/8', '[k h]/8 oh/8 [k cl]/8 oh/8 [k h]/8 oh/8 [k cl]/8 oh/8'],
  },
  break: { '4/4': ['k/4 h/4 k/8 k/8 h/4', 'k/8 h/8 s/8 k/8 h/8 k/8 s/8 h/8'] },
  waltz: { '3/4': ['k/4 h/4 h/4', 'k/4 [s h]/4 [s h]/4'] },
  ballad: { '6/8': ['k/4. rim/4.', 'k/8 h/8 h/8 [s h]/8 h/8 h/8'] },
  canon: { '4/4': ['R', 'k/2 r/2'] },
  lofi: {
    // Pocket: the snare sits 18 ticks late and the swung off-hats push 8 early (see micro-timing in song-format.md).
    '4/4': ['k/4t h/8t-8 h/4t h/8t-8 s/4t+18 h/8t-8 h/4t k/8t', 'k/4t h/8t-8 h/4t k/8t s/4t+18 h/8t-8 h/4t h/8t-8'],
  },
};
function groove(name, ts, level) {
  const g = GROOVES[name]?.[ts];
  if (!g) throw new Error(`no groove ${name} for ${ts}`);
  return g[level - 1];
}

/**
 * Writes the bars, ramp, and header to spec.file. Both arrangers build their own tracks table but
 * share this tail.
 */
function writeSong(out, spec, { T, comment, tracks, style, ts }) {
  const block = (key) => {
    const lines = [];
    const marks = new Map(comment[key].map(([i, c]) => [i, c]));
    let row = [];
    const flush = () => { if (row.length) lines.push('| ' + row.join(' | ') + ' |'); row = []; };
    T[key].forEach((bar, i) => {
      if (marks.has(i)) { flush(); lines.push(`# ${marks.get(i)}`); }
      row.push(bar);
      if (row.length === 4) flush();
    });
    flush();
    return lines.join('\n');
  };
  const hidden = spec.hidden ? 'hidden: true\n' : '';
  const ramp = spec.ramp ? `\n@bars ${T.lead.length - 3}-${T.lead.length} tempo=${spec.ramp[0]}..${spec.ramp[1]}\n` : '';
  const text = `${spec.head.trim()}\n${hidden}style: ${style}\ntempo: ${spec.tempo}\ntime: ${ts}\n${ramp}\n` +
    tracks.map(([h, k]) => `${h}\n${block(k)}`).join('\n\n') + '\n';
  writeFileSync(join(out, spec.file), text);
}

/**
 * spec: { file, head, style, time, tempo, melody: [bars], chords: [bar chord strings], passes, keyUp,
 *   bass, drums (names above), intro: { type, bars, tease: [melody bar indices] },
 *   pickup, link, final, finalChord, ramp, parts, voices (pad voices), arpUnit }
 * Intro types: 'tease' (arp previews the tune over the pad), 'pad' (pad alone), 'drums' (drums
 * alone), 'bassriff' (bass, then drums join), 'none', or 'vamp' (pad, bass and drums).
 */
export function arrange(out, spec) {
  const { style, time } = spec;
  const ts = `${time[0]}/${time[1]}`;
  const BT = barTicks(time);
  const n = spec.melody.length;
  if (spec.chords.length !== n) throw new Error(`${spec.file}: ${n} melody bars, ${spec.chords.length} chord bars`);
  const passes = spec.passes;
  const keyUp = spec.keyUp ?? 0;
  const voices = spec.voices ?? 3;
  const arpUnit = spec.arpUnit ?? (style === 'orchestral' ? 480 : 240);

  const T = { lead: [], harm: [], arp: [], pad: [], bass: [], drums: [], cym: [] };
  const comment = { lead: [], harm: [], arp: [], pad: [], bass: [], drums: [], cym: [] };
  const mark = (name) => { for (const k in T) comment[k].push([T[k].length, name]); };
  const spans = (chordBar, shift) => {
    const cs = chordBar.split(' ').map((s) => chord(s, shift));
    return { cs, span: BT / cs.length };
  };
  const accomp = (chordBar, shift, level, arpOn) => {
    const { cs, span } = spans(chordBar, shift);
    T.pad.push(cs.map((c) => padSpan(c, span, voices)).join(' '));
    T.bass.push(cs.map((c) => bassSpan(spec.bass, c, span)).join(' '));
    T.arp.push(arpOn ? cs.map((c) => arpSpan(arpUnit, c, span)).join(' ') : 'R');
    T.drums.push(level === 0 ? 'R' : groove(spec.drums, ts, level));
  };

  const intro = spec.intro ?? { type: 'vamp', bars: 4 };
  if (intro.type !== 'none') {
    mark('Intro');
    const idx = intro.type === 'tease' ? intro.tease : Array.from({ length: intro.bars }, (_, i) => n - intro.bars + i);
    idx.forEach((b, i) => {
      const { cs, span } = spans(spec.chords[b], 0);
      const lastIntroBar = i === idx.length - 1;
      const half = i >= idx.length / 2;
      const t = intro.type;
      T.pad.push(t === 'drums' || t === 'bassriff' ? 'R' : cs.map((c) => padSpan(c, span, voices)).join(' '));
      T.bass.push(t === 'vamp' || t === 'bassriff' ? cs.map((c) => bassSpan(spec.bass, c, span)).join(' ') : 'R');
      T.drums.push(t === 'vamp' || t === 'drums' || (t === 'bassriff' && half) ? groove(spec.drums, ts, 1) : 'R');
      T.arp.push(t === 'tease' ? spec.melody[b] : 'R');
      T.lead.push(lastIntroBar && spec.pickup ? spec.pickup : 'R');
      T.harm.push('R');
      T.cym.push('R');
    });
  }

  for (let p = 0; p < passes; p++) {
    const last = p === passes - 1;
    const shift = last ? keyUp : 0;
    const full = p > 0;
    mark(p === 0 ? 'The tune' : last && keyUp ? `Up a key (pass ${p + 1})` : `Pass ${p + 1}, fuller`);
    for (let b = 0; b < n; b++) {
      let mel = spec.melody[b];
      if (b === n - 1) mel = last ? spec.final ?? mel : spec.link ?? mel;
      const melody = tr(mel, shift);
      T.lead.push(melody);
      if (full) {
        const ns = notesIn(melody);
        const up = ns.every((x) => x + 12 <= 96);
        const down = ns.every((x) => x - 12 >= 48);
        T.harm.push(ns.length === 0 ? melody : up ? tr(melody, 12) : down ? tr(melody, -12) : 'R');
      } else T.harm.push('R');
      accomp(last && b === n - 1 && spec.finalChord ? spec.finalChord : spec.chords[b], shift, full ? 2 : 1, full);
      T.cym.push(b === 0 && full ? `cr${dur(BT)}` : 'R');
    }
  }

  mark('Ending');
  const endChord = chord(spec.finalChord ?? spec.chords[n - 1].split(' ').pop(), keyUp);
  T.lead.push('R');
  T.harm.push('R');
  T.arp.push('R');
  T.pad.push(padSpan(endChord, BT, voices));
  T.bass.push(`${nm(36 + endChord.pc)}${dur(BT)}`);
  T.drums.push(`k${dur(BT)}`);
  T.cym.push(`cr${dur(BT)}`);

  const P = spec.parts;
  const tracks = [
    [`track melody role=${P?.lead ?? 'lead'} vol=0.8`, 'lead'],
    [`track harmony role=${P?.harm ?? 'lead2'} vol=0.45`, 'harm'],
    [`track arp role=arp vol=${intro.type === 'tease' ? '0.4' : '0.35'}`, 'arp'],
    [`track pad role=${P?.pad ?? 'pad'} vol=0.45`, 'pad'],
    [`track bass role=bass vol=0.75`, 'bass'],
    [`track drums role=drums vol=0.8`, 'drums'],
    [`track cymbals role=drums vol=0.5`, 'cym'],
  ];
  writeSong(out, spec, { T, comment, tracks, style, ts });
}

export const head = (title, composer, year, key, note, category) => `# ${title}, arranged by Claude and SZ. ${note}
title: ${title}
composer: ${composer}
arranger: Claude & SZ
year: ${year}
source: public-domain
category: ${category}
key: ${key}`;

// ======================================================================
// Form-based arranging (opt-in). arrange() above is the simple pass-based version that the
// existing recipes use. arrangeForm() adds sections, intensity levels, textures, a counter-melody,
// drum fills, and dynamics, for songs that need more shape than "the tune N times".
// ======================================================================

const FILLS = {
  '4/4': 'k/4 s/8 s/8 tm/8 tm/8 tl/16 tl/16 tl/16 tl/16',
  '3/4': 'k/4 s/8 s/8 tl/16 tl/16 tl/16 tl/16',
  '6/8': 'k/8 s/8 s/8 tm/8 tl/8 tl/8',
  '2/4': 's/8 s/8 tl/16 tl/16 tl/16 tl/16',
};
const ARP_SHAPES = { updown: [0, 1, 2, 3, 2, 1], up: [0, 1, 2, 3], broken: [0, 2, 1, 3] };
const LEVEL_VELOCITY = [60, 78, 92, 105];

function arpShaped(shape, unitTicks, c, ticks) {
  const tones = [...c.iv.slice(0, 3).map((i) => 60 + c.pc + i), 72 + c.pc];
  const order = ARP_SHAPES[shape];
  return fill(ticks, unitTicks, (i, u) => `${nm(tones[order[i % order.length]])}${dur(u)}`);
}

function padTextured(texture, c, ticks, voices) {
  const ch = `[${c.iv.slice(0, voices).map((i) => nm(48 + c.pc + i)).join(' ')}]`;
  if (texture === 'stabs' && ticks === 3840) return `${ch}/8 r/8 r/8 ${ch}/8 r/2`;
  if (texture === 'offbeat') return fill(ticks, 480, (i, u) => (i % 2 ? `${ch}${dur(u)}` : `r${dur(u)}`));
  return `${ch}${dur(ticks)}`;
}

// A counter-line of long chord tones under the melody, moving as little as possible between chords.
function counterNote(c, below, previous) {
  const candidates = [];
  for (let n = 55; n <= 76; n += 1) if (c.iv.includes((((n - c.pc) % 12) + 12) % 12)) candidates.push(n);
  const under = candidates.filter((n) => n <= below - 3);
  const pool = under.length ? under : candidates;
  return pool.reduce((best, n) => (Math.abs(n - previous) < Math.abs(best - previous) ? n : best), pool[0]);
}

/**
 * spec: { file, head, style, time, tempo, bass, drums, voices, arpUnit,
 *   sections: { name: { melody: [bars], chords: [bar chord strings] } },
 *   intro: { type, section, bars, tease } (optional; the types are the same as in arrange()),
 *   form: [{ section, name, level: 0-3, shift, melody (default true), fill, dyn: 'build' | 'drop', last }],
 *   harm: 'counter' | 'octave' | 'off', arp: 'updown' | 'up' | 'broken' | 'off',
 *   pad: 'hold' | 'stabs' | 'offbeat', finalChord, ramp, parts }
 * Levels: 0 = breakdown (pad and melody only), 1 = light (pad, bass, light drums), 2 = full (adds
 * the arp and busier drums), 3 = biggest (adds the harmony part and a crash).
 * A section gets a drum fill on its last bar when the next one is louder (a breakdown included), or
 * when fill is true.
 */
export function arrangeForm(out, spec) {
  const { style, time } = spec;
  const ts = `${time[0]}/${time[1]}`;
  const BT = barTicks(time);
  const voices = spec.voices ?? 3;
  const arpUnit = spec.arpUnit ?? (style === 'orchestral' ? 480 : 240);
  const harmMode = spec.harm ?? 'counter';
  const arpShape = spec.arp ?? 'updown';
  const padMode = spec.pad ?? 'hold';
  for (const [name, s] of Object.entries(spec.sections)) {
    if (s.melody.length !== s.chords.length) {
      throw new Error(`${spec.file}: section ${name} has ${s.melody.length} melody bars, ${s.chords.length} chord bars`);
    }
  }

  const T = { lead: [], harm: [], arp: [], pad: [], bass: [], drums: [], cym: [] };
  const comment = { lead: [], harm: [], arp: [], pad: [], bass: [], drums: [], cym: [] };
  const mark = (name) => { for (const k in T) comment[k].push([T[k].length, name]); };
  const spans = (chordBar, shift) => {
    const cs = chordBar.split(' ').map((s) => chord(s, shift));
    return { cs, span: BT / cs.length };
  };
  let counterPrev = 64;

  const intro = spec.intro;
  if (intro && intro.type !== 'none') {
    mark('Intro');
    const sec = spec.sections[intro.section ?? spec.form[0].section];
    const idx = intro.type === 'tease' ? intro.tease : Array.from({ length: intro.bars }, (_, i) => i);
    idx.forEach((b, i) => {
      const { cs, span } = spans(sec.chords[b], 0);
      const t = intro.type;
      const half = i >= idx.length / 2;
      T.pad.push(t === 'drums' || t === 'bassriff' ? 'R' : 'v=70 ' + cs.map((c) => padTextured('hold', c, span, voices)).join(' '));
      T.bass.push(t === 'vamp' || t === 'bassriff' ? 'v=80 ' + cs.map((c) => bassSpan(spec.bass, c, span)).join(' ') : 'R');
      T.drums.push(t === 'vamp' || t === 'drums' || (t === 'bassriff' && half) ? 'v=80 ' + groove(spec.drums, ts, 1) : 'R');
      T.arp.push(t === 'tease' ? 'v=80 ' + sec.melody[b] : 'R');
      T.lead.push('R');
      T.harm.push('R');
      T.cym.push('R');
    });
  }

  spec.form.forEach((entry, e) => {
    const sec = spec.sections[entry.section];
    if (!sec) throw new Error(`${spec.file}: no section ${entry.section}`);
    const level = entry.level ?? 1;
    const shift = entry.shift ?? 0;
    const next = spec.form[e + 1];
    const prev = spec.form[e - 1];
    const fillLast = entry.fill ?? (next !== undefined && (next.level ?? 1) > level);
    const crashFirst = level >= 2 && (!prev || (prev.level ?? 1) < level || prev.section !== entry.section);
    mark(entry.name ?? `${entry.section[0].toUpperCase()}${entry.section.slice(1)}`);
    const n = sec.melody.length;
    for (let b = 0; b < n; b++) {
      const base = LEVEL_VELOCITY[level];
      const t = n > 1 ? b / (n - 1) : 1;
      const v = Math.round(entry.dyn === 'build' ? base - 15 + 25 * t : entry.dyn === 'drop' ? base + 10 - 25 * t : base);
      const vel = `v=${Math.max(1, Math.min(127, v))} `;
      const { cs, span } = spans(sec.chords[b], shift);

      const mel = tr(b === n - 1 && entry.last ? entry.last : sec.melody[b], shift);
      const playMelody = entry.melody ?? true;
      T.lead.push(playMelody ? vel + mel : 'R');

      if (level === 3 && harmMode !== 'off' && playMelody) {
        if (harmMode === 'octave') {
          const ns = notesIn(mel);
          T.harm.push(ns.length > 0 && ns.every((x) => x + 12 <= 96) ? vel + tr(mel, 12) : 'R');
        } else {
          const lowest = Math.min(...notesIn(mel), 96);
          T.harm.push(vel + cs.map((c) => {
            counterPrev = counterNote(c, lowest, counterPrev);
            return `${nm(counterPrev)}${dur(span)}`;
          }).join(' '));
        }
      } else T.harm.push('R');

      T.pad.push(vel + cs.map((c) => padTextured(level === 0 ? 'hold' : padMode, c, span, voices)).join(' '));
      T.bass.push(level === 0 ? 'R' : vel + cs.map((c) => bassSpan(spec.bass, c, span)).join(' '));
      T.arp.push(level >= 2 && arpShape !== 'off' ? vel + cs.map((c) => arpShaped(arpShape, arpUnit, c, span)).join(' ') : 'R');
      const isFill = b === n - 1 && fillLast && FILLS[ts];
      const drumBar = isFill ? FILLS[ts] : level === 0 ? 'R' : groove(spec.drums, ts, level >= 2 ? 2 : 1);
      T.drums.push(drumBar === 'R' ? 'R' : vel + drumBar);
      T.cym.push(b === 0 && crashFirst ? `cr${dur(BT)}` : 'R');
    }
  });

  mark('Ending');
  const lastEntry = spec.form[spec.form.length - 1];
  const lastSec = spec.sections[lastEntry.section];
  const endChord = chord(spec.finalChord ?? lastSec.chords[lastSec.chords.length - 1].split(' ').pop(), lastEntry.shift ?? 0);
  T.lead.push('R');
  T.harm.push('R');
  T.arp.push('R');
  T.pad.push(padTextured('hold', endChord, BT, voices));
  T.bass.push(`${nm(36 + endChord.pc)}${dur(BT)}`);
  T.drums.push(`k${dur(BT)}`);
  T.cym.push(`cr${dur(BT)}`);

  const P = spec.parts;
  const tracks = [
    [`track melody role=${P?.lead ?? 'lead'} vol=0.8`, 'lead'],
    [`track harmony role=${P?.harm ?? (harmMode === 'counter' ? 'counter' : 'lead2')} vol=0.4`, 'harm'],
    [`track arp role=arp vol=0.35`, 'arp'],
    [`track pad role=${P?.pad ?? 'pad'} vol=0.45`, 'pad'],
    [`track bass role=bass vol=0.75`, 'bass'],
    [`track drums role=drums vol=0.8`, 'drums'],
    [`track cymbals role=drums vol=0.5`, 'cym'],
  ];
  writeSong(out, spec, { T, comment, tracks, style, ts });
}
