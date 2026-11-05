// Per-track levels: plays one song from a point and prints each track's RMS over 4 seconds, to find
// a part that is buried or too loud. Track names are listed in the song file's track order.
//   node tools/browser/tracks.mjs "<title>" <fraction 0-1> <track1,track2,...>
//   node tools/browser/tracks.mjs "Underpass" 0.4 hook,pluck,arp,stabs,pad,acid,sub,drums,perc,cymbals
import { openEdge, DEFAULT_URL, sleep } from './cdp.mjs';
const [title, frac, names] = process.argv.slice(2);
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
await b.ev(`(() => { const e = document.querySelector('#seek'); e.value = String(Math.round(${frac} * 1000)); e.dispatchEvent(new Event('input')); })()`);
const list = names.split(',');
const r = await b.ev(`(async () => {
  const pans = window.__pans.slice(-${list.length});
  const ctx = pans[0].context;
  const an = pans.map(p => { const a = ctx.createAnalyser(); a.fftSize = 2048; p.connect(a); return a; });
  const buf = new Float32Array(2048); const sq = an.map(() => 0); let n = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 4000) { an.forEach((a, i) => { a.getFloatTimeDomainData(buf); for (const x of buf) sq[i] += x * x; }); n += 2048; await new Promise(r => setTimeout(r, 40)); }
  return sq.map(s => (10 * Math.log10(s / n + 1e-12)).toFixed(1));
})()`);
list.forEach((name, i) => console.log(name.padEnd(8), r[i], 'dB'));
b.close();
