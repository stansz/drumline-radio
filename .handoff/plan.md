## Goal

Add an ⓘ info panel with a short note on why playback stops in the background, plus two
battery-friendly ways to keep listening with the app open:

- **Dim view:** a dark overlay over the player; the player stays visible and usable.
- **Black screensaver:** a full-screen black overlay with a faint, slowly drifting title and time;
  tap anywhere to exit. It can auto-start after 1 or 5 minutes without a touch while music plays.

While music plays with dim or the screensaver on, a Screen Wake Lock keeps the phone from locking.
Settings are remembered.

## Files to touch

- `index.html`
- `src/ui/style.css`
- `src/ui/ui.ts`
- `src/ui/view.ts`
- `src/ui/saver.ts` (new)
- `src/ui/wake.ts` (new)
- `tests/view.test.ts`
- `README.md`, `docs/how-it-works.md`

## Steps

1. `src/ui/view.ts`. Add pure helpers (no DOM):
   - `export type SaverMinutes = 0 | 1 | 5;` and `export const SAVER_OPTIONS: SaverMinutes[] = [0, 1, 5];`
   - `export function parseSaverMinutes(stored: string | null): SaverMinutes` returns `0`, `1`, or `5`
     when `stored` is `'0'`, `'1'`, or `'5'`; anything else gives `5`.
   - `export function shouldStartSaver(idleMs: number, minutes: SaverMinutes, playing: boolean, blocked: boolean): boolean`
     returns `playing && !blocked && minutes > 0 && idleMs >= minutes * 60000`.
   - `export function driftPosition(rx: number, ry: number, areaW: number, areaH: number, boxW: number, boxH: number): { x: number; y: number }`.
     `rx` and `ry` are in [0, 1). It returns `x = Math.round(rx * Math.max(0, areaW - boxW))`, and `y`
     the same with `ry`, `areaH`, and `boxH`.

2. `index.html`:
   - In `.brand`, after the install button, add
     `<button id="info" class="info-btn" type="button" aria-label="Info and screensaver" title="Info and screensaver">ⓘ</button>`.
   - Directly inside `<body>`, right after the closing `</div>` of `#app`, add:
   ```html
   <div id="dim" class="dim-overlay" hidden></div>
   <div id="screensaver" class="screensaver" hidden>
     <div id="saver-box" class="saver-box">
       <div id="saver-title" class="saver-title"></div>
       <div id="saver-time" class="saver-time"></div>
     </div>
   </div>
   <dialog id="info-panel" class="info-panel" aria-labelledby="info-heading">
     <h2 id="info-heading">Drumline Radio</h2>
     <p>Every note is built live by your browser's synth: there are no recordings. Phones pause live
       synths when an app is minimized or the screen locks, so keep Drumline Radio open while you
       listen.</p>
     <p>To save battery while it plays, dim the player or start the black screensaver. While music
       plays with either one on, your screen stays awake.</p>
     <div class="info-row">
       <button id="dim-toggle" class="info-action" type="button" aria-pressed="false">Dim view</button>
       <button id="saver-start" class="info-action" type="button">Start screensaver</button>
     </div>
     <div class="info-label" id="saver-auto-label">Screensaver starts after no touches for</div>
     <div id="saver-auto" class="info-row" role="radiogroup" aria-labelledby="saver-auto-label"></div>
     <div class="info-label">Keyboard</div>
     <p class="info-keys">Space play/pause · ←/→ station · 1–4 style · C category · M mute · R repeat ·
       S screensaver</p>
     <button id="info-close" class="info-action info-close" type="button">Close</button>
   </dialog>
   ```

3. `src/ui/wake.ts` (new): `export function createWakeLock(): { set(wanted: boolean): void }`.
   - It keeps a `wanted` flag and a held `WakeLockSentinel | null`.
   - `set(true)` requests `navigator.wakeLock.request('screen')` when it is supported, the page is
     visible, and no lock is held. On release, clear the held lock.
   - `set(false)` releases the held lock.
   - On `document` `visibilitychange` to visible, if `wanted` and no lock is held, request again.
   - Wrap every call in `try`/`catch` or `.catch(() => {})`. When `'wakeLock' in navigator` is false,
     everything does nothing.

4. `src/ui/saver.ts` (new):
   `export function createSaver(overlay: HTMLElement, box: HTMLElement, titleEl: HTMLElement, timeEl: HTMLElement, onExit: () => void)`
   returns `{ show(): void; hide(): void; readonly visible: boolean; update(title: string, time: string): void }`.
   - `show()` sets `overlay.hidden = false`, moves the box straight away, and starts a 20 s
     `setInterval` that moves the box to `driftPosition(Math.random(), Math.random(), innerWidth, innerHeight, box.offsetWidth, box.offsetHeight)`
     with `box.style.transform = translate(xpx, ypx)`.
   - `hide()` sets `overlay.hidden = true` and clears the interval.
   - `pointerdown` and `click` on the overlay call `hide()` then `onExit()`. Call `event.preventDefault()`
     on `pointerdown`, so the tap does not reach the player underneath.
   - `update(title, time)` sets the two texts only when they changed.

