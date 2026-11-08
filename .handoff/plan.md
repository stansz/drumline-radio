## Goal

Two dev-tool fixes suggested by the model that wrote Riverfront:

1. The song checker (`tools/check/songs.check.ts`) checks every pitched part against the pad and
   bass, not only the `melody` track and the `lead`/`lead2` roles, and names the part in each
   clash.
2. The per-track level tool (`tools/browser/tracks.mjs`) also prints each track's low-band level
   (below 150 Hz), so "the bass sits under the kick" can be checked: the kick is what fills the
   drums track's low band.

## Files to touch

- `tools/check/songs.check.ts`
- `tools/browser/tracks.mjs`
- `tools/README.md`
- `docs/composing.md`
- `docs/song-prompt.md`

## Steps

1. In `tools/check/songs.check.ts`:
   - Replace the `melody` set with `checked`: every track index whose role is not `pad`, `bass`,
     or `drums` (this covers `lead`, `lead2`, `counter`, `arp`, `chords`, and the `melody` track
     whatever its role). Keep the `under` set (roles `pad` and `bass`) as it is.
   - Keep `MIN_SECONDS = 0.3` and the interval test `(a - b) mod 12 === 1` unchanged.
   - Count clashes per checked track. On each song's summary line, after the total, add the
     breakdown in parentheses by track id, only for tracks with clashes, before the times, for
     example: `exit-sign.song  2:57  3 clashes [clean 2, melody 1] (at 12.0s, 40.1s, 80.3s)`. A song
     with 0 clashes keeps its current line.
   - In each `CHECK_DETAIL` line, add the checked track's id before the note:
     `  12.0s clean E4 (0.45s) over pad F2`.
   - Update the file's top comment and the comment above `checked` to say that every pitched part
     except the pad and bass is checked against the pad and bass.

2. In `tools/browser/tracks.mjs`:
   - For each track, besides the existing analyser, connect the panner to a `BiquadFilter`
     (`type = 'lowpass'`, `frequency.value = 150`, `Q.value = 0.7`) feeding a second analyser, and
     accumulate both over the same 4 s window.
   - Print each line as `name     -30.0 dB   low -34.2 dB`, keeping the name padded to 8 as now.
   - Update the usage comment at the top: say that "low" is the level below 150 Hz, and that
     comparing the bass's low level with the drums' low level shows whether the bass sits under
     the kick.

3. In `tools/README.md`:
   - In "Song check", replace "any long melody notes (from the `melody` track and every `lead` or
     `lead2` track)" with "any long note in a pitched part (every track except the pad, bass, and
     drums)", and say each clash line names its track and the summary breaks the count down by
     track.
   - In the **tracks** bullet, add that each line also shows the track's level below 150 Hz, and
     that the bass's low level should sit under the drums' low level (the kick).

4. In `docs/composing.md`, "Before committing":
   - Item 2: say the checker covers every pitched part (leads, counter-lines, arpeggios, chords)
     against the pad and bass, not only leads.
   - Item 3: after the bass-under-the-kick sentence, add: "`tracks.mjs` prints each track's level
     below 150 Hz; the bass's low level should sit a few dB under the drums' low level."

5. In `docs/song-prompt.md`, in the prompt's Rules, change "Check the balance with
   tools/browser/tracks.mjs at a quiet point and a busy one, as docs/composing.md describes." to
   "Check the balance with tools/browser/tracks.mjs at a quiet point and a busy one, as
   docs/composing.md describes, including the low-band column for the bass against the kick."

## Acceptance

- `node --check tools/browser/tracks.mjs` exits 0.
- `npm run test:sandbox` exits 0.
- `git diff --stat` lists only files from **Files to touch**.

Verifier only:
- `npm run check:songs` exits 0 and prints a line for every song, with the per-track breakdown on
  songs that have clashes.
- `CHECK_DETAIL=1 npm run check:songs` prints detail lines that start with a track id.
- `npm run typecheck` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any song in `src/songs/` or any code in `src/`.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- Changing the clash threshold, the interval rule, or which roles count as `under`.
- A groove or swing report for song files.
- Fixing any clash the wider check finds.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
