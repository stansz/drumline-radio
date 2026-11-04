// Layout check: loads the player at common phone sizes and desktop, reports vertical or horizontal
// scrolling and clipped controls, and saves a screenshot of each.
//   node tools/browser/layout.mjs [url] [outDir]
import { join } from 'node:path';
import { DEFAULT_URL, openEdge, sleep } from './cdp.mjs';

const [url = DEFAULT_URL, out = 'tmp/layout'] = process.argv.slice(2);
const SIZES = [
  [360, 640, 'android-small'], [375, 553, 'iphone-se-safari'], [390, 664, 'iphone-safari'],
  [412, 760, 'pixel'], [1280, 800, 'desktop'],
];

const page = await openEdge();
for (const [width, height, name] of SIZES) {
  await page.viewport(width, height, 2);
  await page.goto(url);
  await page.ev(`document.querySelector('#play').click()`);
  await sleep(2000);
  const result = await page.ev(`(() => {
    const d = document.documentElement;
    const clipped = [...document.querySelectorAll('.band, .preset, .time, .knob')]
      .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim());
    return { scroll: d.scrollHeight - innerHeight, sideways: d.scrollWidth > d.clientWidth, clipped };
  })()`);
  const ok = result.scroll <= 0 && !result.sideways && result.clipped.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(17)} ${width}x${height}`, ok ? '' : JSON.stringify(result));
  await page.screenshot(join(out, `${name}.png`));
}
page.close();
console.log(`screenshots in ${out}`);
