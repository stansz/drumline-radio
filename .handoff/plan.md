## Goal
Confetti Cannon, the last generator with its own bar writer, uses the shared `writeBlock` from
`tools/arranger/lib.mjs`, and `AGENTS.md` gains a rule that every generator takes its plumbing from
`lib.mjs` instead of copying it. Every generated song stays byte-identical (`tests/drift.test.ts`).

## Files to touch
- `tools/arranger/lib.mjs`
- `tools/arranger/confetti-cannon.mjs`
- `AGENTS.md`
- `tools/README.md` (the paragraph about `arranger/lib.mjs` in `## Arranger` only)
- `.handoff/report.md` (new)

## Steps
1. Run `npm ci`, then `npx vitest run tests/drift.test.ts` and confirm it passes before any edit.
2. In `tools/arranger/lib.mjs`, give `writeBlock` one more option, `collapseRests = false`, so its
   signature is `writeBlock(bars, marks = [], { perRow = 4, first = null, collapseRests = false } = {})`.
   When `collapseRests` is true and a mark starts a section (the bars from that mark's index up to
   the next mark's index, or to the end) in which every bar is `'R'`, write the mark's `# ${text}`
   line and then the single line `` `| R*${count} |` `` (count = the section's bar count) instead of
   its bars, and skip those bars. Everything else behaves exactly as now. Update `writeBlock`'s
   comment to describe the option.
3. In `tools/arranger/confetti-cannon.mjs`, add `writeBlock` to the existing import from
   `./lib.mjs`, and replace the body of `const block = (bars) => { ... }` with a one-line call:
   `writeBlock(bars, marks, { perRow: 2, collapseRests: true })`, where `marks` is defined just above
   it as `FORM.map(([, , about], s) => [s * 8, `${s * 8 + 1}-${s * 8 + 8}: ${about}`])`.
4. In `AGENTS.md`, under `## Rules`, add this bullet directly after the bullet that starts
   "- Dev scripts live in `tools/`":
   "- Song generators in `tools/arranger/` import their plumbing from `tools/arranger/lib.mjs`
     (the bar writer, bar-length check, note naming, offset text, velocity clamp and section
     builder) instead of copying it. Only plumbing goes in `lib.mjs`: melodies, chords, voicings,
     grooves and velocities stay in each song's own script, so songs don't start to sound alike."
5. In `tools/README.md`, extend the `arranger/lib.mjs` paragraph with one sentence: `writeBlock`
   takes `perRow`, `first` (a pickup line) and `collapseRests` (a marked section of only rests is
   written as one `R*n` line).
6. Run every **Acceptance** command and write `.handoff/report.md`.

## Acceptance
- `npx vitest run tests/drift.test.ts` exits 0.
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `grep -c "lines.push" tools/arranger/confetti-cannon.mjs` prints `0`.
- `grep -l "lines.push" tools/arranger/*.mjs` prints exactly `tools/arranger/lib.mjs`.
- `grep -c "tools/arranger/lib.mjs" AGENTS.md` prints `1`.
- `node -e "import('./tools/arranger/lib.mjs').then(m=>console.log(m.writeBlock(['R','R','a','b','c'], [[0,'One'],[2,'Two']], {perRow:2, collapseRests:true})))"`
  prints exactly these five lines: `# One`, `| R*2 |`, `# Two`, `| a | b |`, `| c |`.
- `git diff --name-only` lists only files from **Files to touch**, plus `.handoff/plan.md` if it was
  already modified when the run started.

## Parallel work
None — do it sequentially.

## Constraints
- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`. Temporary files in
  `/tmp` and installing dependencies are fine.
- Do not change any file in `src/songs/`. If the drift test fails, fix the scripts, never a song
  file.
- No browser is needed.

## Out of scope
- Any other generator, any test, `src/`, and any other doc.

## If blocked
- If Confetti Cannon cannot keep byte-identical output through `writeBlock`, leave its `block`
  unchanged, still do steps 4 and 5, and report why.
