## Goal

Make Drumline Radio an installable, offline-capable PWA with no new dependencies:

- a web app manifest and icons;
- a hand-written service worker that precaches every built file (its file list is generated at
  build time) and serves cache-first;
- silent updates: a new version takes over the next time the app is opened;
- an Install button that appears only when the browser fires `beforeinstallprompt`.

## Files to touch

- `public/favicon.svg`, `public/icons/icon-192.png`, `public/icons/icon-512.png`,
  `public/icons/icon-maskable-512.png`, `public/icons/apple-touch-icon.png` (copied, new)
- `public/manifest.webmanifest` (new)
- `src/pwa/precache.ts` (new)
- `src/pwa/sw.js` (new)
- `src/pwa/register.ts` (new)
- `src/ui/install.ts` (new)
- `src/main.ts`
- `vite.config.ts`
- `index.html`
- `src/ui/style.css`
- `tests/pwa.test.ts` (new)
- `README.md`, `docs/how-it-works.md`, `AGENTS.md`

## Steps

1. Copy the icons byte for byte (do not regenerate or edit them):
   - `.handoff/icons/favicon.svg` to `public/favicon.svg`
   - `.handoff/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and `apple-touch-icon.png` to
     `public/icons/` with the same names.

2. `public/manifest.webmanifest` (JSON):
   ```json
   {
     "name": "Drumline Radio",
     "short_name": "Drumline Radio",
     "description": "Full songs, arranged and composed by Claude, played live by a browser synth.",
     "id": "./",
     "start_url": "./",
     "scope": "./",
     "display": "standalone",
     "orientation": "any",
     "background_color": "#12002b",
     "theme_color": "#14101f",
     "icons": [
       { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
       { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
       { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
     ]
   }
   ```

3. `src/pwa/precache.ts`. Pure, with no DOM and no Node APIs:
   - `export const CACHE_PREFIX = 'drumline-radio-';`
   - `export function precacheList(bundleFiles: string[], publicFiles: string[]): string[]`. It returns
     `'./'` followed by every file name from both inputs, sorted and de-duplicated. It drops `sw.js`,
     anything ending in `.map`, and anything starting with `.`. Backslashes become `/`. No leading `/`
     or `./` on file names.
   - `export function cacheVersion(list: string[]): string` returns an 8-character lowercase hex
     FNV-1a 32-bit hash of `list.join('\n')`.

4. `src/pwa/sw.js`, plain JavaScript (not TypeScript). It is a template: the build replaces the two
   placeholders `__PRECACHE__` (a JSON array literal) and `__VERSION__` (a JSON string literal).
   - `const PRECACHE = __PRECACHE__; const CACHE = 'drumline-radio-' + __VERSION__;`
   - `install`: `event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))`. Do **not** call
     `skipWaiting`.
   - `activate`: delete every cache whose name starts with `drumline-radio-` and is not `CACHE`.
   - `fetch`: handle only same-origin `GET` requests.
     - For navigation requests (`request.mode === 'navigate'`), respond with
       `caches.match('./', { cacheName: CACHE })`, falling back to `fetch(request)`.
     - Otherwise respond with `caches.match(request, { ignoreSearch: true })`, falling back to
       `fetch(request)`.

5. `vite.config.ts`: add an inline plugin named `drumline-radio-sw` with `apply: 'build'`. In
   `generateBundle(_, bundle)`:
   - read `src/pwa/sw.js` as text;
   - collect `[...Object.keys(bundle), 'index.html']` as the bundle files (Vite 8 has not added
     `index.html` to the bundle at this point), and every file under `public/`, recursively, relative to
     `public/`, as the public files;
   - build `list = precacheList(bundleFiles, publicFiles)` and `version = cacheVersion(list)` (import
     them from `./src/pwa/precache`);
   - replace `__PRECACHE__` with `JSON.stringify(list)` and `__VERSION__` with
     `JSON.stringify(version)`;
   - `this.emitFile({ type: 'asset', fileName: 'sw.js', source })`.

   Keep `base: '/drumline-radio/'`. Use `node:fs` and `node:path` only.

6. `src/pwa/register.ts`: `export function registerServiceWorker(): void`. If
   `import.meta.env.PROD && 'serviceWorker' in navigator`, then on `window` `load`, call
   `navigator.serviceWorker.register(\`${import.meta.env.BASE_URL}sw.js\`)` and swallow rejections with
   `.catch(() => {})`.

7. `src/ui/install.ts`: `export function setupInstall(button: HTMLButtonElement): void`.
   - On `window` `beforeinstallprompt`: call `preventDefault()`, keep the event, and set
     `button.hidden = false`.
   - On button click: if there is a kept event, call its `prompt()`, await `userChoice`, clear it, and set
     `button.hidden = true`.
   - On `window` `appinstalled`: clear the kept event and set `button.hidden = true`.
   - Type the event locally:
     `interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }>; }`.

8. `src/main.ts`: after `startUi()`, call `registerServiceWorker()` and
   `setupInstall(document.querySelector<HTMLButtonElement>('#install')!)`. Guard with an `if`, not `!`,
   if lint or typecheck objects.

9. `index.html`, inside `<head>` after the description meta:
   ```html
   <link rel="manifest" href="%BASE_URL%manifest.webmanifest" />
   <link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
   <link rel="apple-touch-icon" href="%BASE_URL%icons/apple-touch-icon.png" />
   <meta name="apple-mobile-web-app-title" content="Drumline Radio" />
   <meta name="mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="black" />
   ```
   Change `<div class="brand">Drumline <span>Radio</span></div>` to
   `<div class="brand">Drumline <span>Radio</span> <button id="install" class="install" type="button" hidden>Install</button></div>`.

10. `src/ui/style.css`:
    - `.install`: `margin-left: 10px; padding: 2px 8px; border: 1px solid var(--accent); border-radius: 999px; background: transparent; color: var(--accent); font: inherit; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; vertical-align: middle;`
    - `.install[hidden] { display: none; }`

11. `tests/pwa.test.ts`:
    - `precacheList(['assets/a.js', 'index.html', 'assets/a.js.map'], ['icons/x.png', 'sw.js', '.DS_Store', 'icons\\y.png'])`
      equals `['./', 'assets/a.js', 'icons/x.png', 'icons/y.png', 'index.html']`.
    - `cacheVersion` returns the same 8-character hex string for the same list and a different one when
      an entry changes; it matches `/^[0-9a-f]{8}$/`.

12. Docs:
    - `README.md`: a feature bullet `- Installable and works offline: install it from the browser (or the
      Install button where offered; on iPhone, Share → Add to Home Screen). Updates download quietly and
      apply the next time it opens.`
    - `docs/how-it-works.md`: a row in the pieces table, `` | `src/pwa/` | Offline support: the service
      worker template and the build step that lists every file to cache | ``, plus one sentence in "Day to
      day": every deploy changes the cache version, so installed copies update on their next launch.
    - `AGENTS.md`: a rule, `- The service worker (src/pwa/sw.js) precaches every built file, and its list is
      generated in vite.config.ts. Don't hand-edit cache lists. Files in public/ are cached too.`

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0, including `tests/pwa.test.ts`.
- `node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8'))"` exits 0.
- `git diff --no-index --quiet .handoff/icons/icon-512.png public/icons/icon-512.png` exits 0 (repeat for
  the other three PNGs and `favicon.svg`).

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0, and `dist/sw.js` contains no `__PRECACHE__` or `__VERSION__` and does contain
  `index.html` and `icons/icon-512.png`.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- No new dependencies (no vite-plugin-pwa or workbox).
- Keep `src/pwa/precache.ts` free of DOM and Node APIs.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report it.
  Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Any "update available" prompt, `skipWaiting`, or `clients.claim`.
- Other UI changes.
- Changing songs, audio, or styles.

## If blocked

Stop, write what failed and the exact error in `.handoff/report.md`, and do not improvise a different design.
