## Goal

Two follow-ups to the last commit (`6b5bb1e`):
1. Put the balance check back exactly as it was before `6b5bb1e`: it compares parts against the
   `lead` track only, not the louder of `lead` and `lead2`.
2. Fix `# ok` lines in the song check so one line explains every clash and off-chord note that
   matches its bar, track and pitch, not just the first one.

No song file and no generator output changes.

## Files to touch

- `tools/browser/balance.mjs`
- `tools/README.md`
- `tools/check/songs.check.ts`
- `docs/song-format.md`, `docs/composing.md`
- `.handoff/report.md`

## Steps

1. Run `npm ci`.

2. Restore the balance check: `git show 47037c9:tools/browser/balance.mjs > tools/browser/balance.mjs`.

3. In `tools/README.md`, delete the sentence that `6b5bb1e` added to the balance section:
   "The lead in each section is the louder of the `lead` and `lead2` tracks, so a song that splits
   its melody between them is judged against whichever is carrying it." Re-wrap the paragraph so
   its text is exactly what it was at `47037c9`. Leave every other change `6b5bb1e` made to
   `tools/README.md` (the `barTicks` and `# ok` text) in place.

4. In `tools/check/songs.check.ts`, change the `explain` helper so it finds a matching `# ok` line
   whether or not that line has already matched something: remove the `!ok.used` condition from
   its `find`, and keep setting `used = true` on the line it finds. Replace the comment above it with:
   `// A matching \`# ok\` line explains every counted note in its bar, on its track, at its pitch.`
   Update the comment beside `OK_LINE` the same way if it says a line explains one note.

5. Docs: wherever `docs/song-format.md`, `docs/composing.md` and the song-check section of
   `tools/README.md` describe `# ok`, add that one line explains every clash and off-chord note of
   that pitch on that track in that bar (for example a held note that clashes with both the pad and
   the bass needs one line).

## Acceptance

- `git diff 47037c9 -- tools/browser/balance.mjs` prints nothing.
- `git diff 47037c9 -- tools/README.md | grep -c lead2` prints `0`.
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run check:songs` exits 0.
- `git status --porcelain src/ tests/ tools/arranger/` prints nothing.
- Write this file to `/tmp/okfix/ok-twice.song` (exactly these lines):

  ```
  # A held lead C#5 over a pad C4 and a bass C3 in bar 2: two clashes from one note.
  # ok @2 lead C#5: test
  title: Ok Twice
  composer: original
  year: 2026
  source: original
  category: originals
  style: synthwave
  key: C major
  tempo: 120
  time: 4/4

  track lead role=lead
  | r/1 | C#5/1 |

  track pad role=pad
  | r/1 | C4/1 |

  track bass role=bass
  | r/1 | C3/1 |
  ```

  Then `CHECK_DIR=/tmp/okfix CHECK_DETAIL=1 npm run check:songs` prints a line containing
  `ok-twice.song` and `0 clashes (+2 explained)`, two detail lines ending in `ok: test`, and no
  `unused ok` line. (Before the fix it prints `1 clashes (+1 explained)`.)

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not run `npm run balance`; the balance file is restored from git, not changed.
- Temporary files go under `/tmp`.

## Out of scope

- Any other change to the balance check, including a way for a song to say which track carries the
  tune.
- Anything in `tools/arranger/`, `src/` or `tests/`.

## If blocked

If `47037c9` is not in the clone's history, stop and report it; do not reconstruct the balance file
by hand.
