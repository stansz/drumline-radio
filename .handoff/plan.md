## Goal

Make `npm run balance` level every supporting part by perceived loudness, both ways (buried and
too loud), so no part can sit unheard under the lead again. Today it averages K-weighted energy
over a whole section, silence included, judges plucked parts by a raw sample peak, and has no rule
at all for `counter` or `lead2` parts: First Flight's pizzicato (`counter`) passed while about 19 dB
under the brass. The new check measures each track's **playing loudness** per section (BS.1770-4
gated loudness: 400 ms blocks, absolute and relative gates), and one rule compares every supporting
part's playing loudness with the lead's. A deliberate exception is written in the song as a
`# balance-ok` line with a reason.

## Files to touch

- `tools/browser/loudness.mjs` (new): the gated-loudness function, pure, no DOM or audio.
- `tests/loudness.test.mjs` (new): its unit tests.
- `tools/browser/balance.mjs`
- `docs/composing.md` (step 4 of the checks before committing)
- `tools/README.md` (the **balance** entry)
- `docs/song-format.md` (the comments section: the new `# balance-ok` line, next to `# ok`)
- `docs/song-prompt.md` (the balance sentence in the Rules)
- `AGENTS.md` (one line, next to the `# ok` rule)
- `docs/how-it-works.md` (only the balance row, if its wording becomes false)
- `.handoff/report.md`

## Steps

1. Run `npm ci`. Create the browser wrapper the balance check needs as root:
   `printf '#!/bin/sh\nexec /usr/lib64/chromium-browser/chromium-browser --no-sandbox "$@"\n' > /tmp/chromium-nosandbox && chmod +x /tmp/chromium-nosandbox`.
   Every balance run in this plan is `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- <song>`.
   Run renders one at a time.

2. Read `tools/browser/balance.mjs` in full, `tools/README.md` (the **balance** entry),
   `docs/composing.md` step 4, and `docs/song-format.md` (the `# ok` comment paragraph). Save the
   current output of the balance check for `first-flight` and `sunliner` to
   `/tmp/before-first-flight.txt` and `/tmp/before-sunliner.txt`.

3. Create `tools/browser/loudness.mjs` exporting exactly one function:
   `export function gatedLoudness(data, from, to, rate)`. `data` is a Float32Array (or array) of
   already K-weighted samples; `from`/`to` are sample indexes (`to` exclusive); `rate` is the sample
   rate. It returns BS.1770-4 gated loudness in LUFS over `data[from..to)`:
   - Blocks of 400 ms (`Math.round(0.4 * rate)` samples) starting every 100 ms
     (`Math.round(0.1 * rate)`), each lying wholly inside `[from, to)`. If the range is shorter than
     one block, use the whole range as a single block.
   - Each block's mean square `z`; its loudness `-0.691 + 10 * Math.log10(z)` (`-Infinity` when
     `z === 0`).
   - Absolute gate: keep blocks with loudness above -70.
   - Relative gate: `G = -0.691 + 10 * log10(mean z of the absolute-gated blocks) - 10`; keep
     absolute-gated blocks with loudness above `G`.
   - Return `-0.691 + 10 * log10(mean z of the kept blocks)`, or `-120` when no block is kept.
   - The function must not use any closure variable or import, because `balance.mjs` injects its
     source text into the page with `gatedLoudness.toString()`. Use only its arguments, `Math` and
     local variables.
   Put a comment above it saying what it measures and why (how loud a part sounds while it plays;
   silence between notes does not pull it down).

