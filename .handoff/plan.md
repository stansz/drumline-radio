## Goal

Write a new original song for Drumline Radio in the Cinematic style: **First Flight**, a bright,
soaring film cue about the moment of a first flight, built as its own generator script
`tools/arranger/first-flight.mjs` that writes `src/songs/first-flight.song`. The full brief, rules
and style notes are in **Steps** 3-5 below and are binding.

## Files to touch

- `tools/arranger/first-flight.mjs` (new)
- `src/songs/first-flight.song` (new, only by running the script; never edit it by hand)
- `tests/drift.test.ts` (add `'tools/arranger/first-flight.mjs',` as the last entry of `SCRIPT`)
- `README.md` (a song entry, in the same form as the other entries)
- `tools/README.md` (a short paragraph about the script, like the one for The Gilded Hour)
- `tools/arranger/lib.mjs` (only if `npm run check:generators` lists a copy you must move there)
- `.handoff/report.md`

## Steps

1. Run `npm ci`. Create the browser wrapper the balance check needs as root:
   `printf '#!/bin/sh\nexec /usr/lib64/chromium-browser/chromium-browser --no-sandbox "$@"\n' > /tmp/chromium-nosandbox && chmod +x /tmp/chromium-nosandbox`.
   Every balance run is `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- first-flight`.

2. Read `AGENTS.md`, `docs/composing.md` (including its checks before committing),
   `docs/song-format.md`, `docs/sound.md` (the Cinematic section and the instrument bank),
   `tools/README.md` (what `tools/arranger/lib.mjs` offers), and the comments on these bank
   instruments in `src/audio/instruments.ts`: `fm-brass`, `choir-aah`, `pizzicato`, `fm-bells`,
   `analog-synth`, `synth-pad`, `warm-bass`. Run `SIBLINGS=cinematic npm run check:songs` and save
   its output to `/tmp/siblings-before.txt`. Run `npm run check:songs > /tmp/check-before.txt`.

3. The brief:
   - A bright, soaring film cue about wonder and discovery: the moment of a first flight, from a
     quiet, uncertain start to lifting off and seeing everything from above. Think the uplifting
     themes of John Powell or Joe Hisaishi, not a dark trailer and not a slow ballad.
   - A brass theme (`inst=bank:fm-brass`, role `lead`) carries the main melody; an "aah" choir
     (`inst=bank:choir-aah`) doubles its long notes and swells under the big statements, as a
     sustained voice rather than a moving line. Do not use `vox-lead` anywhere: the Cinematic style
     plays it as the overdriven lead guitar. An analog-synth ostinato drives underneath; pizzicato
     (`inst=bank:pizzicato`) and FM bells (`inst=bank:fm-bells`) add sparkle; a warm pad and bass
     hold it up when they play. The kit is used for swells, hits and rolls at the turns of the
     story, not as a steady beat. No overdriven lead guitar, and keep the grand piano, solo cello
     and string section out or in a small supporting role. Confirm from
     `/tmp/siblings-before.txt` that the lineup differs from what the Cinematic songs already use.
   - `tempo: 112`, `key: D major`, `time: 4/4`, `style: cinematic`, length 3:30 to 4:00.
   - Ivory and Ash (C minor, 66 BPM) and The Silent Keep (E minor, 70 BPM) already exist, both slow
     minor-key pieces led by the overdriven lead guitar over piano, solo cello and strings. Make this
     one sound clearly different from them: major-key, faster, bright and airy, led by brass and
     choir instead of guitar, and driven by an ostinato instead of a ballad pulse.
   - Form: a sparse opening (bells and pizzicato, a hint of the motif), the ostinato starting and
     the brass stating the theme quietly, a lift where the pad, bass and choir join and the theme
     rises, a short pull-back where most parts drop out, a long build on the ostinato with the
     drums rolling into it, the climax with the theme in full on brass and choir over everything,
     and a settling outro that ends on a held, open chord. Change something every 8 or 16 bars.
   - How it builds: start almost empty and add one layer at a time; the pull-back before the build
     is the quietest moment since the opening, so the climax has room to land. Not the usual theme,
     fuller theme, contrast, tutti, coda shape of the existing songs.
   - Feel: small microtiming offsets (+N/-N ticks) on the brass lead, the choir and the drum hits,
     uneven velocities, and swells in velocity across long phrases; the ostinato stays tight on the
     grid (no offsets) so the drive stays steady. Follow `docs/composing.md` on micro-timing: make a
     bar's first note late, not early.
   - Registers: bass low, ostinato and pad in the middle, pizzicato and bells above the middle, the
     brass and choir on top. The lead sits on top; the bass sits under the kick, never louder than
     it; chords and pads are audible, not buried 10 dB under the lead.
   - Use the Cinematic style's roles and instruments; reach for other bank instruments only with
     `inst=` when a part needs it.

