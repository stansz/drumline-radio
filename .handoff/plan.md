## Goal
Second pass of the generator cleanup: move four more pieces of copied plumbing into
`tools/arranger/lib.mjs` (note naming, offset text, velocity clamping, and the common section
builder) and switch every generator that carries a copy to it. Every generated song stays
byte-identical (`tests/drift.test.ts`). `lib.mjs` keeps holding plumbing only: no melodies, chords,
voicings, rhythms, grooves or velocity choices.

## Files to touch
- `tools/arranger/lib.mjs`
- `tools/arranger/arranger.mjs`, `club.mjs`, `confetti-cannon.mjs`, `fathom.mjs`, `fur-elise.mjs`,
  `greensleeves.mjs`, `ivory-and-ash.mjs`, `last-stop.mjs`, `mountain-king.mjs`,
  `night-bus-home.mjs`, `night-shift.mjs`, `nocturne.mjs`, `riverfront.mjs`, `save-point.mjs`,
  `sunliner.mjs`, `swan-lake.mjs`, `the-silent-keep.mjs`, `velvet-freeway.mjs` (all in
  `tools/arranger/`)
- `tools/README.md` (the paragraph about `arranger/lib.mjs` in `## Arranger` only)
- `.handoff/report.md` (new)

## Steps
1. Run `npm ci`, then `npx vitest run tests/drift.test.ts` and confirm it passes before any edit.
2. Add to `tools/arranger/lib.mjs`, keeping its header comment and existing exports unchanged and
   adding no imports:
   - Three exported name tables, each with a one-line comment:
     `SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']`,
     `FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']`,
     `MIXED = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']`.
   - `noteName(midi, names = SHARPS)`: `` `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}` ``.
   - `offsetText(ticks)`: `''` when `ticks` is falsy (0, undefined), `` `+${ticks}` `` when positive,
     `String(ticks)` when negative.
   - `clampVelocity(v, max = 127)`: `Math.max(1, Math.min(max, Math.round(v)))`.
   - `sectionBuilder(keys)`: returns `{ tracks, marks, section }` where `tracks` is
     `Object.fromEntries(keys.map((k) => [k, []]))`, `marks` is `[]`, and
     `section(name, n, parts)` pushes `[tracks[keys[0]].length, name]` onto `marks`, then for each
     key in `keys` order takes `list = parts[key] ?? []`, throws
     `` `${name}: ${key} has ${list.length} bars, more than ${n}` `` if `list.length > n`, and pushes
     `list[i] ?? 'R'` for `i` from 0 to `n - 1`.
3. Note naming. In each of these scripts, delete the local name table and make `nm` a one-line call
   to `noteName` with the matching table, importing what it uses from `./lib.mjs`:
   `SHARPS` for `arranger.mjs` (keep it exported as `export const nm = (n) => noteName(n, SHARPS);`),
   `confetti-cannon.mjs`, `save-point.mjs`, `sunliner.mjs`, `swan-lake.mjs`, `velvet-freeway.mjs`;
   `MIXED` for `club.mjs`, `fur-elise.mjs`, `greensleeves.mjs`, `ivory-and-ash.mjs`,
   `mountain-king.mjs`, `night-shift.mjs`, `nocturne.mjs`, `the-silent-keep.mjs`;
   `FLATS` for `fathom.mjs`, `riverfront.mjs`. If a script uses its old table anywhere besides
   `nm`, point those uses at the imported table.
4. Offset text. Replace the local formatters with `offsetText`: `off` in `velvet-freeway.mjs` and
   `sunliner.mjs` (keep the local name: `const off = offsetText;` or replace its call sites),
   `shiftOf` in `night-bus-home.mjs` (same), and the inline `` off ? `${off > 0 ? '+' : ''}${off}` : '' ``
   in `fathom.mjs` (becomes `offsetText(off)`).
5. Velocity clamp. Replace `clamp` in `confetti-cannon.mjs`, `night-bus-home.mjs` and `fathom.mjs`
   with `clampVelocity` (keep the local name or replace call sites), and `vel` in `sunliner.mjs` and
   `velvet-freeway.mjs` with `(v) => clampVelocity(v, 126)`; their 126 cap stays in their own script.
6. Section builder. In `fathom.mjs`, `ivory-and-ash.mjs`, `last-stop.mjs`, `night-shift.mjs`,
   `night-bus-home.mjs` and `riverfront.mjs`, replace the local `tracks`, `marks` and
   `function section(name, n, parts)` declarations with
   `const { tracks, marks, section } = sectionBuilder(keys);`. Where the script has no `keys` array
   (`ivory-and-ash.mjs`, `last-stop.mjs`), define `keys` as the track names in the order of its old
   `tracks` object literal. Do not change any other `section` function.
7. In `tools/README.md`, update the `arranger/lib.mjs` paragraph so its list of shared plumbing
   names all its exports (`writeBlock`, `barLength`, `noteName` with `SHARPS`/`FLATS`/`MIXED`,
   `offsetText`, `clampVelocity`, `sectionBuilder`). Keep the sentence that musical choices stay in
   each song's own script.
8. Run every **Acceptance** command and write `.handoff/report.md`.

## Acceptance
- `npx vitest run tests/drift.test.ts` exits 0.
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `grep -l "Math.floor(n / 12) - 1" tools/arranger/*.mjs` prints nothing.
- `grep -l "Math.min(127, Math.round\|Math.min(126, Math.round" tools/arranger/*.mjs` prints nothing.
- `grep -l "^function section(name, n, parts) {" tools/arranger/*.mjs` prints nothing.
- `grep -l "^import" tools/arranger/lib.mjs` prints nothing.
- `grep -cE "\b[A-G][#b]?[0-9]\b" tools/arranger/lib.mjs` prints `0`.
- `node -e "import('./tools/arranger/lib.mjs').then(m=>{console.log(m.noteName(63), m.noteName(63, m.MIXED), m.noteName(70, m.FLATS), m.offsetText(12), m.offsetText(-6), JSON.stringify(m.offsetText(0)), m.clampVelocity(130), m.clampVelocity(130, 126), m.clampVelocity(0.2)); const b=m.sectionBuilder(['a','b']); b.section('One', 2, {a:['x']}); console.log(JSON.stringify(b.tracks), JSON.stringify(b.marks))})"`
  prints exactly two lines: `D#4 Eb4 Bb4 +12 -6 "" 127 126 1` and
  `{"a":["x","R"],"b":["R","R"]} [[0,"One"]]`.
- `git diff --name-only` lists only files from **Files to touch**, plus `.handoff/plan.md` if it was
  already modified when the run started.

## Parallel work
None — do it sequentially.

## Constraints
- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`. Temporary files in
  `/tmp` and installing dependencies are fine.
- Do not change any file in `src/songs/`. If the drift test fails, fix the script, never a song file.
- No browser is needed.

## Out of scope
- The other `section` functions (`section(name, bars, parts)`, `section(name, n, p)`,
  `section(name, n, parts, by = 0)`, `section(name, n, time, parts)`,
  `section(name, progression, parts)` and the builder method in `club.mjs`).
- Any musical helper, `confetti-cannon.mjs`'s bar writer, `songs.mjs`, any test, and `src/`.

## If blocked
- If one script cannot switch a helper and keep byte-identical output, leave that helper in that
  script unchanged, list it in the report, and continue with the rest.
- If the drift test fails before any edit (step 1), stop and report.
