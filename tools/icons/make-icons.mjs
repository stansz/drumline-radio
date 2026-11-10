// App icon: draws the tuner-dial icon as SVG and renders the PNG sizes the PWA needs with headless
// Edge. It writes public/favicon.svg and public/icons/*.png. Tweak the colours or shapes below and
// rerun.
//   node tools/icons/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { openEdge } from '../browser/cdp.mjs';

const BG_INNER = '#3a0d63';
const BG_OUTER = '#12002b';
const TICKS = '#2de2e6';
const NEEDLE = '#ff4fa3';

function iconSvg(rounded) {
  const cx = 256, cy = 330, r = 150;
  const pt = (deg, radius) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [(cx + radius * Math.cos(t)).toFixed(1), (cy + radius * Math.sin(t)).toFixed(1)];
  };
  let ticks = '';
  for (let a = -60; a <= 60; a += 10) {
    const big = a % 30 === 0;
    const [x1, y1] = pt(a, r - (big ? 28 : 16));
    const [x2, y2] = pt(a, r);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${TICKS}" stroke-width="${big ? 9 : 6}" stroke-linecap="round" opacity="${big ? 1 : 0.75}"/>`;
  }
  const [ax, ay] = pt(-60, r + 18);
  const [bx, by] = pt(60, r + 18);
  const [nx, ny] = pt(18, r + 22);
  // A maskable icon fills the square edge to edge; Android crops it to its own shape.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${BG_INNER}"/><stop offset="1" stop-color="${BG_OUTER}"/></radialGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="url(#bg)"/>
<path d="M ${ax} ${ay} A ${r + 18} ${r + 18} 0 0 1 ${bx} ${by}" fill="none" stroke="${NEEDLE}" stroke-width="5" opacity="0.45"/>
<g filter="url(#glow)">${ticks}</g>
<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${NEEDLE}" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>
<circle cx="${cx}" cy="${cy}" r="24" fill="${NEEDLE}" filter="url(#glow)"/>
<circle cx="${cx}" cy="${cy}" r="10" fill="${BG_OUTER}"/>
<g fill="${TICKS}" opacity="0.9"><rect x="196" y="384" width="20" height="26" rx="4"/><rect x="226" y="372" width="20" height="38" rx="4"/><rect x="256" y="360" width="20" height="50" rx="4" fill="${NEEDLE}"/><rect x="286" y="376" width="20" height="34" rx="4"/></g>
</svg>
`;
}

const rounded = iconSvg(true);
const full = iconSvg(false);
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/favicon.svg', rounded);

const page = await openEdge();
await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const [svg, size, file] of [
  [rounded, 192, 'icon-192.png'],
  [rounded, 512, 'icon-512.png'],
  [full, 512, 'icon-maskable-512.png'],
  [full, 180, 'apple-touch-icon.png'],
]) {
  const html = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`;
  await page.viewport(size, size);
  await page.goto(`data:text/html;base64,${Buffer.from(html).toString('base64')}`, 500);
  await page.screenshot(`public/icons/${file}`, { x: 0, y: 0, width: size, height: size });
  console.log(`public/icons/${file}`);
}
await page.close();