5. `src/ui/ui.ts`:
   - Keys `drumline-radio-dim` (`'1'`/`'0'`) and `drumline-radio-saver` (`'0'`/`'1'`/`'5'`), read and
     written with the existing `load`/`save`, using `parseSaverMinutes`.
   - Wire `#info` to `infoPanel.showModal()`, and `#info-close` to `infoPanel.close()`.
   - `#dim-toggle` toggles `dim`, saves it, sets `#dim`'s `hidden = !dim`, and sets `aria-pressed`.
     Apply the stored value on startup.
   - `#saver-start` closes the panel and calls `saver.show()`.
   - Build three radio buttons in `#saver-auto`, one per `SAVER_OPTIONS` entry, labelled `Off`,
     `1 min`, and `5 min`, with class `info-choice`, `role="radio"`, and `aria-checked`. A click sets and
     saves the choice.
   - Idle tracking: `let lastInteraction = performance.now()`, updated on `document` `pointerdown` and
     `keydown` (capture phase).
   - In `frame()`, if
     `shouldStartSaver(performance.now() - lastInteraction, saverMinutes, engine?.playing ?? false, saver.visible || infoPanel.open)`
     returns true, call `saver.show()`.
   - While `saver.visible`: skip `score.draw` and `meters.draw` in `frame()`, to save power. Call
     `saver.update(currentTitle, formatTime(position))` instead. Keep everything else, such as the
     seek bar and times, as now.
   - The `onExit` of `createSaver` sets `lastInteraction = performance.now()`.
   - Keyboard, in the existing global handler:
     - when `saver.visible`, any key hides it and does nothing else, so return early;
     - `s`/`S` shows the screensaver;
     - while `infoPanel.open`, ignore all shortcuts except the dialog's own Escape, so return early.
   - Wake lock: `const wake = createWakeLock()`. At the end of `updatePlayButton()`, call
     `wake.set((engine?.playing ?? false) && (dim || saver.visible))`. Also call `updatePlayButton()`
     right after changing dim and after the screensaver shows or hides.

6. `src/ui/style.css`:
   - `.info-btn`: a round 22px button in the brand line: `margin-left: 8px; width: 22px; height: 22px;
     border-radius: 50%; border: 1px solid var(--muted); background: transparent; color: var(--muted);
     font: inherit; font-size: 13px; line-height: 1; cursor: pointer; vertical-align: middle;`
   - `.dim-overlay`: `position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); pointer-events: none;
     z-index: 50;` and `.dim-overlay[hidden] { display: none; }`
   - `.screensaver`: `position: fixed; inset: 0; background: #000; z-index: 100; cursor: none;` and
     `.screensaver[hidden] { display: none; }`
   - `.saver-box`: `position: absolute; top: 0; left: 0; padding: 16px; color: var(--accent); opacity:
     0.35; font-family: var(--readout-font); transition: transform 2s ease;` `.saver-title { font-size: 22px; }` `.saver-time { font-size: 16px;
     margin-top: 4px; }`
   - `.info-panel`: `max-width: min(92vw, 420px); padding: 20px; border: 1px solid var(--accent);
     border-radius: 12px; background: #0b0812; color: inherit; font: inherit; font-size: 14px;
     line-height: 1.45;` and `.info-panel::backdrop { background: rgba(0, 0, 0, 0.6); }`. `h2` uses
     `font-size: 16px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent);
     margin: 0 0 10px;`
   - `.info-row { display: flex; gap: 8px; margin: 10px 0; }`. `.info-action` and `.info-choice` reuse
     the `.band` look (dark inset button, muted text, uppercase, 11px), with `flex: 1; padding: 8px;`.
     `.info-action[aria-pressed='true']` and `.info-choice[aria-checked='true']` use the same accent
     border, colour, and glow as `.band[aria-checked='true']`.
   - `.info-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-top: 12px; }`,
     `.info-keys { font-size: 12px; color: var(--muted); }`, `.info-close { width: 100%; margin-top: 12px; }`

7. `tests/view.test.ts`. Add tests:
   - `parseSaverMinutes`: `'0'`→0, `'1'`→1, `'5'`→5, `null`→5, `'7'`→5.
   - `shouldStartSaver`: `(60000, 1, true, false)` → true; `(59999, 1, true, false)` → false;
     `(600000, 0, true, false)` → false; `(600000, 5, false, false)` → false; `(600000, 5, true, true)` →
     false.
   - `driftPosition`: `(0.5, 0.5, 400, 800, 100, 200)` → `{ x: 150, y: 300 }`; `(0.9, 0.9, 50, 50, 100, 100)`
     → `{ x: 0, y: 0 }`.

8. Docs:
   - `README.md`:
     - a feature bullet: `- An ⓘ panel with dim view and a black screensaver (auto-starts after 1 or 5
       minutes without a touch) that keep the screen awake while music plays. Phones pause the live
       synth when the app is minimized, so keep it open.`
     - add `S screensaver` to the keyboard shortcuts bullet.
   - `docs/how-it-works.md`: under `src/ui/`, add one line: `saver.ts` is the dim and black screensaver
     overlays, and `wake.ts` keeps the screen awake while they're on.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0, including the new tests.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- No new dependencies. Keep `src/ui/view.ts` pure.
- Wrap all localStorage access with the existing `load`/`save` helpers, and wrap Wake Lock calls in
  `try`/`catch`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report it.
  Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Background playback, Media Session, and service worker changes.
- Changes to tuning, presets, styles, or audio.

## If blocked

Stop, write what failed and the exact error in `.handoff/report.md`, and do not improvise a different design.
