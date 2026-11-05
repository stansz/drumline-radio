## Goal

Four changes to Drumline Radio:

1. A drift guard: a Vitest test that runs every song generator into a temp folder and fails if any
   generated `.song` file differs from the copy in `src/songs/`.
2. One shared writer in `tools/arranger/arranger.mjs`: `arrange()` and `arrangeForm()` end with the
   same ~30 lines (`block()`, the track table, the ramp line, the write). Move that tail into one
   `writeSong()` helper. Every generated song must stay byte-identical (the drift guard proves it).
3. Category order: Classics, Originals, Carols (carols move to the far right of the preset row and
   to the end of the dial).
4. A `hidden: true` song header. Hidden songs still parse (and are still checked) but are left out of
   the library. Hide Can-Can, Eine kleine Nachtmusik, Ode to Joy, and When the Saints Go Marching In.

## Files to touch

- `tests/drift.test.ts` (new)
- `vitest.sandbox.config.mjs`
- `tools/arranger/arranger.mjs`
- `tools/arranger/songs.mjs`
- `src/music/song.ts`
- `src/music/library.ts`
- `tests/song.test.ts`
- `tests/library.test.ts`
- `src/songs/can-can.song`, `src/songs/eine-kleine-nachtmusik.song`, `src/songs/ode-to-joy.song`,
  `src/songs/when-the-saints.song` (only by regenerating them with `node tools/arranger/songs.mjs`)
- `README.md`, `docs/song-format.md`, `tools/README.md`, `AGENTS.md`

## Steps

1. `tests/drift.test.ts`: one `it` per generator script in this list:
   `tools/arranger/songs.mjs`, `tools/arranger/originals.mjs`, `tools/arranger/ivory-and-ash.mjs`,
   `tools/arranger/club.mjs`, `tools/arranger/nocturne.mjs`. Each test:
   - makes a temp dir with `mkdtempSync(join(tmpdir(), 'radio-drift-'))`;
   - runs `execFileSync(process.execPath, [script, dir], { stdio: 'pipe' })` from the repo root;
   - lists the `.song` files written to `dir` and expects at least one;
   - for each, reads it and `src/songs/<same name>`, normalises both with `.replace(/\r\n/g, '\n')`,
     and expects them equal, with the file name in the assertion message
     (`expect(generated, \`${file} differs from src/songs: re-run ${script}\`).toBe(committed)`);
   - removes the temp dir in a `finally` (`rmSync(dir, { recursive: true, force: true })`).
   Add a top comment: the generators are deterministic, so a recipe edit that was not regenerated
   (or a hand edit to a generated file) fails here; hand-written songs have no generator and are
   not checked.
2. `vitest.sandbox.config.mjs`: exclude `tests/drift.test.ts` from the sandbox run (the dsh sandbox
   blocks child processes). Use `import { configDefaults } from 'vitest/config'` and
   `exclude: [...configDefaults.exclude, 'tests/drift.test.ts']` inside `test`, keeping the existing
   `pool: 'threads'` and `resolve` settings. Add one comment line saying why.
3. `tools/arranger/arranger.mjs`: add a module-level function
   `writeSong(out, spec, { T, comment, tracks, style, ts })` that contains the shared tail:
   `block()`, the `ramp` line, building `text` (header from `spec.head.trim()`, then `style`, `tempo`,
   `time`, the ramp, then the tracks), and `writeFileSync(join(out, spec.file), text)`. Each arranger
   keeps building its own `tracks` table (they differ: harmony volume 0.45 vs 0.4, the harmony role
   default, and the arp volume for tease intros) and calls `writeSong`. If `spec.hidden` is true,
   `writeSong` adds the line `hidden: true` directly after the head (before `style:`). Delete the two
   duplicated tails. The output for every existing recipe must not change by a single byte.
4. `src/music/song.ts`:
   - Change `CATEGORIES` to `['classics', 'originals', 'carols'] as const`.
   - Add `hidden: boolean` to `SongMeta` (default `false`) and `'hidden'` to `KNOWN_HEADER_KEYS`.
     Parse it next to `about`: the only allowed value is `true`; any other value is an error
     `hidden must be true` at that line (an absent header means not hidden).
