## Goal

Every song gets a required `category` header (`carols`, `classics`, or `originals`). The player gets a row of
category preset buttons (All, Carols, Classics, Originals) above the tuner dial. Picking a preset shows only that
category's stations on the dial, and previous/next, ←/→, and auto-advance stay inside it. The choice is
remembered in localStorage.

## Files to touch

- `src/music/song.ts`
- `src/music/library.ts`
- `src/ui/view.ts`
- `src/ui/dial.ts`
- `src/ui/ui.ts`
- `src/ui/style.css`
- `index.html`
- all 23 files in `src/songs/*.song` (one header line each, nothing else)
- `tests/fixtures/features.song`
- `tests/song.test.ts`
- `tests/library.test.ts`
- `tests/view.test.ts`
- `docs/song-format.md`
- `docs/how-it-works.md`
- `README.md`

## Steps

1. `src/music/song.ts`:
   - Export `export const CATEGORIES = ['carols', 'classics', 'originals'] as const;` and
     `export type Category = (typeof CATEGORIES)[number];`.
   - Add `category: Category;` to `SongMeta` (after `source`).
   - Add `'category'` to `REQUIRED_HEADER_KEYS` (after `'source'`).
   - Default `category: 'classics'` in the `meta` object. Parse it like `source`: if the value is one of
     `CATEGORIES`, set it; otherwise `err(entry.line, \`unknown category '${value}'\`)`.

2. Song files. In each file below, insert exactly one line `category: <value>` directly after its `source:` line.
   Change nothing else in the song files.
   - `carols`: deck-the-halls, god-rest-ye, good-king-wenceslas, hark-the-herald, jingle-bells, joy-to-the-world,
     o-christmas-tree, silent-night, we-wish-you.
   - `classics`: can-can, canon-in-d, eine-kleine-nachtmusik, fur-elise, greensleeves, korobeiniki, mountain-king,
     ode-to-joy, swan-lake, valkyries, when-the-saints.
   - `originals`: midnight-arcade, night-shift, save-point.
   - Also insert `category: originals` after the `source:` line of `tests/fixtures/features.song`.

3. `src/music/library.ts`: change `sortedEntries` to sort by the category's index in `CATEGORIES`, then by
   `title.localeCompare` (replaces the source rank).

4. `src/ui/view.ts` (keep it free of DOM and audio). Import `CATEGORIES` and type `Category` from `../music/song`.
   - `export type CategoryFilter = Category | 'all';`
   - `export const CATEGORY_FILTERS: CategoryFilter[] = ['all', ...CATEGORIES];`
   - `export function categoryLabel(filter: CategoryFilter): string` returns `All`, `Carols`, `Classics`,
     `Originals`.
   - `export function parseCategory(stored: string | null): CategoryFilter` returns the stored value if it is in
     `CATEGORY_FILTERS`, otherwise `'all'`.
   - `export function stationsIn(categories: Category[], filter: CategoryFilter): number[]` returns the indices
     whose category matches (`'all'` returns every index), in order.
   - `export function stepStation(visible: number[], current: number, delta: number): number`: if `visible` is
     empty return `current`; if `current` is not in `visible` return `visible[0]`; otherwise return the entry
     `delta` places away, wrapping around.
   - Change `nextAfterEnd` to `nextAfterEnd(current: number, visible: number[], repeatOne: boolean): number`:
     returns `current` when `repeatOne`, otherwise `stepStation(visible, current, 1)`.

5. `src/ui/dial.ts`:
   - Station captions: instead of grouping by `source`, add the caption span to the first station of each
     category (in library order), with text `categoryLabel(entry.song.meta.category)`.
   - Add `filter(visible: number[]): void` to the `Dial` interface. It toggles the class `hidden` on every station
     button not in `visible`. It does not scroll and does not call `onTune`.
   - Everything that finds stations by position must use only visible stations: snapping after a scroll,
     `tuning()`, and the ←/→ keydown handler (use `stepStation(visible, current, ±1)`). Compute centres only for
     visible stations and map the result of `nearestStation` back to the real library index.
   - `select(index)` ignores an index that is hidden.
   - Station frequency labels stay `stationLabel(index)` of the library index (they do not renumber).

6. `index.html`: inside `<section class="tuner">`, before `<div class="dial-wrap">`, add
   `<div id="presets" class="presets" role="radiogroup" aria-label="Category"></div>`.

