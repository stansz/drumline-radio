// Shared helper for the browser checks: drives headless Edge over the Chrome DevTools Protocol with
// Node's built-in WebSocket. No Playwright or Puppeteer needed.
// Edge always runs with --mute-audio, because these checks play music.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Edge on Windows; elsewhere the first Chromium-family browser found (EDGE_PATH overrides both).
const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/microsoft-edge', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
export const EDGE = process.env.EDGE_PATH ?? BROWSERS.find((path) => existsSync(path)) ?? BROWSERS[0];
export const DEFAULT_URL = process.env.RADIO_URL ?? 'http://localhost:4173/drumline-radio/';
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Launches headless Edge on a fresh profile and connects to its first page. */
export async function openEdge({ port = 9400 + Math.floor(Math.random() * 400) } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'radio-edge-'));
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--no-first-run', 'about:blank',
  ], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 50 && !targets; i += 1) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {
      await sleep(200);
    }
  }
  if (!targets) throw new Error(`Edge did not start (${EDGE})`);
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      id += 1;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  /** Evaluates an expression in the page and returns its value (promises are awaited). */
  const ev = async (expression) =>
    (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

  await send('Page.enable');
  await send('Runtime.enable');

  return {
    send,
    ev,
    onEvent: (fn) => listeners.push(fn),
    /** Sets the viewport; widths under 700 emulate a phone. */
    viewport: (width, height, scale = 1) =>
      send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < 700 }),
    goto: async (url, wait = 1500) => {
      await send('Page.navigate', { url });
      await sleep(wait);
    },
    /** Saves a PNG screenshot, optionally clipped to { x, y, width, height }. */
    screenshot: async (path, clip) => {
      const params = { format: 'png' };
      if (clip) params.clip = { ...clip, scale: 1 };
      const shot = await send('Page.captureScreenshot', params);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, Buffer.from(shot.result.data, 'base64'));
    },
    close: () => {
      ws.close();
      edge.kill();
    },
  };
}
