## Goal

Add a Playlist view to Drumline Radio. A "Radio | Playlist" switch in the header flips between the
existing radio screen and a new playlist screen. On the playlist screen the user picks songs from a
library list, each with a style (the song's own style or any of the 6 styles), and adds them to one
playlist. The same song can be added many times in different styles. The playlist can be reordered,
entries removed, and the whole list cleared. "Play playlist" plays the entries in order, each in its
saved style; a Loop toggle loops the list. The playlist, loop setting, and current view are saved in
localStorage. The header (readout, meters, volume) and the transport row (prev/play/next/repeat/seek)
stay visible in both views; the score, dial, category presets and style bands are hidden in the
playlist view.

## Files to touch

- `src/ui/playlist.ts` (new, pure, no DOM or audio)
- `tests/playlist.test.ts` (new)
- `src/ui/ui.ts`
- `index.html`
- `src/ui/style.css`
- `README.md`
- `docs/how-it-works.md`

## Steps

1. Create `src/ui/playlist.ts`, DOM-free, exporting exactly:

   ```ts
   import { STYLES } from '../music/roles';
   import type { StyleId } from '../music/roles';

   export interface PlaylistEntry { song: string; style: StyleId } // song = LibraryEntry.id
   export const PLAYLIST_MAX = 200;
   export type AppView = 'radio' | 'playlist';
   ```

   - `parsePlaylist(stored: string | null, ids: string[]): PlaylistEntry[]` — `JSON.parse` inside
     try/catch; returns `[]` for null, invalid JSON, or a non-array. Keeps only items that are objects
     with a string `song` contained in `ids` and a `style` contained in `STYLES`; output objects contain
     only `song` and `style`. Truncates to the first `PLAYLIST_MAX` kept items.
   - `serializePlaylist(list: PlaylistEntry[]): string` — `JSON.stringify` of `{song, style}` items.
   - `addEntry(list, entry): PlaylistEntry[]` — returns a new array with `entry` appended; if
     `list.length >= PLAYLIST_MAX` returns `list` unchanged (same reference).
   - `moveEntry(list, at: number | null, index: number, delta: -1 | 1): { list: PlaylistEntry[]; at: number | null }`
     — swaps `index` with `index + delta` in a new array. If either position is out of range, returns
     the same `list` reference and `at` unchanged. `at` (the playing entry) follows the swap: if
     `at === index` it becomes `index + delta`; if `at === index + delta` it becomes `index`.
   - `removeEntry(list, at: number | null, index: number): { list: PlaylistEntry[]; at: number | null }`
     — new array without `index` (out of range: same reference, `at` unchanged). `at === index` → `null`;
     `at > index` → `at - 1`; otherwise unchanged.
   - `nextInPlaylist(at: number, length: number, repeatOne: boolean, loop: boolean): number` — returns
     `-1` if `length === 0`; `at` if `repeatOne`; `at + 1` if `at + 1 < length`; `0` if `loop`; else `-1`.
   - `prevInPlaylist(at: number, length: number): number` — `-1` if `length === 0`, otherwise
     `(at - 1 + length) % length`.
   - `parseView(stored: string | null): AppView` — `'playlist'` only for the exact string
     `'playlist'`, otherwise `'radio'`.

2. Create `tests/playlist.test.ts` (Vitest, same style as `tests/view.test.ts`) covering every function
   above: parsePlaylist with null, bad JSON, non-array, unknown id, unknown style, extra fields
   stripped, truncation at `PLAYLIST_MAX`; serialize→parse round trip; addEntry append and the cap;
   moveEntry up/down, out-of-range, and `at` following both swapped positions; removeEntry before /
   at / after `at` and out-of-range; nextInPlaylist for all branches; prevInPlaylist wrap; parseView.

3. `index.html`:
   - In `.brand`, directly before the `#install` button, add
     `<div id="views" class="views" role="radiogroup" aria-label="View"><button type="button" class="view-btn" role="radio" data-view="radio" aria-checked="true">Radio</button><button type="button" class="view-btn" role="radio" data-view="playlist" aria-checked="false">Playlist</button></div>`.
   - Between `</main>` and `<section class="tuner" ...>` add:

     ```html
     <section id="playlist-view" class="playlist-view" aria-label="Playlist" hidden>
       <div class="pl-col pl-queue">
         <div class="pl-head">
           <h2 class="pl-title">Playlist <span id="pl-count" class="pl-count"></span></h2>
           <div class="pl-actions">
             <button id="pl-start" class="info-action" type="button">▶ Play playlist</button>
             <button id="pl-loop" class="info-action" type="button" aria-pressed="false">Loop</button>
             <button id="pl-clear" class="info-action" type="button">Clear</button>
           </div>
         </div>
         <ol id="pl-list" class="pl-list"></ol>
         <p id="pl-empty" class="pl-empty">Your playlist is empty. Pick a style next to a song below and press +.</p>
       </div>
       <div class="pl-col pl-library">
         <div class="pl-head">
           <h2 class="pl-title">Library</h2>
           <div id="pl-filters" class="presets" role="radiogroup" aria-label="Library category"></div>
         </div>
         <ul id="pl-songs" class="pl-songs"></ul>
       </div>
     </section>
     ```
   - In the info panel, change the keyboard line to
     `Space play/pause · ←/→ station · 1–6 style · C category · M mute · R repeat · S screensaver · P playlist view`.

4. `src/ui/ui.ts` — wire the view and the playlist. Keep all existing behaviour in radio mode.
   - Imports: everything needed from `./playlist`. New keys: `PLAYLIST_KEY = 'drumline-radio-playlist'`,
     `PLAYLIST_LOOP_KEY = 'drumline-radio-playlist-loop'`, `VIEW_KEY = 'drumline-radio-view'`. Use the
     existing `load`/`save` helpers (already try/catch).
   - Query the new elements with `required(...)`: `#views`, `#playlist-view`, `#pl-count`, `#pl-start`,
     `#pl-loop`, `#pl-clear`, `#pl-list`, `#pl-empty`, `#pl-filters`, `#pl-songs`.
   - State: `let playlist = parsePlaylist(load(PLAYLIST_KEY), LIBRARY.map((e) => e.id));`,
     `let playlistAt: number | null = null;` (index of the playing entry, null = radio playback),
     `let loop = load(PLAYLIST_LOOP_KEY) === '1';`, `let view = parseView(load(VIEW_KEY));`,
     `let libraryFilter: CategoryFilter = 'all';` (not saved).
   - `setPlaylist(list)`: assigns, `save(PLAYLIST_KEY, serializePlaylist(list))`, calls `renderPlaylist()`.
   - `applyView()`: sets `root.dataset.view = view` (`root` is `document.documentElement`), sets
     `playlistView.hidden = view !== 'playlist'`, sets each `.view-btn` `aria-checked`. `selectView(v)`
     assigns, saves `VIEW_KEY`, calls `applyView()`; when switching to radio also call
     `titleMarquee.refit(); subtitleMarquee.refit();`. Click on a `.view-btn` → `selectView(button.dataset.view)`
     (validate with `parseView`). ArrowLeft/ArrowRight on `#views` toggles between the two, with
     `preventDefault` + `stopPropagation` (same pattern as the `presetsEl` keydown).
   - Library list (`renderLibrary()`, called at start and on filter change): filter chips in `#pl-filters`
     built once like the preset buttons (class `preset`, role radio, labels from `categoryLabel`, all
     `CATEGORY_FILTERS`); clicking one sets `libraryFilter`, updates the chips' `aria-checked`, and
     re-renders the rows. Rows are the indices from
     `stationsIn(LIBRARY.map(e => e.song.meta.category), libraryFilter)`. Each row is
     `<li class="pl-song">` with:
     - `<div class="pl-song-text"><span class="pl-song-title">{title}</span><span class="pl-song-meta">{composer} · {formatTime(duration)}</span></div>`
       (compute every song's `buildTimeline(song).duration` once at startup into an array, not per render);
     - `<select class="pl-style" aria-label="Style for {title}">` with one `<option value="{id}">` per
       `STYLES` id, text `STYLE_DEFS[id].name`; the song's own style option has text prefixed with `★ `
       and is selected by default;
     - `<button type="button" class="pl-add" aria-label="Add {title} to playlist">+</button>`; click →
       if `playlist.length >= PLAYLIST_MAX` show `Full` as the button text for 900 ms; otherwise
       `setPlaylist(addEntry(playlist, { song: entry.id, style: select.value as StyleId }))` and show
       `✓` for 900 ms; then restore `+`.
     Use `textContent` for all song text (no innerHTML with song data).
   - Playlist list (`renderPlaylist()`): `#pl-count` text is `(${playlist.length})`, or empty when 0;
     `#pl-empty.hidden = playlist.length > 0`; `#pl-start.disabled` and `#pl-clear.disabled` are
     `playlist.length === 0`. Rebuild `#pl-list`: each entry → `<li class="pl-item">`, with
     `aria-current="true"` and class `playing` when `index === playlistAt`, containing:
     - `<span class="pl-num">{index + 1}</span>`;
     - `<button type="button" class="pl-entry">` holding `<span class="pl-song-title">{title}</span>`
       and `<span class="pl-song-meta">{STYLE_DEFS[style].name}{style === song's own style ? '' : ' remix'}</span>`;
       click → `playEntry(index)`;
     - three `<button type="button" class="pl-icon">` buttons: `↑` (aria-label "Move {title} up",
       disabled for index 0), `↓` ("Move {title} down", disabled for the last), `✕` ("Remove {title}").
       ↑/↓ → `const r = moveEntry(playlist, playlistAt, index, -1 or 1); playlistAt = r.at; setPlaylist(r.list); updateReadoutForEngine();`.
       ✕ → the same with `removeEntry(playlist, playlistAt, index)`.
   - `#pl-loop`: toggles `loop`, saves `PLAYLIST_LOOP_KEY` as '1'/'0', sets `aria-pressed`.
   - `#pl-clear`: `if (!window.confirm('Clear the playlist?')) return;` then
     `playlistAt = null; setPlaylist([]); updateReadoutForEngine();`.
   - `#pl-start`: `playEntry(0)`.
   - `playEntry(at: number)`:
     ```
     const item = playlist[at]; if (!item) return;
     const index = LIBRARY.findIndex((e) => e.id === item.song); if (index < 0) return;
     if (!visible().includes(index)) selectCategory('all');   // before playlistAt is set
     const fresh = engine === null;
     current = index;
     const active = ensureEngine(); if (!active) return;
     if (!fresh) loadSong(index);
     const changed = lastStyle !== null && lastStyle !== item.style;
     playlistAt = at;
     active.setStyle(item.style);
     root.dataset.style = item.style;
     if (changed && !fresh) showBanner(item.style);
     lastStyle = item.style;
     updateReadout(item.style); updateBands(item.style);
     dial.select(current, false);
     active.play();
     updatePlayButton(); renderPlaylist();
     ```
   - `updateReadout(style)`: when `playlistAt !== null`, append `` ` · ${playlistAt + 1}/${playlist.length}` ``
     to the subtitle string. Add `updateReadoutForEngine()` = `if (engine) updateReadout(engine.style);`.
   - Leaving playlist playback: set `playlistAt = null`, then call `renderPlaylist()` and
     `updateReadoutForEngine()`, at the start of the dial `onTune` callback and at the start of
     `selectCategory` (covers the preset buttons and the `C` key). `selectBand` keeps `playlistAt`
     (a one-off style change while playing does not edit the entry).
   - `handleEnded()`: if `playlistAt !== null`: `const n = nextInPlaylist(playlistAt, playlist.length, repeat, loop);`
     if `n < 0` → `playlistAt = null; renderPlaylist(); updateReadoutForEngine(); updatePlayButton(); return;`
     else `playEntry(n); return;`. Otherwise keep the existing radio behaviour.
   - `next()`: after `ensureEngine()`, if `playlistAt !== null`:
     `const n = nextInPlaylist(playlistAt, playlist.length, false, true); if (n >= 0) playEntry(n); return;`.
     `previous()`: keep the restart-if-past-3s rule first; then if `playlistAt !== null`,
     `const p = prevInPlaylist(playlistAt, playlist.length); if (p >= 0) playEntry(p); return;`.
   - Global keydown: return early (before any shortcut, after the screensaver check) when
     `document.activeElement instanceof HTMLSelectElement`. Add `P`/`p` →
     `selectView(view === 'radio' ? 'playlist' : 'radio')`.
   - At startup call `applyView()`, set `#pl-loop` `aria-pressed`, `renderLibrary()`, `renderPlaylist()`.
     These must run before the `if (LIBRARY.length === 0)` early return and must not throw on an empty library.

5. `src/ui/style.css`:
   - `.views`: `display: inline-flex; gap: 4px; margin-left: 10px; vertical-align: middle;`.
     `.view-btn` styled like `.preset` but `flex: none; padding: 2px 8px; font-size: 10px;`;
     `.view-btn[aria-checked='true']` uses the same accent/glow as `.preset[aria-checked='true']`.
   - `:root[data-view='playlist'] .stage, :root[data-view='playlist'] .tuner .presets, :root[data-view='playlist'] .dial-wrap, :root[data-view='playlist'] .bands { display: none; }`
     (`.tuner .presets` must not hide `#pl-filters`, which is outside `.tuner`).
   - `.playlist-view`: `flex: 1; min-height: 240px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start;`
     and `.playlist-view[hidden] { display: none; }`. `.pl-col` uses the panel look of `.tuner`
     (`background: var(--panel)`, `border: 1px solid rgba(255, 255, 255, 0.08)`, `border-radius: 12px`),
     `padding: 12px; display: flex; flex-direction: column; gap: 8px; min-width: 0;`.
     `.pl-list, .pl-songs { overflow-y: auto; max-height: 60dvh; list-style: none; margin: 0; padding: 0; }`.
   - `.pl-head`: `display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px;`.
     `.pl-title`: `font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--muted); margin: 0; font-weight: normal;`.
     `.pl-actions`: `display: flex; gap: 6px; flex-wrap: wrap;`. `#pl-filters` keeps `.presets` styling
     and gets `flex: 1 1 100%`.
   - `.pl-song`, `.pl-item`: `display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); min-height: 42px;`.
     `.pl-song-text`, `.pl-entry`: `flex: 1; min-width: 0; display: flex; flex-direction: column;`.
     `.pl-song-title`: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`.
     `.pl-song-meta`: `font-size: 11px; color: var(--muted);`. `.pl-entry` is a reset button
     (`border: 0; background: none; padding: 0; color: inherit; font: inherit; text-align: left; cursor: pointer;`).
     `.pl-item.playing`: `border-left: 2px solid var(--accent);` and `.pl-item.playing .pl-song-title { color: var(--accent); }`.
     `.pl-num`: `font-size: 11px; color: var(--muted); min-width: 1.6em; text-align: right;`.
   - `.pl-style`: `background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: inherit; font: inherit; font-size: 11px; max-width: 9.5em; height: 30px;`
     and `.pl-style option { background: #14101f; }`.
     `.pl-add`, `.pl-icon`: `flex: none; width: 30px; height: 30px;` with the `.preset` border,
     background and radius, `color: var(--muted); font: inherit; cursor: pointer;`; `.pl-add { color: var(--accent); min-width: 30px; width: auto; padding: 0 6px; }`;
     `.pl-icon:disabled, #pl-start:disabled, #pl-clear:disabled { opacity: 0.35; cursor: default; }`.
   - `.pl-empty`: `color: var(--muted); font-size: 13px; margin: 4px 0;`.
   - In the existing `@media (max-width: 640px)` block add: `.playlist-view { grid-template-columns: 1fr; }`,
     `.pl-list, .pl-songs { max-height: none; }`, `.view-btn { padding: 2px 6px; letter-spacing: 0.06em; }`.

6. `README.md`: add a feature bullet after the category presets bullet:
   "A Playlist view (Radio | Playlist switch in the header): add any song in any of the 6 styles,
   the same song more than once, reorder or remove entries, and play the list in order, with a Loop
   toggle. The playlist is saved on this device." Add `P playlist view` to the keyboard shortcuts bullet.

7. `docs/how-it-works.md`: in the `src/ui/` section add a bullet: "`playlist.ts` is the playlist logic
   (saved list, reorder, remove, what plays next), kept pure so it can be tested; `ui.ts` draws the
   playlist view and plays its entries."

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0 and its output lists `tests/playlist.test.ts`.
- `git status --porcelain` lists only files from **Files to touch** (plus `.handoff/`).

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.
- Headless Edge against `npx vite preview --port 4173`: switching to Playlist hides the dial and shows
  both lists; two entries of the same song in different styles persist across a reload; Play playlist
  plays entry 1 in its saved style; no horizontal scroll at 360 px wide.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.
- `src/ui/playlist.ts` must not reference `document`, `window`, `localStorage`, or any audio API.
- All `localStorage` access goes through the existing `load`/`save` helpers in `ui.ts`.
- No new dependencies. No `innerHTML` with song data.
- Do not change any `.song` file, `src/audio/*`, or `src/music/*`.

## Out of scope

Multiple named playlists, shuffle, share links, drag-and-drop reordering, editing an entry's style
after it is added, background or pre-rendered playback.

## If blocked

Stop, leave the working tree as is, and write in `.handoff/report.md` which step failed, the exact
command and error output, and what you think the fix is.
