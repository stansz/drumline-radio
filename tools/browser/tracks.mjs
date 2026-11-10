// Per-track levels: plays one song from a point and prints each track's RMS over 4 seconds, to find
// a part that is buried or too loud. "low" is the level below 150 Hz: comparing the bass's low level
// with the drums' low level shows whether the bass sits under the kick (the kick is what fills the
// drums track's low band). "peak" is the loudest moment: for sparse parts (a stab every few beats)
// RMS reads low because most of the window is silence, so compare their peaks instead. A note that
// started before the seek point is not heard (see docs), so seek to just before a long held note.
// Track names are listed in the song file's track order.
//   node tools/browser/tracks.mjs "<title>" <fraction 0-1> <track1,track2,...> [style]
//   node tools/browser/tracks.mjs "Underpass" 0.4 hook,pluck,arp,stabs,pad,acid,sub,drums,perc,cymbals
import { openEdge, DEFAULT_URL, sleep } from './cdp.mjs';
const [title, frac, names, style = ''] = process.argv.slice(2);
const b = await openEdge();
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.__pans = [];
  const orig = AudioContext.prototype.createStereoPanner;
  AudioContext.prototype.createStereoPanner = function () { const p = orig.call(this); window.__pans.push(p); return p; };
})()` });
await b.goto(DEFAULT_URL, 2500);
await b.ev(`(() => { const s = [...document.querySelectorAll('.station')]; const i = s.findIndex(x => x.querySelector('.station-title').textContent === ${JSON.stringify(title)}); s[i].click(); })()`);
await sleep(500);
await b.ev(`document.querySelector('#play').click()`); await sleep(800);
if (style) await b.ev(`document.querySelector('.band[data-style=${style}]').click()`);
await b.ev(`(() => { const e = document.querySelector('#seek'); e.value = String(Math.round(${frac} * 1000)); e.dispatchEvent(new Event('input')); })()`);
const list = names.split(',');
const r = await b.ev(`(async () => {
  const pans = window.__pans.slice(-${list.length});
  const ctx = pans[0].context;
  const an = []; const low = []; const sq = []; const sqLow = []; const peaks = [];
  for (const p of pans) {
    const a = ctx.createAnalyser(); a.fftSize = 2048; p.connect(a); an.push(a);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 150; f.Q.value = 0.7;
    const l = ctx.createAnalyser(); l.fftSize = 2048; p.connect(f); f.connect(l); low.push(l);
    sq.push(0); sqLow.push(0); peaks.push(0);
  }
  const buf = new Float32Array(2048); let n = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 4000) {
    an.forEach((a, i) => { a.getFloatTimeDomainData(buf); for (const x of buf) { sq[i] += x * x; peaks[i] = Math.max(peaks[i], Math.abs(x)); } });
    low.forEach((a, i) => { a.getFloatTimeDomainData(buf); for (const x of buf) sqLow[i] += x * x; });
    n += 2048; await new Promise(r => setTimeout(r, 40));
  }
  const db = (s) => (10 * Math.log10(s / n + 1e-12)).toFixed(1);
  return { dB: sq.map(db), low: sqLow.map(db), peak: peaks.map((p) => (20 * Math.log10(p + 1e-6)).toFixed(1)) };
})()`);
list.forEach((name, i) => console.log(name.padEnd(8), r.dB[i], 'dB   low', r.low[i], 'dB   peak', r.peak[i], 'dB'));
await b.close();
