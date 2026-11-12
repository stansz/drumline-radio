## Goal
Switch the last three song generators that still carry their own copy of the bar writer to the
shared `writeBlock` in `tools/arranger/lib.mjs`. Every generated song stays byte-identical.

## Files to touch
- `tools/arranger/club.mjs`
- `tools/arranger/exit-sign.mjs`
- `tools/arranger/piano-piece.mjs`
- `.handoff/report.md` (new)

## Steps
1. Run `npm ci`, then `npx vitest run tests/drift.test.ts` and confirm it passes before any edit.
2. `tools/arranger/club.mjs`: add `import { writeBlock } from './lib.mjs';` with the other imports,
   and replace the body of the `block(key)` method in the object returned by the section builder
   with `return writeBlock(tracks[key], marks);`.
3. `tools/arranger/exit-sign.mjs`: add `import { writeBlock } from './lib.mjs';` with the other
   imports, and replace the body of `function block(id)` with `return writeBlock(tracks[id], marks);`.
4. `tools/arranger/piano-piece.mjs`: add `import { writeBlock } from './lib.mjs';` with the other
   imports. Keep `function block(bars, vel, sections)` and its comment, and replace its body with:
   build `withVel`, a copy of `bars` where only the first bar that is not `'R'` becomes
   `` `v=${vel} ${bar}` ``; build `at = new Map([...sections].map(([n, text]) => [n - 1, text]))`
   (the sections are numbered from 1, `writeBlock` marks from 0); return `writeBlock(withVel, at)`.
   The velocity stays in this script, not in `lib.mjs`.
5. Run every **Acceptance** command and write `.handoff/report.md`.

## Acceptance
- `npx vitest run tests/drift.test.ts` exits 0.
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `grep -l "row.join" tools/arranger/*.mjs` prints exactly `tools/arranger/lib.mjs`.
- `git diff --name-only` lists exactly `tools/arranger/club.mjs`, `tools/arranger/exit-sign.mjs` and
  `tools/arranger/piano-piece.mjs`, plus `.handoff/plan.md` if it was already modified when the run
  started.

## Parallel work
None — do it sequentially.

## Constraints
- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`. Temporary files in
  `/tmp` and installing dependencies are fine.
- Do not change `tools/arranger/lib.mjs` or any file in `src/songs/`. If the drift test fails, fix
  the script, never a song file.
- No browser is needed.

## Out of scope
- `confetti-cannon.mjs` (its writer has a different layout), every other generator, and any test.

## If blocked
- If one of the three cannot keep byte-identical output through `writeBlock`, leave that script's
  `block` unchanged and list it in the report.
