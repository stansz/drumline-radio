// Late-note check: seeks and changes stations while playing, and records how far ahead every sound
// is booked. A note booked for now or the past starts without its attack and clicks, so "late"
// should be 0 and "min" (seconds) above 0.
//   node tools/browser/late.mjs
import { openEdge, DEFAULT_URL, sleep } from './cdp.mjs';
const b = await openEdge();
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  window.__late = { n: 0, late: 0, min: 1 };
  const start = AudioScheduledSourceNode.prototype.start;
  AudioScheduledSourceNode.prototype.start = function (when = 0, ...rest) {
    const lead = when - this.context.currentTime;
    const s = window.__late; s.n++; if (lead < 0) s.late++; if (lead < s.min) s.min = lead;
    return start.call(this, when, ...rest);
  };
})()` });
await b.goto(DEFAULT_URL, 2500);
const pick = (t) => b.ev(`(() => { const s = [...document.querySelectorAll('.station')]; s.find(x => x.querySelector('.station-title').textContent === ${JSON.stringify(t)}).click(); })()`);
const seek = (f) => b.ev(`(() => { const e = document.querySelector('#seek'); e.value = String(Math.round(${f} * 1000)); e.dispatchEvent(new Event('input')); })()`);
await pick('Silent Night'); await sleep(300);
await b.ev(`document.querySelector('#play').click()`); await sleep(1500);
await b.ev('window.__late = { n: 0, late: 0, min: 1 }');
for (const f of [0.3, 0.6, 0.47, 0.8, 0.2]) { await seek(f); await sleep(600); }
for (const t of ['Greensleeves', 'Underpass', 'Für Elise', 'Last Stop']) { await pick(t); await sleep(800); }
console.log(JSON.stringify(await b.ev('window.__late')));
b.close();
