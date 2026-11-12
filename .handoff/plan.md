## Goal
Three small changes. (A) Night Bus Home: verse 2's vocal rings for a dotted eighth (between verse 1's
eighth-note hits and pre-chorus 2's quarters); in chorus 1 the chop riff's tail answers in the bars
the vocal leaves empty; the bass comes down 1 dB so `npm run balance` stops flagging it. (B) `npm run
balance` flags a buried pad or chords part even when it is too quiet to count as playing.

## Files to touch
- `tools/arranger/night-bus-home.mjs`
- `src/songs/night-bus-home.song` (regenerated only, never hand-edited)
- `tools/browser/balance.mjs`
- `tools/README.md` (the `**balance:**` bullet only)
- `.handoff/report.md` (new)

## Steps
1. Run `npm ci`.
2. Do workstreams A and B (see **Parallel work**).
3. Run every **Acceptance** command and write `.handoff/report.md`.

## Acceptance
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `node tools/arranger/night-bus-home.mjs && git diff --stat -- src/songs/night-bus-home.song` prints a
  non-empty stat, and running `node tools/arranger/night-bus-home.mjs` a second time leaves
  `git diff --stat` unchanged.
- `npm run -s check:songs | grep '^night-bus-home'` prints a line containing `0 clashes`.
- `grep -c "lead(VERSE, 100, HOLD.dottedEighth)" tools/arranger/night-bus-home.mjs` prints 1.
- `grep -c "track bass role=bass inst=synth-bass vol=0.67" src/songs/night-bus-home.song` prints 1.
- `npm run balance -- night-bus-home` exits 0 and prints `No flags.`
- `npm run balance -- velvet-freeway` exits 0 and prints `No flags.`
- `sed 's/^track pad role=pad vol=0.9/track pad role=pad vol=0.05/' src/songs/velvet-freeway.song > /tmp/vf-quiet-pad.song && npm run balance -- /tmp/vf-quiet-pad.song`
  prints at least one line containing `(pad) is` and `(loudness and peak)`.
- `git diff --name-only` lists only files from **Files to touch**.

## Parallel work
Two workstreams; they share no files.

**Workstream A: Night Bus Home.** Owns `tools/arranger/night-bus-home.mjs` and
`src/songs/night-bus-home.song`.
- A1. In the `HOLD` object, add `dottedEighth: 3,` between `hits: 2,` and `quarter: 4,`. In section
  `Verse 2`, change `lead: lead(VERSE, 100, HOLD.quarter),` to
  `lead: lead(VERSE, 100, HOLD.dottedEighth),`. Leave `Pre-chorus 2` on `HOLD.quarter`. Update the
  comment above `HOLD` so it lists the steps in order: hits, dotted eighth, quarter, dotted, half,
  long, full.
- A2. In section `Chorus 1`, change `chops: bars(16, (i) => hookChops(i, 84)),` to
  `chops: bars(16, (i) => (i % 2 === 1 ? chopBar(loop(i), 80, 'tail') : hookChops(i, 84))),`
  and change that section's comment to say the chop riff's tail answers in every bar the vocal
  leaves empty.
- A3. In the track line template, change `track bass role=bass inst=synth-bass vol=0.75` to
  `track bass role=bass inst=synth-bass vol=0.67`.
- A4. Run `node tools/arranger/night-bus-home.mjs`.
- Acceptance for A: `npx vitest run tests/drift.test.ts` exits 0, and
  `npm run -s check:songs | grep '^night-bus-home'` contains `0 clashes`.

**Workstream B: buried pads in `balance.mjs`.** Owns `tools/browser/balance.mjs` and
`tools/README.md`.
- B1. In `render()`, give each section its tick range: add `startTick: first.startTick` and
  `endTick: last.startTick + last.ticks` to each object pushed into `sections`.
- B2. In `render()`, in the per-track, per-section result, add
  `plays: t.notes.some((n) => n.tick < s.endTick && n.tick + n.ticks > s.startTick)`, so each
  section result is `{ loud, peak, low, plays }`. Rename the `levels = tracks.map((t, i) => ...)`
  callback's parameter if needed so `t` is the parsed track.
- B3. In `report()`, the pad/chords check loops over
  `tracks.map((t, i) => ({ t, i, l: levels[i][j] })).filter((x) => (x.t.role === 'pad' || x.t.role === 'chords') && x.l.plays)`
  instead of `[...at('pad'), ...at('chords')]`, with a one-line comment: a buried pad can sit under
  the playing threshold, so it is checked whenever it has notes in the section. Everything else in
  the check stays as it is.
- B4. In `tools/README.md`'s `**balance:**` bullet, add one sentence: a pad or chords part is
  checked in every section where it has notes, even when it is too quiet to count as playing.
- Acceptance for B: `node --check tools/browser/balance.mjs` exits 0, and the buried-pad command in
  **Acceptance** prints a `(pad) is ... (loudness and peak)` line.

**Integration (the lead):** after both workstreams finish, run the full **Acceptance** list.

## Constraints
- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`. Temporary files in
  `/tmp` and installing dependencies are fine.
- Never hand-edit `src/songs/night-bus-home.song`; only regenerate it.
- Run only one `npm run balance` at a time.

## Out of scope
- Any other song, any other generator, any test file.
- Changing the balance thresholds (`PAD_GAP`, `ARP_GAP`, `BASS_OVER`, `KICK_OVER`) or the arp check.
- `docs/` and `README.md`.

## If blocked
- If `npm run balance -- night-bus-home` still flags the bass after A3, stop and report its flag
  lines; do not change the bass volume again.
- If `npm run balance -- velvet-freeway` gets a new pad or chords flag after B3, stop and report the
  flag lines.
- If a balance run fails with a timeout error after its retries, report the error and continue with
  the other Acceptance commands.
