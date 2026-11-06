// Reference analyser: reads a MIDI file and prints the groove numbers worth copying — swing, where
// the kicks and snares actually land, velocity tiers, density, register and repetition.
// Use it on a beat you like, then write the same numbers into a .song.
//   node tools/analysis/reference.mjs beat.mid
//   node tools/analysis/reference.mjs beat.mid --time 4/4 --grid 120 --json out.json
import { writeFileSync } from 'node:fs';
import { readMidi, quantise, splitVoices, nm } from '../midi/midi2song.mjs';

const args = process.argv.slice(2);
const file = args[0];
if (!file) {
  console.error('usage: node tools/analysis/reference.mjs <file.mid> [--time 4/4] [--grid 120] [--json out.json]');
  process.exit(1);
}
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? dflt : args[i + 1];
};
const grid = Number(opt('grid', 120));
const [tn, td] = String(opt('time', '4/4')).split('/').map(Number);
const barTicks = (tn * 3840) / td;
const PERCUSSION = new Set([35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 57, 59]);
const DRUM_NAMES = { 36: 'kick', 37: 'rim', 38: 'snare', 39: 'clap', 41: 'tom', 42: 'hat', 43: 'tom', 44: 'hat', 45: 'tom', 46: 'openhat', 47: 'tom', 48: 'tom', 49: 'crash', 50: 'tom', 51: 'ride', 52: 'crash', 53: 'ride', 57: 'crash', 59: 'ride' };

const { tracks, meta } = readMidi(file);
if (!tracks.length) {
  console.error('no notes in', file);
  process.exit(1);
}
const allStarts = tracks.flatMap((t) => t.notes.map((n) => n.start));
const lastEnd = Math.max(...tracks.flatMap((t) => t.notes.map((n) => n.end)));
const bars = Math.ceil(lastEnd / barTicks);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sd = (xs) => (xs.length < 2 ? 0 : Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2))));

const report = {
  file,
  format: meta.format,
  division: meta.division,
  bars,
  time: `${tn}/${td}`,
  tempos: meta.tempos,
  times: meta.times,
  tracks: [],
  swing: null,
  velocityTiers: null,
};

// --- swing: where do the notes that are not on an eighth actually sit? -------------------------
// A straight sixteenth sits at 240 of a 480-tick eighth; a fully swung one sits near 320 (2/3).
const offSixteenths = allStarts.map((s) => ((s % 480) + 480) % 480).filter((p) => p >= 120 && p <= 440);
const onEighths = allStarts.filter((s) => {
  const p = ((s % 480) + 480) % 480;
  return p < 60 || p > 420;
}).length;
if (offSixteenths.length >= 8) {
  const m = median(offSixteenths);
  report.swing = {
    offSixteenthMedian: Math.round(m),
    swingPercent: Math.round((m / 480) * 100),
    offSixteenthCount: offSixteenths.length,
    onEighthCount: onEighths,
    verdict: m < 200 ? 'pushed ahead of the grid' : m < 280 ? 'straight' : m < 340 ? 'swung (about 2:1)' : 'heavily swung',
  };
}

// --- velocity tiers -----------------------------------------------------------------------------
const allVel = tracks.flatMap((t) => t.notes.map((n) => n.vel));
report.velocityTiers = {
  main: Math.round((100 * allVel.filter((v) => v >= 90).length) / allVel.length),
  accent: Math.round((100 * allVel.filter((v) => v >= 60 && v < 90).length) / allVel.length),
  ghost: Math.round((100 * allVel.filter((v) => v < 60).length) / allVel.length),
  mean: Math.round(mean(allVel)),
};

