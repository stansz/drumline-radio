// Screenshot: loads the player, optionally presses play and picks a style, and saves a PNG.
// Handy for README images.
//   node tools/browser/shot.mjs [url] [width] [height] [out.png] [style]
import { DEFAULT_URL, openEdge, sleep } from './cdp.mjs';

const [url = DEFAULT_URL, w = '1280', h = '800', out = 'tmp/shot.png', style = ''] = process.argv.slice(2);
const page = await openEdge();
await page.viewport(Number(w), Number(h), 2);
await page.goto(url);
await page.ev(`document.querySelector('#play').click()`);
if (style) await page.ev(`document.querySelector('.band[data-style="${style}"]').click()`);
await sleep(4000); // let the banner fade and the score fill in
await page.screenshot(out);
page.close();
console.log(`saved ${out}`);
