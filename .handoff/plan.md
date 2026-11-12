## Goal
`npm run balance` (`tools/browser/balance.mjs`) measures each track with K-weighting (the ITU-R
BS.1770 filters behind LUFS) instead of plain RMS, so its numbers and flags match what a listener
hears: deep bass counts less, the 2-5 kHz range where leads, plucks and hats live counts more. The
flag thresholds are re-tuned against six songs whose mix is known to sound right, and the docs
describe the new measurement.

## Files to touch
- `tools/browser/balance.mjs`
- `tools/README.md` (the `**balance:**` bullet only)
- `docs/composing.md` (item 4 of "Before committing" only)
- `docs/ideas.md` (the "Older songs' mixes" bullet under "Smaller ideas" only)
- `.handoff/report.md` (new)

## Steps
1. Run `npm ci`.
2. Chromium refuses to run as root without `--no-sandbox`, and `tools/browser/cdp.mjs` does not pass
   it. Do not edit `cdp.mjs`. Create the wrapper `/tmp/chromium-nosandbox` with exactly:
   ```
   #!/bin/sh
   exec /usr/bin/chromium-browser --no-sandbox "$@"
   ```
   then `chmod +x /tmp/chromium-nosandbox`. Prefix every `npm run balance` below with
   `EDGE_PATH=/tmp/chromium-nosandbox`. If `/usr/bin/chromium-browser` does not exist, use the path
   printed by `command -v chromium-browser || command -v chromium` in the wrapper instead.
3. Baseline. Before editing anything, for each reference song `night-bus-home`, `velvet-freeway`,
   `sunliner`, `signal-fire`, `dusk-over-dunmere`, `wayfarers-rest`, run
   `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- <song> > /tmp/balance-before/<song>.txt 2>&1`
   (create `/tmp/balance-before/` first). Run them one at a time, never in parallel.
4. In `render()` in `tools/browser/balance.mjs`, K-weight each track's tap before it reaches its
   merger channel. Replace `taps.forEach((p, i) => p.connect(merger, 0, i + 2));` with a chain per
   track: `taps[i]` -> a `BiquadFilterNode` of `type = 'highshelf'`, `frequency.value = 1681.97`,
   `gain.value = 4.0` -> a `BiquadFilterNode` of `type = 'highpass'`, `frequency.value = 38.13`,
   `Q.value = 0.5` -> `merger` input `i + 2`. Leave the low-band chain (the 150 Hz low-pass from the
   unfiltered `taps[i]` onto its own channel) and the channel count exactly as they are.
5. In the same evaluated string, replace the per-section `rms` value with K-weighted loudness:
   `loud = sq > 0 ? -0.691 + 10 * Math.log10(sq / len) : -120` where `sq` is the sum of squares of the
   K-weighted channel over the section and `len` as now. `peak` stays the section's max absolute
   sample of the same (K-weighted) channel, in dB as now. `low` stays plain RMS of the low-band
   channel, as now. Return `{ loud, peak, low }` per section.
6. In `report()`, use `l.loud` everywhere `l.rms` is used now (table cells, `SILENT`, `loudest`,
   `present`, the lead's `> -45` test, the pad/chords gap, the bass-over-lead test, the `plays` count
   in the suggestions). Change the heading to
   `` `${basename(path)} in ${result.style}: K-weighted loudness (LUFS-style) / K-weighted peak dB per section${... ? ', low = plain RMS below 150 Hz' : ''}\n` ``
   (keep the existing condition for the low suffix). Change the last line to
   `For a sparse part (stabs, hits), compare peaks: loudness reads low when most of a section is silent.`
   Change the word `RMS` in the pad/chords flag text to `loudness`, so it reads
   `(loudness and peak)`.
