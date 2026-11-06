## Goal

Add per-note micro-timing offsets to the song format of drumline-radio: a note token may carry
`+N` or `-N` (ticks, 960 per quarter note, range -240..240) that shifts when the note starts.
The design is in `plans/micro-timing.md`; this spec is the exact work.

## Files to touch

- `src/music/song.ts`
- `src/music/timing.ts`
- `docs/song-format.md`
- `tests/song.test.ts`
- `tests/timing.test.ts`
- `.handoff/report.md`

## Steps

1. `src/music/song.ts`, `interface Note`: add `offset?: number;` after `staccato`, with a one-line
   doc comment: start shift in ticks, -240..240, present only when non-zero.
2. `src/music/song.ts`: add `export const MAX_OFFSET = 240;` near the other top-level constants.
3. `src/music/song.ts`, `type ParsedToken`, `kind: 'note'` variant: add `offset: number;`.
4. `src/music/song.ts`, `parseSuffixWithPitches`: after the staccato block and before the velocity
   block, parse an offset:
   - If `rest` starts with `+` or `-`, match `/^([+-])(\d+)/`. No match →
     `{ kind: 'error', message: \`invalid offset in '${fullText}'\` }`.
   - Value = sign × digits. If `Math.abs(value) > MAX_OFFSET` →
     `{ kind: 'error', message: \`offset ${value} is outside -${MAX_OFFSET}..${MAX_OFFSET} in '${fullText}'\` }`.
   - Slice the match off `rest`. Default offset is 0. Return `offset` in the note result.
   - Rests must keep rejecting any suffix; do not change rest parsing.
5. `src/music/song.ts`, the track loop in `parseSong` (around the `const note: Note = {` block):
   - When building `note`, set `note.offset = parsed.offset` only if `parsed.offset !== 0`
     (do not add the key otherwise).
   - In the `pending.mode === 'tie'` branch and the `pending.mode === 'bend'` branch, before the
     note is merged into `pending.note`: if `parsed.offset !== 0`, call
     `err(token.line, \`offset on a tie or bend continuation in track ${raw.id}\`)` and then
     continue merging exactly as today (the merged note keeps the first token's offset).
   - Bar-length accounting (`barTicks`) stays on written durations; offsets never change it.
6. `src/music/timing.ts`, `buildTimeline`: replace the start/duration/bend computation with:
   - `const offset = note.offset ?? 0;`
   - `const start = tickToSeconds(song, Math.max(0, note.tick + offset));`
   - `const end = tickToSeconds(song, note.tick + note.ticks);`
   - `let duration = end - start; if (note.staccato) duration /= 2;`
     `duration = Math.max(duration, MIN_DURATION);` with `const MIN_DURATION = 0.01;` at module top.
   - Bends: `time: Math.max(0, tickToSeconds(song, note.tick + bend.at) - start)`.
   - For a note with no offset every value must be identical to today's (the `Math.max` with
     MIN_DURATION must not change any existing note: existing tests and drift tests prove this).
   - Keep the sort and `notesBetween` unchanged. Do not change `src/audio/engine.ts`.
7. `docs/song-format.md`:
   - In "Notes and durations", extend the token description sentence to include the optional
     offset between the staccato mark and the velocity.
   - Add a section `## Micro-timing` after "### Staccato" (before "## Chords") stating: syntax
     `+N`/`-N` in ticks (960 a quarter), range -240..240, positive is later; examples `k/8+18`,
     `s/8-10`, `[C4 E4 G4]/2+24:88`; it moves only the start and the end stays at the written end;
     staccato halves the remaining length; minimum sounding length 10 ms; applies to the whole
     chord; the first token of a tie or bend chain owns it and an offset on a continuation token is
     an error; bend times stay at their written positions; a start before 0 clamps to 0; bar length
     and song length use written durations; `%` and `{ }*n` repeat offsets; the score draws a
     shifted note where it sounds.
   - In "What the checker rejects", add: an offset outside -240..240, a malformed offset, and an
     offset on a tie or bend continuation.
   - In "Rests", add offset to the list of things a rest has no.
8. `tests/song.test.ts`: add a `describe('micro-timing offsets', ...)` with tests that parse small
   inline songs (copy the minimal header and track layout used by existing inline-song tests in
   that file) and assert:
   - `C4/4+18` gives `offset: 18`; `C4/4-10` gives `offset: -10`; `C4/4` has no `offset` key
     (`expect('offset' in note).toBe(false)`).
   - `C4/8'+12:90~ C4/8` parses: offset 12, staccato true, velocity 90, ticks 960 (tied).
   - A chord `[C4 E4 G4]/2+24:88` gives offset 24 on the chord note.
   - A drums token `s/8-10` gives offset -10.
   - `C4/4+240` and `C4/4-240` parse; `C4/4+241` and `C4/4-241` fail with a message containing
     `outside -240..240`.
   - `C4/4+x` fails with `invalid offset`.
   - `C4/4~ C4/4+10` and `G4/8^ A4/4+10` fail with `offset on a tie or bend continuation`.
   - `r/4+10` fails.
9. `tests/timing.test.ts`: add a `describe('micro-timing offsets', ...)` with tests that parse
   small inline 4/4 songs at 60 BPM (one quarter = 1 s, one tick = 1/960 s) and assert, using
   `toBeCloseTo`:
   - `+96` on a quarter at tick 960: start 1.1, duration 0.9.
   - `-96` on a quarter at tick 960: start 0.9, duration 1.1.
   - staccato quarter with `+96`: duration 0.45.
   - a `/32` note (120 ticks) with `+120`: duration 0.01 (minimum).
   - `-96` on the very first note at tick 0: start 0.
   - a bend `G4/4+96^ A4/4`: the bend time is 1 − 0.1 = 0.9 s after the shifted start.
   - `notesBetween(timeline, 0.85, 0.95)` includes the note written at tick 960 with `-96`.
   - the timeline stays sorted by `start` when an offset reorders two notes on different tracks.

## Acceptance

- `git diff --stat` lists only files from **Files to touch** (plus `plans/micro-timing.md`,
  which was already modified before the run and must not be touched).

Verifier only:
- `npm test` exits 0 (all existing tests unchanged and passing, including `tests/drift.test.ts`
  and `tests/library.test.ts`, plus the new tests).
- `npm run typecheck` exits 0.
- `npm run check:songs` exits 0 with the same counts and clash totals as before the change.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`. Do not edit
  `plans/micro-timing.md`, any `.song` file, `src/audio/engine.ts`, or anything in `tools/`.
- No new dependencies.
- Follow the existing code style in each file (naming, comment density, error message wording).
- Do not run the `Verifier only:` commands. Use `npm run test:sandbox` and `npm run typecheck` to
  check your work if they run in the sandbox.
- If any command fails with `spawn EPERM`, stop and report it; do not request wider sandbox access,
  set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Any change to the audio engine or scheduler lookahead.
- A `@swing` or `@humanize` directive.
- Using offsets in any existing song or in the arranger.
- Score view changes.

## If blocked

Stop, leave the working tree as it is, and write in `.handoff/report.md` which step failed, the
exact error, and what you would need to continue.
