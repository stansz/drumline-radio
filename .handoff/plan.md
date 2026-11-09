## Goal

Add a third view, Jukebox, next to Radio and Playlist: a wall of title strips for the original
songs only, each with a fixed code like `A1`, grouped by style or by composer. Tapping a strip plays
that song in its home style from the top; a `+` on the strip adds it to the playlist.

## Files to touch

- `index.html`
- `src/ui/playlist.ts`
- `src/ui/playlist-view.ts`
- `src/ui/jukebox.ts` (new)
- `src/ui/ui.ts`
- `src/ui/style.css`
- `tests/jukebox.test.ts` (new)
- `README.md`
- `docs/how-it-works.md`

## Steps

1. `src/ui/playlist.ts`:
   - `export type AppView = 'radio' | 'jukebox' | 'playlist';`
   - `export const VIEWS: readonly AppView[] = ['radio', 'jukebox', 'playlist'];`
   - `parseView` returns `'jukebox'` or `'playlist'` when `stored` is exactly that string, else
     `'radio'`.
   - Add `/** The view `delta` steps along VIEWS from `view`, wrapping. */ export function
     nextView(view: AppView, delta: 1 | -1): AppView`.

2. `src/ui/jukebox.ts` (new). Pure part (no DOM at module level):

   ```ts
   export type JukeboxSort = 'style' | 'composer';
   export const JUKEBOX_SORTS: readonly JukeboxSort[] = ['style', 'composer'];
   /** The fields the jukebox reads from a song's header. */
   export interface JukeboxSong { title: string; composer: string; category: Category; style: StyleId }
   export interface JukeboxSlot { index: number; code: string }
   export interface JukeboxGroup { key: string; style: StyleId | null; slots: JukeboxSlot[] }
   export function parseJukeboxSort(stored: string | null): JukeboxSort   // 'composer' if exactly that, else 'style'
   export function jukeboxCodes(songs: JukeboxSong[]): Map<number, string>
   export function jukeboxGroups(songs: JukeboxSong[], sort: JukeboxSort): JukeboxGroup[]
   ```

   - `songs` is parallel to `LIBRARY` (index = library index). Only songs with
     `category === 'originals'` take part; others get no code and appear in no group.
   - Codes: walk `STYLES` in order; each style that has at least one original takes the next
     letter (`A`, `B`, `C`, …). Within a style, sort its originals by `title.localeCompare` and
     number them from 1: `A1`, `A2`, … Codes never depend on `sort`.
   - `jukeboxGroups(songs, 'style')`: one group per style with originals, in `STYLES` order,
     `key` = the style id, `style` = the style id.
   - `jukeboxGroups(songs, 'composer')`: one group per distinct `composer` string, ordered by
     `localeCompare`, `key` = the composer string, `style` = `null`.
   - In every group, slots are sorted by `title.localeCompare`; each slot's `code` comes from
     `jukeboxCodes`.

   DOM part:

   ```ts
   export interface JukeboxDeps {
     playSong(index: number): void;
     /** Adds the song in its home style; false when the playlist is full. */
     addToPlaylist(index: number): boolean;
   }
   export interface Jukebox {
     /** Marks the library song now loaded; safe to call before init. */
     setCurrent(index: number | null): void;
     init(): void;
   }
   export function createJukebox(deps: JukeboxDeps): Jukebox
   ```

   - Elements: `#jb-count`, `#jb-sort`, `#jb-wall` (via `required` from `./dom`).
   - Sort is saved under `drumline-radio-jukebox-sort` with `load`/`save` from `./dom` and read
     with `parseJukeboxSort`.
   - `#jb-sort` gets one `button.preset[role=radio]` per `JUKEBOX_SORTS` entry, labelled `Style` and
     `Composer`, `aria-checked` on the selected one; clicking re-renders. ArrowLeft/ArrowRight on
     `#jb-sort` moves the selection and focus, with `preventDefault()` and `stopPropagation()`
     (copy the `presetsEl` keydown handler in `ui.ts`).
   - `#jb-count` shows `(N)`, N = number of originals.
   - Render into `#jb-wall`: per group a `section.jb-section` with an `h3.jb-group` and a
     `ul.jb-slots`. Heading text: style groups `"<letter> · <STYLE_DEFS[style].name>"` (the letter
     is the first character of the group's codes); composer groups the composer string.
   - Each slot: `li.jb-slot` holding
     - `button.jb-play` (type button) with `span.jb-code` (the code), `span.jb-title` (title), and
       `span.jb-meta` (`"<composer> · <style name> · <formatTime(duration)>"`, durations from
       `buildTimeline(entry.song).duration`, computed once at creation); `aria-label`
       `"Play <title>"`; click calls `deps.playSong(index)`.
     - `button.jb-add` (type button, text `+`, `aria-label` `"Add <title> to playlist"`); click
       calls `deps.addToPlaylist(index)` and shows `✓` (or `Full` when it returned false) for
       900 ms, then `+` again (same as the library `+` in `playlist-view.ts`).
   - The slot whose index equals the current index has class `playing` and `aria-current="true"`;
     `setCurrent` updates this without a full re-render when already rendered.
   - The module reads songs as `LIBRARY.map((entry) => entry.song.meta)`.

3. `src/ui/playlist-view.ts`:
   - `applyView` also sets `required<HTMLElement>('#jukebox-view').hidden = view !== 'jukebox'`
     (look the element up once at the top with the other elements).
   - The `#views` keydown handler uses `selectView(nextView(view, event.key === 'ArrowRight' ? 1 : -1))`.
   - Add to the `PlaylistView` interface and the returned object:
     `/** Appends an entry; false when the playlist is full. */ add(entry: PlaylistEntry): boolean`
     — returns false if `playlist.length >= PLAYLIST_MAX`, else
     `setPlaylist(addEntry(playlist, entry))` and returns true. Make the library `+` handler use
     this too.

4. `src/ui/ui.ts`:
   - Split `playEntry` so the body after the index lookup becomes
     `/** Plays a library song from the top in a style; `at` is its playlist entry, or null to leave the playlist. */
     function startSong(index: number, style: StyleId, at: number | null): void`.
     `playEntry` keeps its lookups and calls `startSong(index, item.style, at)`. In `startSong`:
     first `if (at === null) playlistView.stop();`, then the old body with `item.style` replaced by
     `style`, and `playlistView.at = at;` only when `at !== null`. Behaviour of `playEntry` must not
     change.
   - Right after `createPlaylistView(...)`, create the jukebox:
     `const jukebox = createJukebox({ playSong: (index) => startSong(index, LIBRARY[index].song.meta.style, null), addToPlaylist: (index) => playlistView.add({ song: LIBRARY[index].id, style: LIBRARY[index].song.meta.style }) });`
   - Call `jukebox.setCurrent(current)` in `loadSong` in both branches (before the early `return`
     and at the end), and in `startSong` right after `current = index`.
   - Call `jukebox.init()` next to `playlistView.init()`.
   - Keyboard: `P` becomes `selectView(view === 'playlist' ? 'radio' : 'playlist')`; add `J`/`j`:
     `selectView(view === 'jukebox' ? 'radio' : 'jukebox')`, placed with the other letter keys.

5. `index.html`:
   - In `#views`, three buttons in this order: Radio, Jukebox (`data-view="jukebox"`), Playlist,
     all `aria-checked="false"` except Radio, same classes and roles as now.
   - After `#playlist-view`, add:

     ```html
     <section id="jukebox-view" class="jukebox-view" aria-label="Jukebox" hidden>
       <div class="pl-head">
         <h2 class="pl-title">Jukebox <span id="jb-count" class="pl-count"></span></h2>
         <div id="jb-sort" class="presets" role="radiogroup" aria-label="Sort the jukebox"></div>
       </div>
       <div id="jb-wall" class="jb-wall"></div>
     </section>
     ```
   - In the info panel's keyboard line, change `P playlist view` to `J jukebox · P playlist`.

6. `src/ui/style.css`:
   - Add `:root[data-view='jukebox']` versions of every selector in the two playlist rules
     (`.stage`, `.tuner .presets`, `.dial-wrap`, `.bands`, `.style-toggle` hidden; `.tuner` sticky)
     to those same rules.
   - New rules after the playlist block (use existing variables `--panel`, `--accent`, `--glow`,
     `--muted`):
     - `.jukebox-view`: `flex: 1; min-height: 240px;` same panel look as `.pl-col` (background,
       border, 12px radius, 12px padding), `display: flex; flex-direction: column; gap: 8px;
       min-width: 0`. `.jukebox-view[hidden] { display: none; }`
     - `.jb-group`: like `.pl-title` but 11px, `margin: 12px 0 6px`.
     - `.jb-slots`: no list style, no margin/padding, `display: grid;
       grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px`.
     - `.jb-slot`: `display: flex; min-height: 44px; min-width: 0;` 1px border
       `rgba(255,255,255,0.1)`, 6px radius, background `rgba(0,0,0,0.35)`.
     - `.jb-play`: `flex: 1; min-width: 0; display: grid; grid-template-columns: auto 1fr;
       column-gap: 10px; align-items: center; padding: 6px 8px;` no border, no background, inherit
       color and font, left aligned, pointer.
     - `.jb-code`: `grid-row: span 2; min-width: 2.4em; color: var(--accent); font-size: 13px;
       letter-spacing: 0.1em`.
     - `.jb-title`, `.jb-meta`: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
       min-width: 0`; `.jb-meta` 11px, `var(--muted)`.
     - `.jb-add`: `flex: none; width: 40px;` no border except `border-left: 1px solid
       rgba(255,255,255,0.08)`, no background, `var(--muted)`, font inherit at 18px, pointer.
     - `.jb-slot.playing`: `border-color: var(--accent); box-shadow: 0 0 10px var(--glow);` and
       `.jb-slot.playing .jb-title { color: var(--accent); }`
     - In the existing narrow-screen media block that holds `.playlist-view { grid-template-columns: 1fr; }`,
       add `.jb-slots { grid-template-columns: 1fr; }`.

7. `tests/jukebox.test.ts` (new), importing from `../src/ui/jukebox` and `../src/ui/playlist`:
   - With a hand-made list (originals in `techno`, `synthwave`, `synthwave`, plus one `classics`
     song): synthwave gets `A`, techno `B`; synthwave titles sorted give `A1`, `A2`; the classics
     song has no code.
   - `jukeboxGroups(…, 'style')` keys are `['synthwave', 'techno']`; `'composer'` groups are
     ordered by composer and each group's slots by title; codes are the same in both sorts.
   - `parseJukeboxSort('composer')` is `'composer'`; `null` and `'x'` give `'style'`.
   - `parseView('jukebox')` is `'jukebox'`; `nextView('playlist', 1)` is `'radio'`;
     `nextView('radio', -1)` is `'playlist'`; `nextView('radio', 1)` is `'jukebox'`.
   - On the real library (`LIBRARY` from `../src/music/library`): every original has a code, the
     codes are unique, and the count of codes equals the count of originals.

8. `README.md`: in the features list, after the Playlist bullet, add one bullet for the Jukebox
   view (originals as a wall of coded title strips, grouped by style or composer, tap to play in
   the home style, + to add to the playlist). Update the header switch text to
   `Radio | Jukebox | Playlist`, and add `J jukebox` to the keyboard shortcuts line.

9. `docs/how-it-works.md`: next to the `playlist-view.ts` line in the UI file list, add one line
   saying `jukebox.ts` is the jukebox view (the wall of originals) and keeps its codes and
   grouping as pure exported functions.

## Acceptance

- `npm run test:sandbox` exits 0, and its output shows `tests/jukebox.test.ts` passing.
- `git status --porcelain -- . ":(exclude).handoff"` lists only files from **Files to touch**.
- `git grep -n "jukebox.setCurrent" -- src/ui/ui.ts` prints at least three lines.
- `git grep -n "data-view=\"jukebox\"" -- index.html` prints one line.
- `git diff -- src/songs src/audio` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not use the word "share" in any new element id or class.
- Keep the module level of `src/ui/jukebox.ts` free of DOM access (only inside `createJukebox`).
- Do not change songs, audio code, the dial, or the playlist's saved format.
- Files use LF line endings, UTF-8, and 2-space indents; match the surrounding code style.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- Browser checks, per-style colours on strips, sorting by date, search, share links for the
  jukebox, changes to the Radio or Playlist views beyond what is listed.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