7. `src/ui/ui.ts`:
   - New key `const CATEGORY_KEY = 'drumline-radio-category';`, read with the existing `load()` through
     `parseCategory`, written with `save()`.
   - Build one preset button per `CATEGORY_FILTERS` entry in `#presets`, the same way the band buttons are built:
     `button.type='button'`, class `preset`, `role="radio"`, text `categoryLabel(filter)`, `aria-checked` true for
     the active one. ←/→ on `#presets` moves between presets like the bands keydown handler does.
   - Keep `let category: CategoryFilter` and a helper `visible(): number[]` =
     `stationsIn(LIBRARY.map((e) => e.song.meta.category), category)`.
   - `selectCategory(filter)`: save it, update `aria-checked`, call `dial.filter(visible())`. If `current` is in
     `visible()`, call `dial.select(current, false)`. Otherwise call `loadSong(visible()[0])` (this keeps the
     current play/pause state: it plays on if music was playing, stays paused or not started otherwise).
   - `next()` uses `loadSong(stepStation(visible(), current, 1))`. `previous()` keeps its restart rule, and
     otherwise uses `loadSong(stepStation(visible(), current, -1))`. `handleEnded()` uses
     `nextAfterEnd(current, visible(), repeat)`.
   - Keyboard: `C` / `c` cycles to the next entry of `CATEGORY_FILTERS` (wrapping), through `selectCategory`.
     Add it to the existing global keydown handler next to M and R.
   - Startup: after creating the dial and before the first `dial.select`, apply the stored category: call
     `dial.filter(visible())`, set `current = visible()[0]`, and show that song as the start screen (title, "Press
     play", its style) instead of always `LIBRARY[0]`.

8. `src/ui/style.css`:
   - `.station.hidden { display: none; }`
   - `.presets { display: flex; gap: 6px; }` and `.preset` styled like `.band` but smaller: `padding: 6px 8px;
     font-size: 11px;`. `.preset[aria-checked='true']` uses the same accent border, colour, and glow as
     `.band[aria-checked='true']`.
   - Inside the existing `@media (max-width: 640px)` block: `.preset { padding: 4px 4px; font-size: 10px;
     letter-spacing: 0.06em; }` so all four fit on one row at 360 px wide.

9. Tests:
   - `tests/song.test.ts`: add `'category: originals',` after `'source: original',` in `HEADER`. Add a test that
     a header with `category: jazz` gives an error containing `unknown category 'jazz'`, and one that a header
     without `category` gives an error containing `missing category`.
   - `tests/library.test.ts`: rename the order test to `orders by category then title` and expect exactly:
     deck-the-halls, god-rest-ye, good-king-wenceslas, hark-the-herald, jingle-bells, joy-to-the-world,
     o-christmas-tree, silent-night, we-wish-you, can-can, canon-in-d, eine-kleine-nachtmusik, fur-elise,
     greensleeves, mountain-king, korobeiniki, ode-to-joy, valkyries, swan-lake, when-the-saints,
     midnight-arcade, night-shift, save-point. Add a test that counts per category are carols 9, classics 11,
     originals 3.
   - `tests/view.test.ts`: update `nextAfterEnd` tests to the new signature
     (`nextAfterEnd(2, [0,1,2,3,4], true)` → 2; `nextAfterEnd(2, [0,2,4], false)` → 4;
     `nextAfterEnd(4, [0,2,4], false)` → 0). Add tests for `stepStation` (forward, backward with wrap, current not
     visible → first visible, empty list → current), `stationsIn` (`'all'` and one category), and
     `parseCategory` (valid value, `null`, `'jazz'` → `'all'`).

10. Docs:
    - `docs/song-format.md`: add a row to the header table after `source`:
      `` | `category` | yes      | `carols`, `classics`, or `originals`. Picks the preset group in the player. | ``.
      Add `category: originals` after `source: original` in the full example. Add `unknown category` to the list
      of header errors (the line that lists unknown `source`/`style`).
    - `docs/how-it-works.md`: add `category: originals` after `source: original` in the one-minute song example,
      and one sentence under `src/music/` → `library.ts`: songs are sorted by category, then title.
    - `README.md`: add a feature bullet after the tuner dial bullet: `- Category presets (All, Carols, Classics,
      Originals) above the dial show just that group of stations (remembered between visits).` Add `C category` to
      the keyboard shortcuts bullet, after `1–4 styles`.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0, with the new tests passing.
- `git diff --stat -- src/songs` shows 23 files changed, each with 1 insertion and 0 deletions.
- `grep -c "^category: " src/songs/*.song` prints 1 for every file.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any note, track, or other line in the song files except the one inserted `category:` line.
- Wrap every localStorage access in try/catch (use the existing `load`/`save` helpers in `ui.ts`).
- Keep `src/music/` and `src/ui/view.ts` free of DOM and audio APIs.
- No new dependencies.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report it. Do not
  request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Changing the styles, band buttons, engine, or audio code.
- Renumbering station frequencies.
- Any new category beyond the three listed.

## If blocked

Stop, write what failed and the exact error in `.handoff/report.md`, and do not improvise a different design.