4. Create `tests/loudness.test.mjs` (Vitest; import `{ describe, expect, it }` from `vitest` and
   `{ gatedLoudness }` from `../tools/browser/loudness.mjs`) with these tests, rate 22050:
   - A 1 kHz sine of amplitude 0.1 for 4 s: result within 0.05 of `-23.70`.
   - 1 s of that sine followed by 3 s of silence: gated result within 0.5 of `-23.70`, while the
     plain mean-square loudness of the whole 4 s (computed in the test) is at least 5 dB lower.
   - All silence: returns `-120`.
   - A range shorter than 400 ms (0.2 s of the sine): within 0.1 of `-23.70`.
   - `from`/`to` select a sub-range: 2 s of amplitude 0.01 then 2 s of amplitude 0.1, measured
     over the second half only: within 0.1 of `-23.70`.

5. Change `tools/browser/balance.mjs`:
   - `import { gatedLoudness } from './loudness.mjs';` and inject it into the page code built by
     `render()` with `${gatedLoudness.toString()}` before it is used.
   - In each track/section level, add `play: gatedLoudness(data, a, b, rate)` next to `loud`. Keep
     `loud`, `peak`, `low` and `plays` as they are.
   - The table: each non-bass/drums cell shows `<play>/<peak>`, rounded, `—` when `play <= -70`;
     bass and drums cells show `<play>/<peak> (<low>)`. Change the header line to say the numbers
     are "playing loudness (BS.1770 gated, LUFS-style) / K-weighted peak dB per section".
   - The lead in a section: among `lead`-role tracks that are present (the existing `present()`
     test), the one with the highest `play`. The supporting rules below run only when that lead's
     `play` is above -45 (as the existing pad and arp rules do).
   - Remove the `PAD_GAP` pad/chords rule and the `ARP_GAP` arp rule and their constants. Replace
     them with one rule over every track whose role is `pad`, `chords`, `arp`, `counter` or `lead2`
     and that has notes in the section (`plays`):
     - **Buried:** `gap = lead.play - x.play`; if `gap > UNDER[role]`, flag
       `bars <a>-<b>: <id> (<role>) is <n> LU under <lead id> while playing` and call
       `need(x.i, j, gap - UNDER[role] + MARGIN)`.
     - **Too loud:** `over = x.play - lead.play`; if `over > OVER`, flag
       `bars <a>-<b>: <id> (<role>) is <n> LU over <lead id> while playing` and call
       `need(x.i, j, -(over - OVER + MARGIN))`.
     `UNDER` is an object keyed by role, `OVER` one number; both are set in step 7. Until then use
     `UNDER = { pad: 12, chords: 12, arp: 12, counter: 12, lead2: 12 }` and `OVER = 3`.
   - Keep the `BASS_OVER` and `KICK_OVER` rules exactly as they are (they still use `loud` and
     `low`).
   - `# balance-ok` exceptions: read every line of the song text matching
     `/^#\s*balance-ok\s+(?:@(\d+)(?:-(\d+))?\s+)?([A-Za-z0-9_-]+):\s*(\S.*)$/gm`. The form
     `# balance-ok @<from>-<to> <track>: <reason>` covers bars from-to, `@<bar>` one bar, and no
     `@` the whole song. A flag (from any rule) for a track in a section whose bars overlap one of
     that track's ranges is **explained**: print it under a separate `Explained (balance-ok):`
     heading followed by its reason, do not print it under `Flags:`, do not count it for
     `BALANCE_STRICT`, and do not call `need()` for it. `No flags.` is printed when no unexplained
     flag remains.
   - With `BALANCE_GAPS=1` in the environment, after the table print one line per supporting track
     per section where the supporting rule ran:
     `gap <role> <track id> bars <a>-<b> under <lead.play - x.play rounded to 0.1>`.
   - Remove the last line ("For a sparse part (stabs, hits), compare peaks: …"); playing loudness
     makes it untrue.
   - Update the file's top comment to describe the new measurement and rules, `# balance-ok`, and
     `BALANCE_GAPS`. Keep everything else (rendering, retries, deadlines, `all` styles, the
     suggestion logic, `BALANCE_STRICT`) as it is.

6. Run `npm test` (the new test must pass) and the balance check on `first-flight`. Confirm the
   table prints and the run finishes.

