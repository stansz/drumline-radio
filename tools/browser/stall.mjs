// Stall check: plays a busy song, blocks the main thread for 1.5 s (like a long task or a throttled
// background timer), and counts sounds booked in the past afterwards. Only notes up to 0.3 s late
// may play late ("min" no lower than -0.3); the rest of the gap is skipped, so there is no burst.
// "n" shows booking carried on after the stall.
//   node tools/browser/stall.mjs [url]
import { openEdge, DEFAULT_URL, sleep } from './cdp.mjs';
const [url = DEFAULT_URL] = process.argv.slice(2);
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
await b.goto(url, 2500);
await b.ev(`(() => { const s = [...document.querySelectorAll('.station')]; s.find(x => x.querySelector('.station-title').textContent === 'Underpass').click(); })()`);
await sleep(300);
await b.ev(`document.querySelector('#play').click()`);
await sleep(2000);
await b.ev('window.__late = { n: 0, late: 0, min: 1 }');
await b.ev('(() => { const t = performance.now(); while (performance.now() - t < 1500) {} })()');
await sleep(1000);
console.log(JSON.stringify(await b.ev('window.__late')));
await b.close();
