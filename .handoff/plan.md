## Goal
Two small reporting improvements: (1) `npm run balance` says when a track's flags are confined to a
few sections, so the fix is that section's velocities rather than the whole track's `vol=`; (2)
`npm run check:songs` can print a one-line-per-song "siblings" report for one style (key, tempo,
bars, length, kit, bass), so a new song can be checked against the others in its style.

## Files to touch
- tools/browser/balance.mjs
- tools/check/songs.check.ts
- tools/README.md
- docs/composing.md

## Steps
1. tools/browser/balance.mjs, in `report(result)`:
   - Next to the existing `needs` map (track index -> dB), keep a second map `flaggedIn` (track index
     -> array of section indexes `j` where that track got a flag). Push `j` wherever `need(x.i, ...)`
     is called (four places: pad/chords buried, arp peaks under, bass over lead, bass low end over
     kick).
   - For each track, count the sections it plays in: sections where `levels[i][j].rms > -55`.
   - In the "Suggested track volumes" block, for each track in `needs`: if its flagged sections are
     fewer than half of the sections it plays in, print instead of the vol line:
     `  <id>: flagged only in bars <from>-<to>, <from>-<to>: change its velocities there, not its <key>=`
     (use `sections[j].from` / `.to`; `<key>` is the existing `vol` or `vol.<style>` key variable).
     Otherwise print the existing vol suggestion line unchanged.
   - Update the header comment at the top of the file with one sentence describing this.
2. tools/check/songs.check.ts:
   - Read `const SIBLINGS = process.env.SIBLINGS;` (a style id, e.g. `techno`).
   - Import `STYLE_DEFS`, `resolvePatch`, `withBankInstruments` from `../../src/audio/styles`.
   - Inside the existing loop, after a song parses, if `SIBLINGS` is set and
     `song.meta.style === SIBLINGS`, collect one row: file name, `song.meta.key`, `song.meta.tempo`,
     bar count (`song.bars.length`), the length string `mins` already computed, the patch name of the
     first `drums` track and of the first `bass` track via
     `resolvePatch(STYLE_DEFS[SIBLINGS], withBankInstruments(song).tracks[k]).name` (or `—` if none),
     and `hidden` when `song.meta.hidden` is true.
   - After the loop, if `SIBLINGS` is set, push a blank line, a heading `Songs in <SIBLINGS>:`, and
     one padded line per row: `file  key  tempo BPM  bars  length  kit: <name>  bass: <name>[  hidden]`.
   - Update the file's header comments with one line: `SIBLINGS=<style>` adds the report.
3. tools/README.md: in the balance entry add one sentence about the section hint; in the check
   section add one sentence: `SIBLINGS=techno npm run check:songs` lists each song in a style with
   its key, tempo, bars, length, kit and bass.
4. docs/composing.md: in "Before committing", item 3 (balance), add: when it says a track is flagged
   only in some bars, change the velocities there. Add one line after the check:songs item: before
   committing a new song, run `SIBLINGS=<style> npm run check:songs` and make sure it isn't a twin of
   another song in its style (same key, tempo, kit and bass).

## Acceptance
- `node --check tools/browser/balance.mjs` exits 0.
- Verifier only:
  - `npm run typecheck` exits 0.
  - `npm test` exits 0.
  - `SIBLINGS=techno npm run check:songs` exits 0 and prints a "Songs in techno:" list including
    hot-wire.song and confetti-cannon.song with kit and bass names.
  - `npm run balance -- confetti-cannon` exits 0 and prints "No flags."

## Parallel work
None — do it sequentially.

## Constraints
- Do not commit, push, or switch branches.
- Do not touch files outside Files to touch except `.handoff/report.md`.
- Do not run the Verifier only commands. If any command fails with `spawn EPERM`, stop and report
  it; do not request wider sandbox access, set NODE_OPTIONS, or stub modules.
- Keep the existing output format for everything not described above.

## Out of scope
- Any change to the flag rules or thresholds.
- Any song file, src/ code, or other tool.

## If blocked
Stop and write what blocked you, with the exact error, in `.handoff/report.md`.
