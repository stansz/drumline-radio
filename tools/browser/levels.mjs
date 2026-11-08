// Patch levels: renders the same four-note phrase (root, third, fifth, octave, at velocity 90) on
// each bank patch offline and prints its RMS and peak, so a new patch can be level-matched to the one
// it replaces before a style swaps it in. Match RMS within about 1 dB; for a plucked or struck patch
// that rings out, RMS reads low, so split the difference with the peak instead of matching RMS.
// Needs the dev server (`npm run dev`), because it imports the audio modules straight from src/.
//   node tools/browser/levels.mjs <bank-id:midi,bank-id:midi,...> [url]
//   node tools/browser/levels.mjs harp:60,concert-harp:60,upright-bass:40,string-bass:40
import { openEdge } from './cdp.mjs';

const [list, url = 'http://localhost:5173/drumline-radio/'] = process.argv.slice(2);
if (!list) {
  console.log('usage: node tools/browser/levels.mjs <bank-id:midi,...> [url]');
  process.exit(1);
}
const b = await openEdge();
await b.goto(url, 3000);
const base = new URL(url).pathname;
const out = await b.ev(`(async () => {
  const V = await import(${JSON.stringify(base + 'src/audio/voices.ts')});
  const I = await import(${JSON.stringify(base + 'src/audio/instruments.ts')});
  const C = await import(${JSON.stringify(base + 'src/audio/curves.ts')});
  const res = {};
  for (const item of ${JSON.stringify(list.split(','))}) {
    const [id, m = '60'] = item.split(':');
    const patch = I.INSTRUMENTS[id];
    if (!patch || patch.kind !== 'synth') { res[item] = null; continue; }
    const midi = Number(m);
    const rate = 48000;
    const ctx = new OfflineAudioContext(1, rate * 3, rate);
    const kit = V.createVoiceKit(ctx);
    const velocity = 90;
    [0, 4, 7, 12].forEach((step, i) =>
      V.playSynth(kit, patch, midi + step, 0.02 + i * 0.5, 0.45, C.noteGain(patch.gain, velocity, 1), ctx.destination, [], velocity));
    const buf = (await ctx.startRendering()).getChannelData(0);
    let sq = 0, peak = 0;
    const n = rate * 2;
    for (let i = 0; i < n; i += 1) { sq += buf[i] * buf[i]; peak = Math.max(peak, Math.abs(buf[i])); }
    res[item] = { rms: (10 * Math.log10(sq / n + 1e-12)).toFixed(1), peak: (20 * Math.log10(peak + 1e-6)).toFixed(1) };
  }
  return res;
})()`);
for (const [k, v] of Object.entries(out)) {
  if (!v) console.log(k.padEnd(22), 'not a synth patch in the bank');
  else console.log(k.padEnd(22), 'rms', v.rms.padStart(6), 'dB   peak', v.peak.padStart(6), 'dB');
}
b.close();