5. `src/music/library.ts`: parse every file as now (parse errors still go to `LIBRARY_ERRORS`), but
   leave songs with `meta.hidden` out of `LIBRARY`. Export `HIDDEN_IDS: string[]` (sorted ids of the
   hidden songs that parsed).
6. `tools/arranger/songs.mjs`: add `hidden: true` to the recipes for `can-can.song`,
   `eine-kleine-nachtmusik.song`, `ode-to-joy.song`, and `when-the-saints.song`. Then run
   `node tools/arranger/songs.mjs` to regenerate `src/songs/`; the only changed song files must be
   those four, each gaining exactly one line `hidden: true`.
7. `tests/song.test.ts`: add tests: `hidden: true` gives `meta.hidden === true`; no header gives
   `false`; `hidden: yes` is an error containing `hidden must be true`.
8. `tests/library.test.ts`:
   - `LIBRARY.length` is 24; add `expect(HIDDEN_IDS).toEqual(['can-can', 'eine-kleine-nachtmusik', 'ode-to-joy', 'when-the-saints'])`.
   - The id order becomes exactly:
     `canon-in-d, fur-elise, greensleeves, mountain-king, korobeiniki, nocturne, valkyries, swan-lake,
     ivory-and-ash, ivory-and-ash-128, last-stop, midnight-arcade, night-shift, save-point, underpass,
     deck-the-halls, god-rest-ye, good-king-wenceslas, hark-the-herald, jingle-bells,
     joy-to-the-world, o-christmas-tree, silent-night, we-wish-you`.
   - Category counts: classics 8, originals 7, carols 9.
   - Rewrite the expected styles array in the same order, taking each value from that song's
     `style:` header in `src/songs/`.
   - Any other test that assumed the old order or old count: update the expectation (never song files).
9. Docs:
   - `README.md`: the presets bullet reads "Category presets (All, Classics, Originals, Carols)";
     move Can-Can, Eine kleine Nachtmusik, Ode to Joy, and When the Saints out of the song list into
     one line under it: "Hidden for now, to be redone later: Can-Can, Eine kleine Nachtmusik, Ode to
     Joy, When the Saints Go Marching In."
   - `docs/song-format.md`: add `hidden` to the header table ("No | `true` leaves the song out of the
     library; it is still parsed and checked.") and the error to the error list.
   - `tools/README.md`: describe `tests/drift.test.ts` (what it checks, that it runs in `npm test`
     but not in `npm run test:sandbox`), and that the arranger's shared `writeSong()` writes every
     arranged song and adds `hidden: true` for a recipe with `hidden: true`.
   - `AGENTS.md`: in the rule about arranged songs, add that `tests/drift.test.ts` fails when a
     generated song in `src/songs/` doesn't match its generator; and that a song is hidden with a
     `hidden: true` header (set in its recipe when it has one).
   - Fix any other doc sentence these changes make false.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0 (it skips `tests/drift.test.ts`).
- `node tools/arranger/songs.mjs tmp/a && node tools/arranger/originals.mjs tmp/a && node tools/arranger/ivory-and-ash.mjs tmp/a && node tools/arranger/club.mjs tmp/a && node tools/arranger/nocturne.mjs tmp/a`
  writes 21 files, and `git diff --stat -- src/songs` lists only the four hidden songs, 1 insertion each.
  Delete `tmp/a` afterwards.
- `git status --porcelain` lists only files from **Files to touch** (plus `.handoff/`).

Verifier only:
- `npm test` exits 0, including `tests/drift.test.ts` (5 tests).
- `npm run build` exits 0.
- `npm run check:songs` passes (it still parses the 4 hidden songs).
- Headless Edge: the preset row reads All, Classics, Originals, Carols; the dial has 24 stations and
  none of the hidden four.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.
- Never hand-edit a generated `.song` file; change recipes or the arranger and regenerate.
- Do not touch any other `.song` file, `src/audio/*`, or `src/ui/*`.
- No new dependencies.

## Out of scope

Rewriting `arrange()` on top of `arrangeForm()`; changing any song's notes; redoing the hidden songs;
a UI to show hidden songs.

## If blocked

Stop, leave the working tree as is, and write in `.handoff/report.md` which step failed, the exact
command and error output, and what you think the fix is.