4. The rules:
   - Original melody only, nothing copyrighted.
   - The header has `title: First Flight` and `composer: MiMo V2.6 Flash & SZ`. The song file's
     first comment and the README entry credit "MiMo V2.6 Flash & SZ".
   - Build it as its own script, `tools/arranger/first-flight.mjs`, started from
     `tools/arranger/lib.mjs` (never copied from another song's script). Every musical choice goes
     in the script. Generate the song with `node tools/arranger/first-flight.mjs`. Run
     `npm run check:generators` and fix every copy of `lib.mjs` plumbing it lists.
   - Don't change shared code (styles, instruments, engine, arranger, the checks). The one exception
     is `tools/arranger/lib.mjs`: a plumbing helper your script needs that another script already
     has moves there, never a musical choice. Do not add a test file for this song.
   - Aim for 0 clashes and 0 off-chord notes in `npm run check:songs`; explain any that remain with
     an `# ok @<bar> <track> <note>: <reason>` line written by the script.
   - Mix it with the balance check and fix every flag it prints through track `vol=` and
     velocities, as `docs/composing.md` describes.

5. The style notes (Cinematic):
   - Plan first. Before writing any notes, write in `.handoff/report.md` and in the song file's
     first comment: the cue's story in one sentence, the lineup (each track, its role and its
     instrument), the main theme's motif (its notes and rhythm), and the form as bar ranges with
     what builds or breaks in each. Then write the music to that plan.
   - Melody: one memorable theme built from a short motif (two to four beats), stated, developed
     (repeated, sequenced, inverted, rhythmically stretched, answered) and finally stated in full.
     Move mostly by step with leaps for the climaxes.
   - Harmony and tension: an ostinato that drives, a pedal note under moving chords, a rising
     sequence, a chromatic or modal shift for a turn in the story, and a cadence or a deliberate
     non-resolution at the end. Don't loop four chords under everything. Write `# chords:` lines.
   - Shape: a real arc, with quiet sections where most parts rest so the big moments land, and a
     clear climax. The pad and the bass do not play in every bar.

6. Run the Acceptance commands below in order and fix what fails, in the script only. Repeat the
   balance check until it prints `No flags.`

7. Add the README entry and the `tools/README.md` paragraph.

8. Finish `.handoff/report.md` with: the plan from step 5; the `melody:` line from
   `SONG=src/songs/first-flight.song npm run report:song`; First Flight's row from
   `SIBLINGS=cinematic npm run check:songs`; the climax bars; the bars where the pad and the bass
   rest; the clash and off-chord counts with any explanations; how many balance rounds it took;
   and the output of every Acceptance command.

## Acceptance

- `node tools/arranger/first-flight.mjs && md5sum src/songs/first-flight.song && node tools/arranger/first-flight.mjs && md5sum src/songs/first-flight.song`
  exits 0 and prints the same checksum twice.
- `npm test` exits 0 (its drift test includes `tools/arranger/first-flight.mjs`).
- `npm run typecheck` exits 0.
- `grep -E "^(title|composer|style|key|tempo|time):" src/songs/first-flight.song` prints
  `title: First Flight`, `composer: MiMo V2.6 Flash & SZ`, `style: cinematic`, `key: D major`,
  `tempo: 112`, `time: 4/4` (in any order).
- `grep -E "^track" src/songs/first-flight.song` shows a track with `role=lead inst=bank:fm-brass`,
  and tracks with `inst=bank:choir-aah`, `inst=bank:pizzicato` and `inst=bank:fm-bells`.
- `grep -c "vox-lead" src/songs/first-flight.song` prints `0`.
- `SONG=first-flight npm run check:songs` exits 0 and its song line shows a length from `3:30` to
  `4:00`, `0 clashes` and `0 off-chord` (explained ones are fine).
- `SONG=src/songs/first-flight.song npm run report:song` prints a `melody:` line whose `steps` is
  at least `50%`.
- `SIBLINGS=cinematic npm run check:songs` prints a `first-flight.song` row with `lead: FM brass`
  and no `Lead guitar` in its `parts:`.
- `npm run check:generators` prints `No copies found.`
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- first-flight` prints `No flags.`
- `npm run check:songs > /tmp/check-after.txt; diff <(grep -v first-flight /tmp/check-before.txt) <(grep -v first-flight /tmp/check-after.txt)`
  prints nothing except lines with timings (`Start at`, `Duration`).
- `git status --porcelain src/` prints only `?? src/songs/first-flight.song`.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Never edit `src/songs/first-flight.song` by hand; change the script and regenerate.
- Don't change shared code: styles, instruments, engine, the checks, other songs or their scripts.
  `lib.mjs` only as rule 3 of step 4 allows.
- Run balance renders one at a time. Temporary files go under `/tmp`. Stop any server or browser
  you start.

## Out of scope

- Changing the Cinematic style's `bankSwaps` or any other style.
- An entry in `docs/model-notes.md` (it is written after review).
- Any other song.

## If blocked

If a balance flag will not clear after four rounds of changes, stop, keep the best version, and
report the flag with its table rows. If a bank instrument named above does not exist or cannot play
its part, report it before substituting anything. If the clash check flags notes you cannot remove
without breaking the theme, explain each with an `# ok` line and say so in the report.
