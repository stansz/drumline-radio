## Goal

Split `src/ui/ui.ts` (one 1,090-line `startUi()` closure) into focused modules, with no change in
behavior, markup, CSS, storage keys, or keyboard shortcuts. Each new module follows the pattern the
codebase already uses (`createDial`, `createSaver`, `createScore`): a `createX(deps)` factory that
looks up its own elements, keeps its own state, wires its own listeners, and returns a small API.

## Files to touch

- `src/ui/ui.ts` (shrinks; keeps the player core)
- `src/ui/dom.ts` (new)
- `src/ui/settings.ts` (new)
- `src/ui/links.ts` (new)
- `src/ui/playlist-view.ts` (new)
- `src/ui/song-card.ts` (new)
- `docs/how-it-works.md` (the `src/ui/` section)

## Steps

Move code by function name, not line number. Move bodies verbatim; only change how they reach
state that now lives in another module (a getter or a callback in `deps`).

1. **`src/ui/dom.ts`**: move `load`, `save`, and `required` here unchanged and export them. Every
   module imports them from here.

2. **`src/ui/settings.ts`**: `export function createSettings(deps: { engine(): Engine | null;
   updatePlayButton(): void; showSaver(): void })`.
   - Owns: the `VOLUME_KEY`, `MUTED_KEY`, `REPEAT_KEY`, `DIM_KEY`, `FLASH_KEY`, and `SAVER_KEY`
     constants; the `volume`, `muted`, `repeat`, `dim`, `flashOn`, and `saverMinutes` state;
     `outputGain`, `applyVolume`, `toggleMute`, `applyRepeat`, `toggleRepeat`, `applyDim`,
     `toggleDim`, `toggleFlash`, `applySaverMinutes`, `selectSaverMinutes`; the saver-minutes
     buttons; the build stamp; the info panel open/close; the `#dim-toggle`, `#flash-toggle`,
     `#saver-start`, `#mute`, `#volume`, and `#repeat` listeners; and the initial `apply*()` calls.
   - `#saver-start` calls `infoPanel.close()` and then `deps.showSaver()`.
   - Returns `{ outputGain, toggleMute, toggleRepeat, get repeat(), get flashOn(),
     get saverMinutes(), get infoOpen(), volumeEl, init() }`. `init()` runs the initial `apply*()`
     calls. `volumeEl` is returned so the global key handler can check focus.

3. **`src/ui/links.ts`**: no state, no factory.
   - Move `shareUrl` as `export function linkUrl(hash: string): string`.
   - Move `shareLink` as `export async function sendLink(url, title, button)`.
   - Add `export function takeHash(ids: string[]): ShareLink | null`, holding the parse and
     `replaceState` half of `consumeHash`.
   - `consumeHash` stays in `ui.ts` as `const link = takeHash(...); if (link) applyShareLink(link);`.

4. **`src/ui/playlist-view.ts`**: `export function createPlaylistView(deps: { playEntry(at: number):
   void; onChange(): void })`. `onChange` is `updateReadoutForEngine`.
   - Owns: the `PLAYLIST_KEY`, `PLAYLIST_LOOP_KEY`, and `VIEW_KEY` constants; the `playlist`,
     `playlistAt`, `loop`, `incoming`, `view`, and `libraryFilter` state; `songDurations`,
     `libraryById`, the library filter buttons, `setPlaylist`, `applyView`, `selectView`,
     `selectLibraryFilter`, `renderLibrary`, `renderPlaylist`, `movePlaylist`,
     `removeFromPlaylist`, `applyLoop`, `hideIncoming`; the `#pl-start`, `#pl-loop`, `#pl-clear`,
     and `#pl-link` listeners and the three `#pl-incoming-*` listeners; and the view buttons with
     their arrow-key handler.
   - `#pl-start` calls `deps.playEntry(0)`. `#pl-link` uses `linkUrl` and `sendLink` from
     `links.ts`.
   - Returns:
     ```ts
     {
       get entries(): PlaylistEntry[];
       get at(): number | null;
       set at(value: number | null);   // setting re-renders the playlist
       get loop(): boolean;
       get view(): AppView;
       selectView(next: AppView): void;
       showIncoming(entries: PlaylistEntry[]): void;
       stop(): void;                   // at = null, re-render, deps.onChange()
       init(): void;                   // applyView, applyLoop, renderLibrary, renderPlaylist
     }
     ```
   - `selectView('radio')` still refits the title and subtitle marquees. Pass a `refit(): void`
     callback in `deps` for that.

