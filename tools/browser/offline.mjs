// PWA check: confirms the page is installable, the service worker caches the app, and the app still
// loads and plays with the network switched off.
//   node tools/browser/offline.mjs [url]
// Works on a local `vite preview` or the live site.
import { DEFAULT_URL, openEdge, sleep } from './cdp.mjs';

const [url = DEFAULT_URL] = process.argv.slice(2);
const page = await openEdge();
await page.viewport(412, 760, 2);
await page.goto(url, 2500);

const sw = await page.ev(`navigator.serviceWorker.ready.then((r) => r.active?.state ?? 'none')`);
const cache = await page.ev(`caches.keys().then(async (k) => ({ name: k[0], files: k[0] ? (await (await caches.open(k[0])).keys()).length : 0 }))`);
const install = (await page.send('Page.getInstallabilityErrors')).result.installabilityErrors;
console.log('service worker:', sw);
console.log('cache:', cache.name, `${cache.files} files`);
console.log('installable:', install.length === 0 ? 'yes' : JSON.stringify(install));

await page.send('Network.enable');
await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await page.send('Page.reload', {});
await sleep(2500);
const offline = await page.ev(`({ stations: document.querySelectorAll('.station').length, title: document.querySelector('#title').textContent })`);
await page.ev(`document.querySelector('#play').click()`);
await sleep(1500);
const playing = await page.ev(`document.querySelector('#play').getAttribute('aria-label') === 'Pause'`);
const ok = sw === 'activated' && install.length === 0 && offline.stations > 0 && playing;
console.log(`offline: ${offline.stations} stations, "${offline.title}", playing: ${playing}`);
console.log(ok ? 'ok' : 'FAIL');
await page.close();
process.exit(ok ? 0 : 1);
