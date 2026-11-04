## Goal

Keep music playing when the app is in the background or the phone is locked, and show a system media
player (notification bar and lock screen) with title, artwork, play/pause, next/previous, and seek.
This takes three changes:

1. The engine's output goes to a `MediaStreamAudioDestinationNode`, which feeds a hidden `<audio>`
   element, so the OS treats it as media playback.
2. A Media Session integration.
3. A long scheduling lookahead (2 s) while the page is hidden, so throttled timers cannot cause gaps.

## Files to touch

- `src/audio/engine.ts`
- `src/ui/media.ts` (new)
- `src/ui/view.ts`
- `src/ui/ui.ts`
- `tests/view.test.ts`
- `README.md`, `docs/how-it-works.md`, `docs/sound.md`

## Steps

1. `src/audio/engine.ts` (it must still not touch the DOM):
   - Replace `const LOOKAHEAD = 0.12;` with `const LOOKAHEAD = 0.12;` plus
     `const BACKGROUND_LOOKAHEAD = 2;`, and a private field `lookahead = LOOKAHEAD`. `tick()` uses
     `this.lookahead` everywhere it used `LOOKAHEAD`.
   - Add `setBackground(hidden: boolean): void`, which sets `this.lookahead` to `hidden ?
     BACKGROUND_LOOKAHEAD : LOOKAHEAD`, then calls `this.tick()` if playing so the longer window is
     booked straight away.
   - Output routing. In the constructor, if `typeof ctx.createMediaStreamDestination === 'function'`,
     create `this.streamOut = ctx.createMediaStreamDestination()` and connect `this.volume` to it
     **instead of** `ctx.destination`. Otherwise connect `this.volume` to `ctx.destination` as now and
     leave `streamOut` null.
   - Expose `get stream(): MediaStream | null` (returns `this.streamOut?.stream ?? null`).
   - Add `resume(): void`: if `this.ctx.state !== 'running'`, call `void this.ctx.resume()`.
   - Leave the analysers, which tap `this.clip`, unchanged.

2. `src/ui/view.ts`. Add one pure helper:
   - `export function positionDrifted(reported: number, reportedAt: number, now: number, position: number, playing: boolean): boolean`.
     It returns true when `Math.abs(expected - position) > 1.5`, where
     `expected = playing ? reported + (now - reportedAt) : reported`. All times are in seconds.

3. `src/ui/media.ts` (new):
   ```ts
   export interface MediaHandlers { play(): void; pause(): void; next(): void; previous(): void; seek(seconds: number): void; }
   export interface MediaState { title: string; artist: string; playing: boolean; position: number; duration: number; }
   export function createMediaSession(handlers: MediaHandlers): { update(state: MediaState): void };
   ```
   - If `!('mediaSession' in navigator)`, return `{ update() {} }`.
   - Register action handlers with `setActionHandler`, each wrapped in `try`/`catch` because some
     actions are unsupported on some browsers: `play`, `pause`, `nexttrack`, `previoustrack`,
     `seekto` (uses `details.seekTime`), `seekbackward` (−10 s), and `seekforward` (+10 s).
     `seekbackward` and `seekforward` call `handlers.seek` with the clamped target, computed from the
     last `update` state.
   - `update(state)` is called often (every animation frame), so only push changes:
     - When `title` or `artist` changed, set `navigator.mediaSession.metadata = new MediaMetadata({ title,
       artist, album: 'Drumline Radio', artwork: [192 and 512 PNGs at \`${import.meta.env.BASE_URL}icons/icon-192.png\` and
       \`icon-512.png\`, with sizes and type] })`.
     - When `playing` changed, set `playbackState` to `'playing'` or `'paused'`.
     - Call `setPositionState({ duration, position: min(position, duration), playbackRate: 1 })`, inside
       `try`/`catch` and only when `duration > 0`, if any of these hold: `playing` changed; `duration`
       changed; or `positionDrifted(lastPosition, lastAt, performance.now() / 1000, position, playing)`.
       Store `lastPosition` and `lastAt` whenever it is called.

4. `src/ui/ui.ts`:
   - Create one hidden sink: `const sink = new Audio(); sink.setAttribute('playsinline', '');`. Don't
     add it to the DOM.
   - In `ensureEngine()`, after creating the engine: if `created.stream`, set
     `sink.srcObject = created.stream`.
   - Add `syncOutput()`. If the engine exists and has a stream:
     - when `engine.playing && sink.paused`, call `sink.play().catch(() => {})`;
     - when `!engine.playing && !sink.paused`, call `sink.pause()`.

     Call `syncOutput()` at the end of `updatePlayButton()`. Every play, pause, seek, song-change, and
     song-end path already calls that function.
   - Media session: `const media = createMediaSession({...})`, with handlers that reuse the existing
     functions:
     - `play`: if not playing, call `togglePlay()`.
     - `pause`: if playing, call `togglePlay()`.
     - `next`: `next()`.
     - `previous`: `previous()`.
     - `seek(s)`: `ensureEngine()?.seek(s)`, then `updatePlayButton()`.
   - Add `updateMedia()`. It calls `media.update` with:
     - `title`: the current song title;
     - `artist`: `` `${composer} · ${STYLE_DEFS[style].name}` ``, using the engine's current style or the
       song's own style before the engine exists;
     - `playing`, `position`, and `duration` from the engine, or `false`/0/0 before it exists.

     Call `updateMedia()` at the end of `updatePlayButton()`, after `syncOutput()`.
   - Background, on `document` `visibilitychange`:
     - call `engine?.setBackground(document.hidden)`;
     - when becoming visible (`!document.hidden`) while `engine?.playing`, call `engine.resume()` and
       `syncOutput()`.

     Also call `created.setBackground(document.hidden)` right after creating the engine in
     `ensureEngine()`.

5. `tests/view.test.ts`. Add `positionDrifted` tests:
   - `(10, 100, 101, 11, true)` → false;
   - `(10, 100, 101, 14, true)` → true;
   - `(10, 100, 105, 10, false)` → false;
   - `(10, 100, 105, 12, false)` → true.

6. Docs:
   - `README.md`: a feature bullet, `- Keeps playing in the background and with the screen locked, with
     the system media controls (title, artwork, play/pause, next/previous, seek). Works well on Android;
     iPhone is best effort.`
   - `docs/how-it-works.md`: under `src/ui/`, add a line for `media.ts`, saying it shows the song in the
     phone's media controls and lock screen. Under `engine.ts`, add one sentence: output goes through a
     media stream into a hidden audio element, so phones keep it playing in the background, and the
     lookahead grows to 2 s while the app is hidden.
   - `docs/sound.md`: wherever the master chain's final output is described, note that it ends in a
     `MediaStreamAudioDestinationNode` played by a hidden `<audio>` element (or `ctx.destination` when
     that is unsupported).

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0, including the new `positionDrifted` tests.
- `grep -n "document\|window" src/audio/engine.ts` prints nothing.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- No new dependencies.
- `src/audio/engine.ts` must not use `document` or `window`. Keep `src/ui/view.ts` pure.
- Wrap every Media Session call that can throw (`setActionHandler`, `setPositionState`) in `try`/`catch`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report it.
  Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Install hint or button changes.
- Any change to how tuning, presets, or styles behave.
- Changes to the service worker.

## If blocked

Stop, write what failed and the exact error in `.handoff/report.md`, and do not improvise a different design.
