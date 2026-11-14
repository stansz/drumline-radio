## Goal

Two changes, done in order:

A. Re-orchestrate The Gilded Hour (`tools/arranger/the-gilded-hour.mjs`) so it stops sounding like
   the other Orchestral originals, which all use strings lead, horns, harp, string pad, cellos,
   bells or glockenspiel and timpani. It becomes a piano-led salon waltz with a solo cello, and its
   two themes become mostly stepwise. Form, key, tempo, harmony and tempo ramps stay.

B. Make that kind of sameness visible before a song is written: `SIBLINGS=<style> npm run
   check:songs` also lists each song's lead instrument and its parts, and `docs/composing.md` and
   `docs/song-prompt.md` ask for a lineup, form shape and melodic motion that differ from the
   style's existing songs.

## Files to touch

- `tools/arranger/the-gilded-hour.mjs`
- `src/songs/the-gilded-hour.song` (only by running the script)
- `tools/check/songs.check.ts`
- `docs/composing.md`, `docs/song-prompt.md`
- `README.md`, `tools/README.md`, `docs/model-notes.md`
- `.handoff/report.md`

## Steps

1. Run `npm ci`. Create the browser wrapper the balance check needs as root:
   `printf '#!/bin/sh\nexec /usr/lib64/chromium-browser/chromium-browser --no-sandbox "$@"\n' > /tmp/chromium-nosandbox && chmod +x /tmp/chromium-nosandbox`.
   Balance runs as `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- the-gilded-hour`.

2. Before changing anything, save `SONG=src/songs/the-gilded-hour.song npm run report:song` to
   `/tmp/report-before.txt` and `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- the-gilded-hour`
   to `/tmp/balance-before.txt`.

### A. The Gilded Hour

3. Read `AGENTS.md`, `docs/composing.md`, `docs/song-format.md`, the Orchestral and Cinematic
   sections of `docs/sound.md`, and the comments on these bank instruments in
   `src/audio/instruments.ts`: `grand-piano`, `cello`, `string-section`, `string-bass`, `music-box`,
   `choir-ooh`.

4. Keep: the 136-bar form and its section names, `key: A-flat major` with the F minor middle,
   `tempo: 88`, `time: 3/4`, the chord of every bar (the `# chords:` lines), every `@bars` tempo
   ramp, the title, `composer: DeepSeek & SZ` and the `about:` line's facts that stay true.

5. The new lineup, exactly these tracks in this order, and no others (the song's `style:` stays
   `orchestral`; `inst=bank:` keeps each sound in every remix):
   - `track piano role=lead inst=bank:grand-piano`: the right hand, which sings both themes as a
     single melodic line (no chords in this track).
   - `track waltz role=chords inst=bank:grand-piano`: the piano's left-hand chords on beats 2 and 3
     of every waltz bar, keeping the Viennese lilt the song has now (beat 2 early by a varied small
     negative offset, beat 3 on time or a little late).
   - `track cello role=lead2 inst=bank:cello`: the solo cello. It answers the piano in theme A's
     rests, takes theme B (bars 41-60) with the piano accompanying, and carries the F minor middle
     (bars 61-76).
   - `track strings role=pad inst=bank:string-section`: sustained chords, resting in at least the
     intro's first 4 bars and in theme B, so it is not under the whole song.
   - `track choir role=pad inst=bank:choir-ooh`: the one soft lift near the end, where it is now.
   - `track musicbox role=counter inst=bank:music-box`: a few notes of colour in the intro and the
     coda only.
   - `track bass role=bass inst=bank:string-bass`: the plucked double bass on beat 1 of every waltz
     bar (the "oom"), resting where the texture thins.
   Remove the violins, horns, flute, harp, pizzicato, glockenspiel and timpani tracks and the
   `vol@` ramps that belonged to them.

6. Rewrite theme A and theme B so they are mostly stepwise and singable: neighbouring melody notes
   a second apart most of the time, leaps kept for the high point of a phrase and its turn. Keep
   each phrase's length, its cadence points and the chord of every bar. Keep the melody in the
   piano's singing register (about C4-C6). The cello's lines follow the same principle.

7. Mix it: run the balance check and fix every flag through the tracks' `vol=` and velocities, as
   `docs/composing.md` step 4 says. Do not raise the music box above "colour"; its role is `counter`
   so the arp rule does not apply to it.

8. Update the song file's first comment (how it is built and orchestrated), the README entry, the
   `tools/README.md` paragraph about the script, and add a dated "Reworked" note to The Gilded
   Hour's entry in `docs/model-notes.md`: re-orchestrated for piano, cello and strings and the
   themes made stepwise, because it sounded like the other Orchestral originals.

### B. Make sameness visible

