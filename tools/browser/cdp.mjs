// Shared helper for the browser checks: drives headless Edge over the Chrome DevTools Protocol with
// Node's built-in WebSocket. No Playwright or Puppeteer needed.
// Edge always runs with --mute-audio, because these checks play music.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

const WINDOWS = process.platform === 'win32';
const PREFIX = 'radio-edge-';
/** Written into each profile: the process ID of the check that owns it. */
const OWNER = 'radio-check.pid';

// Every Edge still open. If a check crashes or is stopped before it calls close(), these handlers
// close them, so no Edge keeps running and no profile is left in the temp folder.
const open = new Set();
const bail = async (code, err) => {
  if (err) console.error(err);
  await Promise.allSettled([...open].map((quit) => quit()));
  process.exit(code);
};
process.once('uncaughtException', (err) => bail(1, err));
process.once('unhandledRejection', (err) => bail(1, err));
process.once('SIGINT', () => bail(130));
process.once('SIGTERM', () => bail(143));

/** Is process `pid` running? */
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

/**
 * Deletes profiles that earlier runs left in the temp folder. A profile is kept while the check
 * that owns it is still running; one with no owner file is kept only while under a minute old.
 */
function sweepOldProfiles() {
  const root = tmpdir();
  let removed = 0;
  for (const name of readdirSync(root)) {
    if (!name.startsWith(PREFIX)) continue;
    const dir = join(root, name);
    try {
      const owner = Number(readFileSync(join(dir, OWNER), 'utf8'));
      if (owner > 0 && alive(owner)) continue;
    } catch {
      try {
        if (Date.now() - statSync(dir).mtimeMs < 60_000) continue;
      } catch {
        continue;
      }
    }
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      removed += 1;
    } catch {
      // Still locked, perhaps by a browser that outlived its check; the next sweep tries again.
    }
  }
  if (removed > 0) console.log(`removed ${removed} old browser profile(s) from ${root}`);
}

/**
 * Stops the browser and every process it started. Chromium runs helper processes (and Fedora's
 * launcher two more), and they keep writing into the profile after the main process exits, so
 * deleting the profile right after killing only the main process fails.
 */
async function stopBrowser(child) {
  if (!child.pid) return;
  if (WINDOWS) {
    spawnSync('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' });
    return;
  }
  // The browser leads its own process group (detached), so -pid reaches all of it.
  const signal = (name) => {
    try {
      process.kill(-child.pid, name);
      return true;
    } catch {
      return false;
    }
  };
  for (const [name, tries] of [['SIGTERM', 50], ['SIGKILL', 20]]) {
    if (!signal(name)) return;
    for (let i = 0; i < tries; i += 1) {
      await sleep(100);
      if (!signal(0)) return;
    }
  }
}

/** Launches headless Edge on a fresh profile and connects to its first page. */
export async function openEdge({ port = 9400 + Math.floor(Math.random() * 400) } = {}) {
  sweepOldProfiles();
  const profile = mkdtempSync(join(tmpdir(), PREFIX));
  writeFileSync(join(profile, OWNER), String(process.pid));
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--no-first-run', 'about:blank',
  ], {
    stdio: 'ignore',
    detached: !WINDOWS,
    // Chromium's own temp folders on Linux go inside the profile, so they are deleted with it.
    env: { ...process.env, TMPDIR: profile },
  });
  // Each profile is about 30 MB; delete it once every browser process has exited.
  const exited = new Promise((resolve) => {
    edge.once('exit', resolve);
    edge.once('error', resolve);
  });
  const quit = async () => {
    open.delete(quit);
    await stopBrowser(edge);
    await exited;
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  };
  open.add(quit);

  let targets;
  for (let i = 0; i < 50 && !targets; i += 1) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {
      await sleep(200);
    }
  }
  if (!targets) {
    await quit();
    throw new Error(`Edge did not start (${EDGE})`);
  }
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
    /** Stops Edge and deletes its profile; await it before process.exit(). */
    close: async () => {
      ws.close();
      await quit();
    },
  };
}
