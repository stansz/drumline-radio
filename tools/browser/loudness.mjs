// Loudness check: plays every song at 20%, 50%, and 85% of the way through and measures the
// output (peak, RMS, how hard the compressor and limiter work, and the share of energy above 4 kHz).
// Healthy songs sit around -10 to -16 dB RMS with almost nothing over 0.9 into the limiter.
//   node tools/browser/loudness.mjs [url] [secondsPerWindow] [style] [titleFilter]
// Pass a style (e.g. lofi) to remix every song into it first ('' keeps each song's own style).
// Pass a title filter (case-insensitive regex, e.g. 'underpass|night shift') to check only those songs.
import { DEFAULT_URL, openEdge, sleep } from './cdp.mjs';

const [urlArg = '', secondsArg = '3', style = '', filterArg = ''] = process.argv.slice(2);
const url = urlArg || DEFAULT_URL;
const only = filterArg ? new RegExp(filterArg, 'i') : null;
const windowSec = Number(secondsArg);

// Taps the master output and the limiter with analysers as the app builds its audio graph.
const HOOK = `(() => {
  const A = window.__audio = { comps: [], out: null, lim: null, stats: null };
  const Orig = window.AudioContext;
  window.AudioContext = class extends Orig {
    constructor(...a) { super(...a); A.ctx = this; }
    createDynamicsCompressor() { const c = super.createDynamicsCompressor(); A.comps.push(c); return c; }
  };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode && !A.out) {
      const an = this.context.createAnalyser(); an.fftSize = 16384; connect.call(this, an); A.out = an;
      const lim = A.comps[1]; if (lim) { const l = this.context.createAnalyser(); l.fftSize = 16384; connect.call(lim, l); A.lim = l; }
    }
    return connect.call(this, dest, ...rest);
  };
  A.reset = () => { A.stats = { hf: 0, all: 0, peak: 0, sq: 0, n: 0, hot: 0, compRed: 0, limRed: 0 }; };
  A.reset();
  const buf = new Float32Array(16384), lbuf = new Float32Array(16384), fbuf = new Float32Array(8192);
  setInterval(() => {
    if (!A.out) return; const s = A.stats;
    A.out.getFloatTimeDomainData(buf);
    for (const x of buf) { const a = Math.abs(x); if (a > s.peak) s.peak = a; s.sq += x * x; s.n++; }
    A.out.getFloatFrequencyData(fbuf); const hz = A.ctx.sampleRate / 16384;
    for (let i = 1; i < fbuf.length; i++) { const p = 10 ** (fbuf[i] / 10); s.all += p; if (i * hz > 4000) s.hf += p; }
    if (A.lim) { A.lim.getFloatTimeDomainData(lbuf); for (const x of lbuf) if (Math.abs(x) > 0.9) s.hot++; }
    s.compRed = Math.min(s.compRed, A.comps[0]?.reduction ?? 0); s.limRed = Math.min(s.limRed, A.comps[1]?.reduction ?? 0);
  }, 300);
})();`;

const page = await openEdge();
await page.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
await page.viewport(1280, 800);
await page.goto(url);
const titles = await page.ev(`[...document.querySelectorAll('.station .station-title')].map((t) => t.textContent)`);
const db = (x) => (20 * Math.log10(Math.max(x, 1e-9))).toFixed(1).padStart(6);
console.log('song'.padEnd(34), ' at   peak    rms  >0.9%  comp   lim  hf>4k%');
for (let i = 0; i < titles.length; i += 1) {
  if (only && !only.test(titles[i])) continue;
  await page.ev(`document.querySelectorAll('.station')[${i}].click()`);
  await sleep(600);
  await page.ev(`(() => { const p = document.querySelector('#play'); if (p.getAttribute('aria-label') === 'Play') p.click(); })()`);
  await sleep(600);
  if (style) {
    await page.ev(`document.querySelector('.band[data-style="${style}"]').click()`);
    await sleep(400);
  }
  for (const frac of [0.2, 0.5, 0.85]) {
    await page.ev(`(() => { const s = document.querySelector('#seek'); s.value = ${Math.round(frac * 1000)}; s.dispatchEvent(new Event('input')); })()`);
    await sleep(500);
    await page.ev('window.__audio.reset()');
    await sleep(windowSec * 1000);
    const s = await page.ev('window.__audio.stats');
    console.log(
      titles[i].slice(0, 33).padEnd(34), String(frac).padEnd(4), db(s.peak), db(Math.sqrt(s.sq / Math.max(1, s.n))),
      ((100 * s.hot) / Math.max(1, s.n)).toFixed(2).padStart(6), s.compRed.toFixed(1).padStart(5),
      s.limRed.toFixed(1).padStart(5), ((100 * s.hf) / Math.max(1e-12, s.all)).toFixed(1).padStart(7),
    );
  }
}
await page.close();