// --- per track + per voice ----------------------------------------------------------------------
for (const tr of tracks) {
  const pitches = tr.notes.map((n) => n.pitch);
  const percShare = pitches.filter((p) => PERCUSSION.has(p)).length / pitches.length;
  const isPerc = percShare >= 0.6 && tr.notes.length >= 8;
  const q = quantise(tr.notes, grid);
  const voices = splitVoices(q.events);
  const entry = {
    track: tr.index,
    notes: tr.notes.length,
    percussion: isPerc,
    density: +(tr.notes.length / bars).toFixed(2),
    low: nm(Math.min(...pitches)),
    high: nm(Math.max(...pitches)),
    velMean: Math.round(mean(tr.notes.map((n) => n.vel))),
    velSd: Math.round(sd(tr.notes.map((n) => n.vel))),
    voices: voices.length,
    movedByQuantise: q.moved,
  };

  // Repetition: how many distinct bar contents this track has. Low = a loop, high = through-written.
  const sig = new Map();
  for (const n of tr.notes) {
    const b = Math.floor(n.start / barTicks);
    if (!sig.has(b)) sig.set(b, []);
    sig.get(b).push(`${Math.round(n.start - b * barTicks)}:${n.pitch}/${Math.round(n.end - n.start)}/${n.vel}`);
  }
  entry.loopBars = sig.size;
  entry.uniqueBars = new Set([...sig.values()].map((v) => v.join(' '))).size;

  // Drum grid: each drum's hit positions inside the bar, counted in beats from the bar line
  // (0.00, 1.00, 2.00, 3.00 are the four beats; 0.33 and 0.83 are swung sixteenths). Straight
  // 16th slots would round swung notes to the wrong place, so beat positions are used instead.
  if (isPerc) {
    const perDrum = new Map();
    for (const n of tr.notes) {
      const name = DRUM_NAMES[n.pitch];
      if (!name) continue;
      const beats = ((n.start % barTicks) + barTicks) % barTicks / (barTicks / tn);
      if (!perDrum.has(name)) perDrum.set(name, new Set());
      perDrum.get(name).add(Math.round(beats * 100) / 100);
    }
    entry.grid = [...perDrum.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, s]) => `${name.padEnd(7)} ${[...s].sort((a, b) => a - b).map((f) => f.toFixed(2)).join(', ')}`);
  }
  report.tracks.push(entry);
}

// --- print --------------------------------------------------------------------------------------
const out = [];
out.push(`${file}`);
out.push(
  `format ${meta.format}, division ${meta.division}, ${tracks.length} note tracks, ${bars} bars of ${tn}/${td}, ` +
    `tempos ${meta.tempos.map((t) => `${t.bpm.toFixed(0)}`).join('/') || '—'}`,
);
out.push('');
out.push('track  notes  density  range        vel mean±sd  voices  unique bars  kind');
for (const t of report.tracks) {
  out.push(
    `${String(t.track).padEnd(6)} ${String(t.notes).padStart(5)}  ${t.density.toFixed(2).padStart(7)}  ` +
      `${(t.low + '-' + t.high).padEnd(12)} ${String(t.velMean).padStart(4)}±${String(t.velSd).padEnd(3)}   ` +
      `${String(t.voices).padStart(6)}  ${String(t.uniqueBars).padStart(11)}  ${t.percussion ? 'percussion' : 'pitched'}`,
  );
}
if (report.swing) {
  out.push('');
  out.push(
    `swing: off-16ths median ${report.swing.offSixteenthMedian}/480 = ${report.swing.swingPercent}% — ${report.swing.verdict} ` +
      `(${report.swing.offSixteenthCount} off-grid notes, ${report.swing.onEighthCount} on the eighth)`,
  );
}
out.push(
  `velocity: main ${report.velocityTiers.main}%, accent ${report.velocityTiers.accent}%, ghost ${report.velocityTiers.ghost}% ` +
    `(mean ${report.velocityTiers.mean})`,
);
out.push('');
for (const t of report.tracks.filter((x) => x.percussion)) {
  out.push(`drums (track ${t.track}), hit positions in beats from the bar line:`);
  for (const g of t.grid) out.push(`  ${g}`);
  out.push('  (0.00 1.00 2.00 3.00 are the four beats · 0.33 and 0.83 swung sixteenths · 0.50 the eighth · 0.25 and 0.75 straight sixteenths)');
  out.push('');
}
console.log(out.join('\n'));

const json = opt('json', null);
if (json) writeFileSync(json, JSON.stringify(report, null, 2));
