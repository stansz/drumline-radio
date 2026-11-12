## Goal
Move the song generators' copied plumbing into one shared module, `tools/arranger/lib.mjs`: the
function that writes a track's bars as song-file text, and the bar-length check. Every generated song
stays byte-identical (`tests/drift.test.ts` proves it). The module holds plumbing only: no pitches,
chords, voicings, rhythms, grooves or other musical choices, so songs never start to sound alike
through it.

## Files to touch
- `tools/arranger/lib.mjs` (new)
- `tools/arranger/arranger.mjs`
- `tools/arranger/greensleeves.mjs`
- `tools/arranger/fur-elise.mjs`
- `tools/arranger/fathom.mjs`
- `tools/arranger/mountain-king.mjs`
- `tools/arranger/ivory-and-ash.mjs`
- `tools/arranger/last-stop.mjs`
- `tools/arranger/nocturne.mjs`
- `tools/arranger/night-shift.mjs`
- `tools/arranger/night-bus-home.mjs`
- `tools/arranger/save-point.mjs`
- `tools/arranger/sunliner.mjs`
- `tools/arranger/riverfront.mjs`
- `tools/arranger/swan-lake.mjs`
- `tools/arranger/the-silent-keep.mjs`
- `tools/arranger/velvet-freeway.mjs`
- `tools/README.md` (the `## Arranger` section only)
- `.handoff/report.md` (new)

## Steps
1. Run `npm ci`, then `npx vitest run tests/drift.test.ts` and confirm it passes before any edit.
2. Create `tools/arranger/lib.mjs` with a header comment saying it holds plumbing shared by the
   generators and must never hold musical choices (pitches, chords, voicings, rhythms, grooves,
   patterns, velocities, swing amounts); those stay in each song's own script. It has no imports
   and exports exactly these two functions:
   - `writeBlock(bars, marks = [], { perRow = 4, first = null } = {})`: returns the track's bars as
     song-file lines joined with `\n`. If `first` is not null, the first line is `| ${first} |`.
     `marks` is an array of `[barIndex, text]` pairs or a `Map` of the same; before the bar at a
     marked index, the pending row is flushed and the line `# ${text}` is written. Bars are written
     `perRow` to a line as `| a | b | c | d |`; a short last row is written as it is. This is the
     same behaviour as the existing `block` functions listed in step 3.
   - `barLength(bar, wholeBar = 3840)`: the length in ticks of one bar string. `'R'` and `null`
     return `wholeBar`. Otherwise split the bar into tokens with
     `bar.match(/\[[^\]]*\][^\s]*|[^\s]+/g) ?? []`; each token must contain a duration matching
     `/\/(\d+)(\.\.|\.|t)?/` (throw `no duration in token ${token}` if not); its ticks are
     `{1: 3840, 2: 1920, 4: 960, 8: 480, 16: 240, 32: 120, 64: 60}[n]` times 1.75 for `..`, 1.5 for
     `.`, 2/3 for `t`, else 1, each token rounded with `Math.round`; return the sum. Throw
     `unknown duration /${n} in token ${token}` for a base not in the table.
3. In each of these scripts, delete the local `block` function's body and make it a one-line call
   to `writeBlock`, keeping the name `block` and its existing parameters and call sites, and import
   `writeBlock` from `./lib.mjs`:
   `arranger.mjs` (inside `arrange`/its function: `writeBlock(T[key], comment[key])`),
   `greensleeves.mjs` (`writeBlock(parts[key], marks, { first: pick })`),
   `fur-elise.mjs` (`writeBlock(tracks[key], SECTIONS, { perRow: 6, first: pickup })`),
   `fathom.mjs`, `mountain-king.mjs`, `ivory-and-ash.mjs`, `last-stop.mjs`, `nocturne.mjs`,
   `night-shift.mjs`, `night-bus-home.mjs`, `save-point.mjs`, `sunliner.mjs`, `riverfront.mjs`,
   `swan-lake.mjs`, `the-silent-keep.mjs`, `velvet-freeway.mjs`. For the ones not given above, read
   the local `block` and pass the same bars array, the same marks, and `perRow`/`first` only if the
   local version differs from the defaults.
4. In `fathom.mjs`, `night-bus-home.mjs`, `riverfront.mjs` and `the-silent-keep.mjs`, delete the
   local `barTicks` bar-length function and any duration table used only by it (`TICKS`,
   `DUR_TICKS`), import `barLength` from `./lib.mjs`, and call `barLength(bar)` where `barTicks(bar)`
   was called (in `the-silent-keep.mjs`: `barLength(bar, (Number(times[i].split('/')[0]) * 3840) / Number(times[i].split('/')[1]))`,
   or an equivalent local helper computing the whole-bar ticks from the time string). Keep each
   script's own loop and error message around the call. Do not touch `arranger.mjs`'s `barTicks`,
   which computes a time signature's ticks and is not a bar-length check.
5. Do not change `confetti-cannon.mjs`; its writer has a different layout.
6. In `tools/README.md`'s `## Arranger` section, add a short paragraph: `arranger/lib.mjs` holds
   plumbing shared by the generators (`writeBlock`, `barLength`), and only plumbing: melodies,
   chords, voicings, grooves and every other musical choice stay in each song's own script, so a
   new song starts from a blank musical slate.
7. Run every **Acceptance** command and write `.handoff/report.md`.

## Acceptance
- `npx vitest run tests/drift.test.ts` exits 0.
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `grep -l "row.join" tools/arranger/*.mjs` prints exactly `tools/arranger/lib.mjs`.
- `grep -l "no duration in token" tools/arranger/*.mjs` prints exactly `tools/arranger/lib.mjs`.
- `grep -c "^import" tools/arranger/lib.mjs` prints `0`.
- `grep -cE "\b[A-G][#b]?[0-9]\b" tools/arranger/lib.mjs` prints `0`.
- `node -e "import('./tools/arranger/lib.mjs').then(m=>{console.log(m.barLength('C4/4 D4/8. E4/16 [C4 E4]/2'), m.barLength('R'), m.barLength('C4/8t C4/8t C4/8t r/2.'), m.writeBlock(['a','b','c','d','e'], [[4,'Two']], {first:'p'}))})"`
  prints exactly these four lines: `3840 3840 3840 | p |`, `| a | b | c | d |`, `# Two`, `| e |`.
- `git diff --name-only` lists only files from **Files to touch** (`lib.mjs` and `report.md` are
  untracked).

## Parallel work
None — do it sequentially.

## Constraints
- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`. Temporary files in
  `/tmp` and installing dependencies are fine.
- Do not change any file in `src/songs/`. Every generator's output must stay byte-identical; if
  `tests/drift.test.ts` fails after a script is changed, fix that script, never a song file.
- No browser is needed; do not run `npm run balance` or other browser checks.

## Out of scope
- Moving any musical helper (`seq`, `grid`, `bassBar`, `stabBar`, `groove`, voicing tables, swing,
  hold or gesture code) into `lib.mjs`.
- `confetti-cannon.mjs`, `songs.mjs`, `club.mjs`, `moonlight.mjs`, `clair-de-lune.mjs`,
  `exit-sign.mjs`, and any test file.
- Any change to `src/`.

## If blocked
- If a script's local `block` cannot be expressed with `writeBlock` and keep its output identical,
  leave that script's `block` as it is and list it in the report.
- If the drift test fails before any edit (step 1), stop and report.
