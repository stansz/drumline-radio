## Goal

Two small composing aids: (1) when a bar's length is wrong, the parse error lists every token in
that bar with the ticks it got, so a sticky-duration mistake is obvious; (2) `npm run check:songs`
can check a single song.

## Files to touch

- `src/music/song.ts`
- `tests/song.test.ts`
- `tools/check/songs.check.ts`
- `tools/README.md`

## Steps

1. `src/music/song.ts`, in the loop over `assembledBar.tokens` that accumulates `barTicks`:
   - Keep a list `barParts: string[]`, reset with `barTicks` for each bar. Whenever a rest or note
     token adds to `barTicks`, push `` `${token.text} ${parsed.ticks}` `` (the token as written,
     then the ticks it got, including a duration inherited from the sticky duration).
   - Change the bar-length error to:

     ```ts
     `track ${raw.id} bar ${barInfo.number} is ${barTicks} ticks, expected ${barInfo.ticks} ` +
       `(${Math.abs(barInfo.ticks - barTicks)} ${barTicks < barInfo.ticks ? 'short' : 'over'}): ` +
       barParts.join(', ')
     ```

     Example: `track beat bar 44 is 2400 ticks, expected 2880 (480 short): h/4 960, s/8' 480, s/8' 480, h 480`.
   - Change nothing else in the parser.

2. `tests/song.test.ts`: the existing assertion
   `expect(errors).toContain('line 11: track a bar 1 is 4800 ticks, expected 3840');` must be updated
   to the new full message for that test's bar (work out the token list from the test's own song
   text). Add one test: a 4/4 drums track with the bar `| k/4 s/8 s h |` (2 × 480 + 960 + ... —
   compute it) gives an error containing `(` + the shortfall + ` short): k/4 960, s/8 480, s 480, h 480`.
   Use whatever header and track lines the file's other tests use for a minimal valid song.

3. `tools/check/songs.check.ts`: support an optional `SONG` environment variable.
   - If `SONG` is set, check only that song: its name is `basename(SONG)` without a trailing
     `.song`, and its folder is `dirname(SONG)` when `SONG` contains a `/` or `\`, otherwise `DIR`.
     So `SONG=wayfarers-rest`, `SONG=wayfarers-rest.song`, and `SONG=src/songs/wayfarers-rest.song`
     all check `src/songs/wayfarers-rest.song`.
   - If no file matches, the test fails with a message naming the path it looked for.
   - Update the usage comment at the top of the file with the `SONG=` form.
   - With `SONG` unset, behaviour is unchanged.

4. `tools/README.md`: in the section describing `npm run check:songs`, add one sentence: set `SONG`
   to a song's name or path (for example `SONG=wayfarers-rest npm run check:songs`) to check only
   that song. Also mention that a bar-length parse error lists each token with its ticks.

## Acceptance

- `npm run test:sandbox` exits 0, and its output shows `tests/song.test.ts` passing.
- `git diff --stat` and `git status --porcelain` list only files from **Files to touch** (plus
  `.handoff/` files).
- `git grep -n "short' : 'over'" -- src/music/song.ts` prints one line.
- `git grep -n "SONG" -- tools/check/songs.check.ts` prints at least two lines.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `SONG=wayfarers-rest npm run check:songs` exits 0 and its output names only `wayfarers-rest.song`.
- `npm run check:songs` exits 0 and lists every song.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any song file, any other parse error message, or parsing behaviour.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- A balance tool, pitch-class reports, browser checks, `docs/composing.md`.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