5. **`src/ui/song-card.ts`**: `export function createSongCard(deps: { entry(): LibraryEntry |
   undefined; position(): number | null; style(): StyleId })`.
   - Owns: the `#song-card` and `#card-*` elements, `shareAtPosition`, `openSongCard`, the
     readout's click and keydown listeners, and the close and two share buttons (via `links.ts`).
   - `position()` returns `engine?.position ?? null`. `style()` is the current `shareStyle`.
   - Returns `{ open(): void, get isOpen(): boolean }`.

6. **`src/ui/ui.ts`** keeps:
   - element lookups for what it still uses; the marquees; score; meters; engine;
   - `current`, `lastStyle`, `pendingStyle`, `pendingSeek`, `bannerTimer`, scrub and seek state;
   - category state and `CATEGORY_KEY`; `visible`; band and preset buttons and their arrow keys;
   - `songStyle`, `updateReadout`, `updateReadoutForEngine`, `updateBands`, `updatePlayButton`,
     `showBanner`, `ensureEngine`, `loadSong`, `shareStyle`, `applyShareLink`, `consumeHash`,
     `handleEnded`, `selectBand`, `selectCategory`, `togglePlay`, `previous`, `next`,
     `playEntry`, the dial;
   - the score scrub and seek listeners, the interaction tracking, the global keydown handler,
     `updateFlash`, `frame`, and the startup block at the end.

   Wire it up:
   - Replace `playlistAt = null; renderPlaylist(); updateReadoutForEngine();` sequences with
     `playlistView.stop()`.
   - Replace reads of `playlist`, `playlistAt`, `loop`, `view`, `repeat`, `flashOn`, and
     `saverMinutes` with the module getters.
   - Replace `infoPanel.open || songCard.open` with `settings.infoOpen || songCard.isOpen`.
   - In `playEntry`, `playlistAt = at;` becomes `playlistView.at = at;`. The existing call to
     `renderPlaylist()` goes away because the setter re-renders.
   - The global keydown handler keeps every shortcut exactly as it is today.

7. **Order of creation in `startUi`**: settings, then playlist view, then song card, then dial.
   Function declarations are hoisted, so callbacks that point to `ui.ts` functions work. Call
   `settings.init()` and `playlistView.init()` where the old `apply*()` and `render*()` calls were.

8. **`docs/how-it-works.md`**, `src/ui/` section: replace the `ui.ts` bullet with one bullet per
   file:
   - `ui.ts`: the player core: engine, tuning, styles, transport, keyboard, the frame loop;
   - `settings.ts`: volume, mute, repeat, dim, flash, the screensaver timer, the info panel;
   - `playlist-view.ts`: the playlist view and the library list;
   - `song-card.ts`: the song card;
   - `links.ts`: sending a link and reading a link from the address bar;
   - `dom.ts`: storage and element helpers.

   Change "`ui.ts` draws the playlist view" to "`playlist-view.ts` draws the playlist view".

## Acceptance

- `npm run typecheck` exits 0.
- `wc -l src/ui/ui.ts` prints a number below 650.
- `grep -l "localStorage" src/ui/*.ts` prints only `src/ui/dom.ts`.
- `grep -rn "function load\|function save\|function required" src/ui/` matches only
  `src/ui/dom.ts`.
- `git diff --stat -- index.html src/ui/style.css` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.
- Headless Edge smoke check on `npm run dev`:
  - tune the dial, play/pause, switch style bands with keys 1–6;
  - change category with `c`; mute with `m`;
  - open the song card and Share song;
  - add two songs to the playlist and play it;
  - load `#song=last-stop&style=chiptune&t=0:30` and `#list=...`;
  - check there are no console errors.

## Parallel work

None — do it sequentially. Every module is carved out of the same file.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- No behavior changes: same storage keys, same element ids, same shortcuts, same text, and the same
  order of side effects inside each moved function.
- Do not add dependencies or frameworks, and do not change `view.ts`, `playlist.ts`, `share.ts`,
  `dial.ts`, or anything outside `src/ui/` except the doc.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules.

## Out of scope

- Style filter chips, grouping the dial by style, or any other new feature.
- Splitting `style.css`, `song.ts`, or the audio files.
- Renaming existing functions beyond `shareUrl` → `linkUrl` and `shareLink` → `sendLink` (moved
  into `links.ts`).

## If blocked

If a moved function needs state from two modules in a way the APIs above don't cover, leave that
function in `ui.ts`, finish the rest, and list it in `.handoff/report.md`. If `npm run typecheck`
fails and the fix isn't a missing import or getter, stop and report the error.