7. At the top of `report()`, add four named constants and use them in place of the literals in
   the flag tests and their `need()` calls: `PAD_GAP = 10` (pad/chords more than this many dB under
   the lead on both loudness and peak), `ARP_GAP = 8` (arp peak more than this under the lead's
   peak), `BASS_OVER = 0` (bass loudness more than this over the lead's), `KICK_OVER = 1` (bass low
   end more than this over the kick's low end; do not re-tune this one). Each gets a one-line
   comment saying what it compares and that it was tuned against the six reference songs. The
   bass-over-lead test becomes `x.l.loud > lead.l.loud + BASS_OVER`, with message value and `need()`
   amount using `x.l.loud - lead.l.loud - BASS_OVER`.
8. Calibrate `PAD_GAP`, `ARP_GAP` and `BASS_OVER`:
   a. Temporarily set `PAD_GAP = -99`, `ARP_GAP = -99`, `BASS_OVER = -99`, so every comparison prints
      a flag with its measured value.
   b. Run balance on each of the six reference songs (one at a time) and save the output to
      `/tmp/balance-probe/<song>.txt`.
   c. For each rule, take the largest value its flags print across all six songs: for pad/chords the
      "N dB under" value, for the arp the "peaks N dB under" value, for the bass the "N dB over"
      value (a bass under the lead prints a negative N because of the -99; use it as printed).
   d. Set each threshold to that largest value plus 1, as an integer, then clamp: `PAD_GAP` to
      7..14, `ARP_GAP` to 5..12, `BASS_OVER` to -3..3.
   e. Run balance on the six reference songs again with the final thresholds and save the output
      to `/tmp/balance-after/<song>.txt`. If a song still gets a flag because of a clamp, leave it
      and list it in the report.
9. Re-run balance on `ivory-and-ash`, `exit-sign`, `save-point`, `the-silent-keep`, `night-shift`
   and `shortwave` (one at a time). In `docs/ideas.md`, rewrite the "Older songs' mixes" bullet to
   name exactly the ones that still get flags (keep Shortwave's mention as "Shortwave's pluck" only
   if its only flags are on its pluck track). If none get flags, delete the bullet.
10. Update `tools/README.md`, the `**balance:**` bullet: say it measures each track's K-weighted
    loudness (the BS.1770 filters behind LUFS: a gentle high-pass that discounts deep bass and a
    +4 dB shelf above about 1.7 kHz) and K-weighted peak per section, with the low band below 150 Hz
    still plain RMS; state the four thresholds with their final values. Keep everything else in the
    bullet that is still true.
11. Update `docs/composing.md` item 4: the thresholds it quotes become the final values; "RMS"
    used for the per-track levels becomes "loudness" where it describes what the tool prints
    (leave the Fathom and Wayfarer's Rest history sentences as they are); replace the sentence
    "The lead should be on top: in Shortwave's hook it sits at −30 dB with the keys at −36 and the
    drums at −33." with the same kind of sentence using Velvet Freeway's bars 33-40 row from
    `/tmp/balance-after/velvet-freeway.txt`: its lead, stabs and drums loudness values, rounded as
    printed, written with a Unicode minus sign.
12. Write `.handoff/report.md`: files changed; for each of the six reference songs the flag lines
    before (from `/tmp/balance-before`) and after (from `/tmp/balance-after`); the three calibrated
    maxima from step 8c and the final thresholds; the step 9 result per song; every Acceptance
    command with its result.

## Acceptance
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `git diff --name-only` lists only files from **Files to touch** (`.handoff/report.md` is untracked
  and not listed).
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- velvet-freeway` exits 0, its first line
  contains `K-weighted loudness (LUFS-style)`, and its output contains `No flags.` or only flags that
  `.handoff/report.md` lists as left by a clamp.
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- night-bus-home` exits 0 and its output
  contains `No flags.` or only flags that `.handoff/report.md` lists as left by a clamp.
- `sed 's/^track arp role=arp vol=0.95/track arp role=arp vol=0.1/' src/songs/velvet-freeway.song > /tmp/vf-quiet-arp.song && EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- /tmp/vf-quiet-arp.song`
  prints at least one line containing `(arp) peaks`.
- `sed 's/^track pad role=pad vol=0.9/track pad role=pad vol=0.05/' src/songs/velvet-freeway.song > /tmp/vf-quiet-pad.song && EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- /tmp/vf-quiet-pad.song`
  prints at least one line containing `(pad) is` and `(loudness and peak)`.
- `sed 's/^track bass role=bass vol=0.42/track bass role=bass vol=0.42 vol.synthwave=4/' src/songs/velvet-freeway.song > /tmp/vf-loud-bass.song && EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- /tmp/vf-loud-bass.song`
  prints at least one line containing `(bass) is` and `dB over`.
- `grep -c "K-weighted" tools/README.md` prints 1 or more.
- `grep -c "Shortwave's hook it sits at" docs/composing.md` prints 0.

## Parallel work
None — do it sequentially.

## Constraints
- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`. Temporary files outside
  the repo (`/tmp/...`) and installing dependencies are fine.
- Do not edit `tools/browser/cdp.mjs`, any song in `src/songs/`, any generator in `tools/arranger/`,
  or any test.
- Run only one browser at a time: never run two `npm run balance` commands in parallel.
- Keep the table's column layout, the suggested-volume logic, `BALANCE_STRICT`, the `all` style
  option and the bars-per-section argument working as they do now.

## Out of scope
- Changing `tools/browser/loudness.mjs`, `tracks.mjs`, `levels.mjs` or any other browser tool.
- Gating, momentary/short-term loudness, or true-peak measurement.
- Fixing the mix of any song.
- Changing `docs/model-notes.md` or any other doc not listed.

## If blocked
- If Chromium will not start even with the wrapper, stop and report the exact error from the
  balance output; do not change `cdp.mjs`.
- If an `OfflineAudioContext` channel-count error appears, stop and report the song and the error.
- If calibration (step 8) leaves a reference song flagged at every clamp, finish the remaining steps
  with the clamped values and list the flags in the report.
