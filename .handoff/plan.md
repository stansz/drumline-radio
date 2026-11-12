## Goal
Third pass of the generator cleanup: move the copied duration plumbing (a length to `/n` text,
splitting a length into tied durations, and filling a span with repeated notes) into
`tools/arranger/lib.mjs`, switch every generator that carries a copy, and rename Club's `stretch`
to `stretchText` so it no longer shares a name with Night Bus Home's different `stretch`. Every
generated song stays byte-identical (`tests/drift.test.ts`). `lib.mjs` stays plumbing only.

## Files to touch
- `tools/arranger/lib.mjs`
- `tools/arranger/arranger.mjs`
- `tools/arranger/ivory-and-ash.mjs`
- `tools/arranger/club.mjs`
- `tools/arranger/night-bus-home.mjs`
- `tools/arranger/fathom.mjs`
- `AGENTS.md` (the bullet that starts "- Song generators in `tools/arranger/` import their plumbing")
- `tools/README.md` (the paragraph about `arranger/lib.mjs` in `## Arranger` only)
- `.handoff/report.md` (new)

## Steps
1. Run `npm ci`, then `npx vitest run tests/drift.test.ts` and confirm it passes before any edit.
2. Add to `tools/arranger/lib.mjs`, keeping everything already there and adding no imports:
   - `DURATIONS`, an exported array of `[ticks, text]` pairs, longest first:
     `[[3840, '/1'], [2880, '/2.'], [1920, '/2'], [1680, '/4..'], [1440, '/4.'], [960, '/4'], [720, '/8.'], [480, '/8'], [240, '/16'], [120, '/32']]`.
   - `durationText(ticks)`: the text of the single duration with exactly that many ticks; throws
     `'no duration for ' + ticks` if there is none.
   - `splitDuration(ticks, sizes = DURATIONS.map(([t]) => t))`: greedy, largest size first, returns
     the list of duration texts that add up to `ticks`; throws `` `cannot write ${rest} ticks` `` if
     something is left over.
   - `fillUnits(ticks, unit, fn)`:
     `Array.from({ length: ticks / unit }, (_, i) => fn(i, durationText(unit))).join(' ')`.
3. `arranger.mjs`: delete `DUR` and the body of `dur`; `dur` becomes `const dur = durationText;`
   (import it).
4. `ivory-and-ash.mjs`: delete `DUR` and `fillU`; replace `DUR[t]` with `durationText(t)` and calls
   to `fillU` with `fillUnits` (import both).
5. `club.mjs`: delete `DUR`, `SPLIT`, `pieces` and `fillU`; replace `DUR[x]` with `durationText(x)`,
   `pieces(t)` with `splitDuration(t, [3840, 2880, 1920, 1440, 960, 720, 480, 240])`, and `fillU` with
   `fillUnits` (import them). Rename `function stretch(bar)` to `function stretchText(bar)` and update
   every reference to it (including `stretchAll`), and change its comment to start "One bar of song
   text".
6. `night-bus-home.mjs`: delete `TICK_DURS` and `durs`, and replace `durs(x)` with `splitDuration(x)`;
   delete the sixteenths table `const DUR = { 1: '/16', ... }` and replace `DUR[span]` with
   `durationText(span * 240)` (import both). Keep its `stretch` as it is.
7. `fathom.mjs`: delete `const DUR = { 1: '/16', 2: '/8', 4: '/4', 8: '/2', 16: '/1' };` and replace
   `DUR[span]` with `durationText(span * 240)` (import it).
8. `AGENTS.md`: in the bullet that starts "- Song generators in `tools/arranger/` import their
   plumbing", change the parenthesised list to "(the bar writer, bar-length check, duration text and
   splitting, note naming, offset text, velocity clamp and section builder)". Change nothing else.
9. `tools/README.md`: add `durationText`, `splitDuration`, `fillUnits` and `DURATIONS` to the list of
   exports in the `arranger/lib.mjs` paragraph.
10. Run every **Acceptance** command and write `.handoff/report.md`.

## Acceptance
- `npx vitest run tests/drift.test.ts` exits 0.
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `grep -l -E "const (DUR|TICK_DURS|SPLIT) = |const fillU|const pieces|const durs" tools/arranger/*.mjs`
  prints nothing.
- `grep -l "^function stretch(" tools/arranger/*.mjs` prints exactly `tools/arranger/night-bus-home.mjs`.
- `grep -c "^function stretchText(" tools/arranger/club.mjs` prints `1`.
- `grep -c "duration text and splitting" AGENTS.md` prints `1`.
- `grep -cE "\b[A-G][#b]?[0-9]\b" tools/arranger/lib.mjs` prints `0`.
- `node -e "import('./tools/arranger/lib.mjs').then(m=>{console.log(m.durationText(720), JSON.stringify(m.splitDuration(1200)), JSON.stringify(m.splitDuration(1680)), JSON.stringify(m.splitDuration(1680, [960, 480, 240])), m.fillUnits(960, 240, (i, d) => 'x' + d))})"`
  prints exactly `/8. ["/4","/16"] ["/4.."] ["/4","/8","/16"] x/16 x/16 x/16 x/16`.
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
- Merging Club's `stretchText` with Night Bus Home's `stretch` (different algorithms on different
  data); any musical helper; any test; `src/`.

## If blocked
- If a script cannot switch a helper and keep byte-identical output, leave that helper in that
  script unchanged, list it in the report, and continue with the rest.
- If the drift test fails before any edit (step 1), stop and report.
