## Goal

Add 17 public-domain songs (Christmas carols and classics) to Drumline Radio, credit them in the
README, and add a repeat button that makes the current song loop instead of moving to the next
station.

## Files to touch

- `src/songs/*.song`: add the 17 files from `.handoff/songs/` (copied byte for byte)
- `tests/library.test.ts`
- `index.html`, `src/ui.ts`, `src/view.ts`, `src/style.css`
- `tests/view.test.ts`
- `README.md`, `AGENTS.md`

Do not modify any other file, and do not edit or remove the 6 existing files in `src/songs/`.

## Steps

### 1. Songs

1. Copy every file in `.handoff/songs/` into `src/songs/` with the same name. Do not change them.
2. In `tests/library.test.ts`:
   - `LIBRARY.length` is 23.
   - The id order test expects exactly:
     `['can-can', 'canon-in-d', 'deck-the-halls', 'eine-kleine-nachtmusik', 'fur-elise', 'god-rest-ye', 'good-king-wenceslas', 'greensleeves', 'hark-the-herald', 'mountain-king', 'jingle-bells', 'joy-to-the-world', 'korobeiniki', 'o-christmas-tree', 'ode-to-joy', 'valkyries', 'silent-night', 'swan-lake', 'we-wish-you', 'when-the-saints', 'midnight-arcade', 'night-shift', 'save-point']`
   - The style test expects exactly:
     `['chiptune', 'orchestral', 'synthwave', 'techno', 'synthwave', 'techno', 'chiptune', 'orchestral', 'orchestral', 'chiptune', 'chiptune', 'orchestral', 'chiptune', 'orchestral', 'orchestral', 'orchestral', 'synthwave', 'orchestral', 'synthwave', 'synthwave', 'synthwave', 'techno', 'chiptune']`
   - Keep the other tests. Add one: `fur-elise` has every bar after bar 0 in `[3, 8]` and
     `song.meta.pickupTicks` 480.

### 2. Repeat button

1. `src/view.ts`: export
   `nextAfterEnd(current: number, count: number, repeatOne: boolean): number` — returns `current`
   when `repeatOne` is true, otherwise `(current + 1) % count`. (`count` is at least 1.)
2. `tests/view.test.ts`: `nextAfterEnd(2, 5, true) = 2`, `nextAfterEnd(2, 5, false) = 3`,
   `nextAfterEnd(4, 5, false) = 0`, `nextAfterEnd(0, 1, false) = 0`.
3. `index.html`: in `.transport`, right after the `#next` button, add
   `<button id="repeat" class="knob knob-small" type="button" aria-label="Repeat this song" aria-pressed="false" title="Repeat this song (R)">⟳</button>`.
4. `src/ui.ts`:
   - Read the setting with the existing `load()` helper from key `drumline-radio-repeat`
     (`'1'` = on); default off. Save with the existing `save()` helper on every change.
   - `toggleRepeat()` flips it, sets `aria-pressed` to `"true"`/`"false"`, toggles the class
     `on` on the button, and saves.
   - The button's click calls `toggleRepeat()`. In the document `keydown` handler (after the
     seek/volume focus check), `r` or `R` calls `toggleRepeat()`.
   - `handleEnded()` becomes: `loadSong(nextAfterEnd(current, LIBRARY.length, repeat))`, then
     `engine?.play()` and `updatePlayButton()` as now. When repeating, `loadSong` reloads the same
     song from 0, which is the intended behaviour.
   - Apply the stored state to the button at startup.
5. `src/style.css`:
   - `.knob-small` is the same as `.knob` but 36 px (and 30 px inside the existing
     `@media (max-width: 640px)` block), font size 14 px (12 px on phones).
   - `.knob.on` uses `color: var(--accent)` and `box-shadow: 0 0 10px var(--glow)`; without `on`
     it uses `color: var(--muted)`.
   - The phone layout must still fit without vertical or horizontal scrolling at 360 × 640 and
     375 × 553. If the transport row is too wide on phones, reduce the gap between items in that
     row to 6 px inside the phone media query.

### 3. Docs

- `README.md`: replace the "Public-domain melodies, arranged by Claude:" list with two lists.
  - "Christmas carols, arranged by Claude:" — Deck the Halls (traditional Welsh), God Rest Ye Merry
    Gentlemen (traditional English), Good King Wenceslas (melody from *Piae Cantiones*, 1582),
    Hark! The Herald Angels Sing (Felix Mendelssohn, 1840), Jingle Bells (James Lord Pierpont,
    1857), Joy to the World (arranged by Lowell Mason, 1839), O Christmas Tree (traditional German),
    Silent Night (Franz Xaver Gruber, 1818), We Wish You a Merry Christmas (traditional English).
  - "Other public-domain melodies, arranged by Claude:" — the existing three entries (keep their
    text), plus Can-Can (Jacques Offenbach, 1858), Canon in D (Johann Pachelbel, around 1680),
    Eine kleine Nachtmusik (Wolfgang Amadeus Mozart, 1787), Für Elise (Ludwig van Beethoven,
    1810), Korobeiniki, the Tetris tune (Russian folk song, 1861), Ode to Joy (Ludwig van
    Beethoven, 1824), Swan Lake (Pyotr Ilyich Tchaikovsky, 1876), When the Saints Go Marching In
    (traditional).
  - Each entry is one line: `- **Title** (credit). Style.` with the style from its song file
    (capitalised: Synthwave, Chiptune, Orchestral, Techno).
  - Keyboard shortcuts line: add `R repeat`. Feature list: add "A repeat button that loops the
    current song (remembered between visits)."
- `AGENTS.md`: no rule changes needed unless a statement becomes false.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0 with 7 passed test files.
- `node -e "const fs=require('fs');for(const f of fs.readdirSync('.handoff/songs')){if(!fs.readFileSync('.handoff/songs/'+f).equals(fs.readFileSync('src/songs/'+f)))process.exit(1)}"` exits 0.
- `node -e "process.exit(require('fs').readdirSync('src/songs').length===23?0:1)"` exits 0.
- `git diff --exit-code -- src/songs` exits 0 (existing songs unchanged).

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.
- Headless Edge check (verifier).

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Copy the song files exactly; never edit notes to make a test pass.
- No new dependencies. Wrap storage access only through the existing `load()`/`save()` helpers.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Changing sounds, styles, the engine, or any existing song.

## If blocked

- If a library test expectation disagrees with the files, leave it failing and report the actual
  values instead of editing songs.