9. `tools/check/songs.check.ts`, the `SIBLINGS` report: after the existing kit and bass columns,
   add `lead: <name>` (the resolved patch name of the first `lead` track, `—` when there is none)
   and `parts: <names>` (the resolved patch names of every track, in track order, without
   duplicates, joined with `, `), resolved with the same `resolvePatch` call the kit and bass
   columns use. Update the comment that describes the report. Nothing else in the check changes.

10. `docs/composing.md`, "Before writing": change the "make the new one different on paper" bullet
    so it lists key, tempo, form, drum feel, the lead instrument and the lineup, the build-up shape
    (the order in which parts enter and the sections grow), and the melody's motion (the share of
    steps and leaps that `npm run report:song` prints). Add that a style's role defaults give every
    song in it the same sound, so a new song picks at least its lead and one other main part from
    outside what its style-mates use (`SIBLINGS=<style> npm run check:songs` lists them), with
    `inst=` or `inst=bank:`. Add that a singable melody is mostly stepwise, with leaps for emphasis,
    and that melodies built from chord tones come out leap-heavy and sound alike.

11. `docs/song-prompt.md`: in the brief, change the instruments line to
    `- <Lead instrument and lineup, chosen to differ from the existing songs in this style: run
    SIBLINGS=<style> npm run check:songs and name what they use>.` and add after the form line
    `- <How the form builds, different from the existing songs in this style>.` In the
    "Before filling it in" paragraph, replace the grep command with
    `SIBLINGS=<style> npm run check:songs`, which lists the style's songs with key, tempo, kit,
    bass, lead and parts.

12. `tools/README.md`, the song-check section: describe the new `lead:` and `parts:` columns.

13. Save `SONG=src/songs/the-gilded-hour.song npm run report:song` to `/tmp/report-after.txt`.

## Acceptance

- `npm test` exits 0 (the drift test includes `the-gilded-hour.mjs`).
- `npm run typecheck` exits 0.
- `grep -E "^track" src/songs/the-gilded-hour.song | awk '{print $2, $3, $4}'` prints exactly:
  `piano role=lead inst=bank:grand-piano`, `waltz role=chords inst=bank:grand-piano`,
  `cello role=lead2 inst=bank:cello`, `strings role=pad inst=bank:string-section`,
  `choir role=pad inst=bank:choir-ooh`, `musicbox role=counter inst=bank:music-box`,
  `bass role=bass inst=bank:string-bass`, in that order.
- `grep -E "^(key|tempo|time|style|composer):" src/songs/the-gilded-hour.song` prints
  `composer: DeepSeek & SZ`, `style: orchestral`, `key: A-flat major`, `tempo: 88`, `time: 3/4`.
- `grep "^# chords" src/songs/the-gilded-hour.song` prints the same lines as
  `git show HEAD:src/songs/the-gilded-hour.song | grep "^# chords"`.
- `grep "^@bars" src/songs/the-gilded-hour.song` prints the same lines as
  `git show HEAD:src/songs/the-gilded-hour.song | grep "^@bars"`.
- `SONG=the-gilded-hour npm run check:songs` exits 0 and its song line shows `0 clashes` and
  `0 off-chord` (explained ones are fine) and a length within 5 seconds of `4:41`.
- `SONG=src/songs/the-gilded-hour.song npm run report:song` prints a `melody:` line whose
  `steps` is at least `50%`.
- `npm run check:generators` prints `No copies found.`
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- the-gilded-hour` prints `No flags.`
- `SIBLINGS=orchestral npm run check:songs` prints a row for each Orchestral song containing
  `lead:` and `parts:`, and The Gilded Hour's `parts:` contains no harp, glockenspiel, timpani or
  brass patch name.
- `npm run check:songs` exits 0 and its per-song lines for every song other than The Gilded Hour
  are identical to the lines it printed before your changes.
- `git status --porcelain src/ | grep -v the-gilded-hour.song` prints nothing.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Never edit `src/songs/the-gilded-hour.song` by hand; change the script and regenerate.
- Don't change shared code: styles, instruments, engine, `lib.mjs`, the balance check, or any
  other song or script.
- Run balance renders one at a time. Temporary files go under `/tmp`. Stop any server or browser
  you start.

## Out of scope

- Re-orchestrating The Cartographer, Lantern Ward or The Black Coach.
- A melodic-motion column or flag in `check:songs`.
- Changing Orchestral's role defaults in `src/audio/styles.ts`.

## If blocked

If a balance flag will not clear after three rounds of changes, stop, keep the best version, and
report the flag with its table rows. If a bank instrument named above does not exist or cannot
play its part, report it before substituting anything. If keeping a phrase's chords makes a
stepwise line impossible in a bar, keep the chord and allow the leap there, and say where in the
report.