7. Tune `UNDER` and `OVER` on these reference songs, whose mixes were accepted after balancing:
   `starlight-drive sunliner velvet-freeway signal-fire dusk-over-dunmere the-black-coach
   the-gilded-hour night-shift save-point`. For each, run
   `BALANCE_GAPS=1 EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- <song>` in its home style and
   save the output to `/tmp/ref-<song>.txt`. Then:
   - For each role (`pad`, `chords`, `arp`, `counter`, `lead2`): `M` = the largest `under` value
     for that role across all reference songs. `UNDER[role] = min(12, max(6, ceil(M) + 1))`. A role
     with no data gets 12.
   - `O` = the largest value of `-under` (a supporting part over the lead) across all reference
     songs. `OVER = min(4, max(1, ceil(O) + 1))`.
   - Write the chosen numbers into `balance.mjs` with a comment above each saying how it was
     chosen (the rule above and the reference list).
   - Re-run all nine reference songs and save to `/tmp/ref2-<song>.txt`. A reference song that still
     flags is reported (song, track, bars, gap), not fixed: never change a song or its script.

8. Check the rule finds real problems:
   - Run the check on `first-flight`. Its `pizz` (counter) must be flagged as under `brass` in most
     sections where it plays. Save to `/tmp/after-first-flight.txt`.
   - Copy `src/songs/sunliner.song` to `/tmp/sunliner-quiet.song` and in the copy multiply the
     `vol=` of its `lead2` track by 0.25 (add `vol=0.25` if it has none). The check on that file must
     flag that track as under the lead.
   - Copy `src/songs/sunliner.song` to `/tmp/sunliner-loud-support.song` and in the copy multiply the
     lead track's `vol=` by 0.2 (add `vol=0.2` if it has none). The check on that file must flag at
     least one supporting track as over the lead.
   - Copy `/tmp/sunliner-quiet.song` to `/tmp/sunliner-explained.song` and add the line
     `# balance-ok <that lead2 track id>: test exception` near the top. The check on that file must
     print the flag under `Explained (balance-ok):` and print `No flags.` if nothing else flags.

9. Update the docs to describe what the code does now, removing anything it makes false:
   - `docs/composing.md` step 4: the playing-loudness measurement, the one rule for supporting
     parts both ways with the tuned numbers, the bass rules, the `vol=` suggestion, and
     `# balance-ok @<from>-<to> <track>: <reason>` for a deliberate exception (a part the brief wants
     soft, like a touch of colour). Replace the examples that quote old numbers (Velvet Freeway's
     bars 33-40, Fathom's stabs by peak) with the new check's numbers for Velvet Freeway's bars
     33-40 from `/tmp/ref2-velvet-freeway.txt`; keep the Wayfarer's Rest and Porch Light history.
   - `tools/README.md`, the **balance** entry: the same, plus `BALANCE_GAPS=1`.
   - `docs/song-format.md`: after the `# ok` paragraph, a paragraph for `# balance-ok`, with its
     three forms.
   - `docs/song-prompt.md` Rules: change "and fix every flag it prints, as docs/composing.md
     describes" to "and fix every flag it prints, as docs/composing.md describes, or explain a
     deliberate one with a `# balance-ok` line".
   - `AGENTS.md`: after the `# ok` rule, one sentence: `npm run balance` flags any supporting part
     buried under or louder than the lead by playing loudness; a deliberate one is explained with a
     `# balance-ok @<from>-<to> <track>: <reason>` line.
   - `docs/how-it-works.md`: change the balance row only if it is now false.

10. Write `.handoff/report.md`: the chosen `UNDER` and `OVER` values with the `M`/`O` data behind
    them (a table: role, largest gap, song and bars it came from); every reference song that still
    flags after tuning; First Flight's flags and suggested volumes from
    `/tmp/after-first-flight.txt`; the output of the three Sunliner test copies; and the output of
    every Acceptance command.

## Acceptance

- `npm test` exits 0 and its output includes `tests/loudness.test.mjs` with 5 passing tests.
- `npm run typecheck` exits 0.
- `node -e "import('./tools/browser/loudness.mjs').then(m => console.log(typeof m.gatedLoudness, Object.keys(m).length))"`
  prints `function 1`.
- `grep -cE "PAD_GAP|ARP_GAP|compare peaks" tools/browser/balance.mjs` prints `0`.
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- first-flight` prints a `Flags:` section
  containing at least one line with `pizz (counter) is` and `LU under brass while playing`, and a
  suggested volume line for `pizz`.
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- /tmp/sunliner-quiet.song` flags the
  `lead2` track as `LU under` the lead.
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- /tmp/sunliner-loud-support.song` prints at
  least one flag containing `LU over`.
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- /tmp/sunliner-explained.song` prints
  `Explained (balance-ok):` with `test exception`, and no `Flags:` line for that track.
- `BALANCE_GAPS=1 EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- sunliner` prints lines
  starting with `gap `.
- `grep -n "balance-ok" docs/composing.md tools/README.md docs/song-format.md docs/song-prompt.md AGENTS.md`
  prints at least one line for each of the five files.
- `git status --porcelain` lists only files from **Files to touch** (no `src/` changes, no change
  to any song or generator script).

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Never change a song, a generator script, a style, an instrument or the engine. Test copies go
  under `/tmp`.
- Keep `balance.mjs` free of new dependencies. `loudness.mjs` stays pure (no DOM, audio, Node
  APIs or imports).
- Run balance renders one at a time. Stop any server or browser you start.

## Out of scope

- Running the check over every song in the library, or fixing any song's mix (First Flight's
  pizzicato included; that is done after review).
