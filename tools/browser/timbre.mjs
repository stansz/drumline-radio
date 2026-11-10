// Timbre check: renders one note per patch offline and prints how many harmonics sit within 30 dB
// of the loudest, the spectral centroid, and the first 12 harmonics in dB. One or two harmonics and
// a low centroid is a near-sine: in a lead's register that reads as a flute.
// Needs the dev server (`npm run dev`), because it imports the audio modules straight from src/.
//   node tools/browser/timbre.mjs <style> <patch,patch,...> [midi note, default 67 = G4] [url]
//   node tools/browser/timbre.mjs lofi soft-flute,radio-lead,dusty-sample
import { openEdge } from './cdp.mjs';

const [style, names, note = '67', url = 'http://localhost:5173/drumline-radio/'] = process.argv.slice(2);
if (!style || !names) {
  console.log('usage: node tools/browser/timbre.mjs <style> <patch,patch,...> [midi note] [url]');
  process.exit(1);
}
const b = await openEdge();
await b.goto(url, 3000);
const base = new URL(url).pathname;
const out = await b.ev(`(async () => {
  const V = await import(${JSON.stringify(base + 'src/audio/voices.ts')});
  const S = await import(${JSON.stringify(base + 'src/audio/styles.ts')});
  const patches = S.STYLE_DEFS[${JSON.stringify(style)}].patches;
  const midi = ${Number(note)};
  const f0 = 440 * 2 ** ((midi - 69) / 12);
  const res = {};
  for (const name of ${JSON.stringify(names.split(','))}) {
    const patch = patches[name];
    if (!patch || patch.kind !== 'synth') { res[name] = null; continue; }
    const ctx = new OfflineAudioContext(1, 48000 * 1.5, 48000);
    V.playSynth(V.createVoiceKit(ctx), patch, midi, 0.02, 1.2, 0.8, ctx.destination);
    const buf = (await ctx.startRendering()).getChannelData(0);
    // Half a second in, past the attack: the sound a held note settles into.
    const start = 24000, N = 8192, mags = [];
    for (let k = 1; k <= 24; k += 1) {
      const w = (2 * Math.PI * k * f0) / 48000;
      let re = 0, im = 0;
      for (let n = 0; n < N; n += 1) {
        const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N);
        re += buf[start + n] * h * Math.cos(w * n);
        im -= buf[start + n] * h * Math.sin(w * n);
      }
      mags.push(Math.hypot(re, im));
    }
    const max = Math.max(...mags);
    const db = mags.map((m) => Math.round(20 * Math.log10(m / max + 1e-9)));
    const centroid = Math.round(mags.reduce((s, m, i) => s + m * (i + 1) * f0, 0) / mags.reduce((s, m) => s + m, 0));
    res[name] = { rich: db.filter((d) => d > -30).length, centroid, first12: db.slice(0, 12).join(' ') };
  }
  return res;
})()`);
for (const [name, v] of Object.entries(out)) {
  if (!v) console.log(name.padEnd(14), 'not a synth patch in this style');
  else console.log(name.padEnd(14), 'harmonics', String(v.rich).padStart(2), ' centroid', String(v.centroid).padStart(5), 'Hz  ', v.first12);
}
await b.close();