- `tools/browser/tracks.mjs` (the live per-track meter).
- Changing the bass-over-lead or bass-over-kick rules.
- Making the balance check part of CI.

## If blocked

If `gatedLoudness.toString()` cannot be injected into the page code, stop and report the error
instead of copying the function into `balance.mjs`. If First Flight's pizzicato is not flagged after
tuning, report its `under` values from `BALANCE_GAPS=1` and the tuned `UNDER.counter`, and stop. If
a reference song's render fails three times, skip it, say so, and tune on the rest.

## Amendments

1. **The module name (overrides Goal, Files to touch, steps 3, 4 and 5, and Acceptance).**
   `tools/browser/loudness.mjs` already exists: it is the separate whole-song loudness check, and it
   must not be changed, moved or imported. Everywhere this plan says `tools/browser/loudness.mjs`,
   use `tools/browser/gated-loudness.mjs` (new) instead; everywhere it says
   `tests/loudness.test.mjs`, use `tests/gated-loudness.test.mjs` (new). In step 5 the import is
   `import { gatedLoudness } from './gated-loudness.mjs';`. The Acceptance lines become:
   - `npm test` exits 0 and its output includes `tests/gated-loudness.test.mjs` with 5 passing tests.
   - `node -e "import('./tools/browser/gated-loudness.mjs').then(m => console.log(typeof m.gatedLoudness, Object.keys(m).length))"`
     prints `function 1`.
   - `git diff --quiet tools/browser/loudness.mjs` exits 0 (the existing check is unchanged).

2. **Step 4, the second test (overrides its tolerance).** Blocks that straddle the tone's end are
   partly silent but stay above the relative gate, so BS.1770-4 reads a 1 s tone about 0.7 LU low
   (-24.41). Assert the gated result of "1 s of that sine followed by 3 s of silence" within
   **0.75** of `-23.70`; keep its "at least 5 dB lower" assertion. Step 3's algorithm is correct as
   written: do not change it.

3. **The last Acceptance line (overrides it).** It becomes:
   `git status --porcelain -- . ':(exclude).handoff'` lists only files from **Files to touch**
   (the handoff's own files under `.handoff/` are not counted).
