## Goal

Compose and add one new original song to Drumline Radio: a slow, bittersweet orchestral concert
waltz (valse lente), 4 to 5 minutes long, built by its own generator script on
`tools/arranger/lib.mjs`, passing every check below. You are the composer: every musical choice
is yours, within the brief.

## Files to touch

- `tools/arranger/<slug>.mjs` (new; `<slug>` is your song's title in kebab case)
- `src/songs/<slug>.song` (new; written only by running your script, never by hand)
- `tests/drift.test.ts` (add your script to `SCRIPT`)
- `README.md` (the originals list)
- `tools/README.md` (a short paragraph on your script, next to the other own-script songs)
- `docs/model-notes.md` (an entry for this song, in the form of the existing entries)
- `tools/arranger/lib.mjs` only if step 4's plumbing rule requires it
- `.handoff/report.md`

## Steps

1. Run `npm ci`. Create the browser wrapper the balance check needs as root:
   `printf '#!/bin/sh\nexec /usr/lib64/chromium-browser/chromium-browser --no-sandbox "$@"\n' > /tmp/chromium-nosandbox && chmod +x /tmp/chromium-nosandbox`.
   Every `npm run balance` below runs as `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- <slug>`.

2. Read, in full: `AGENTS.md`, `docs/composing.md` (including "Pick how to build it" and "Before
   committing"), `docs/song-format.md`, `docs/sound.md` (the Orchestral section and the instrument
   bank), `tools/README.md` (the `lib.mjs` list and the generator check), and
   `src/audio/instruments.ts` (the comment on each instrument). Read two existing scripts for layout
   only, for example `tools/arranger/the-black-coach.mjs` and `tools/arranger/riverfront.mjs`; do not
   copy code or musical material from them.

3. The brief:
   - A slow, bittersweet orchestral concert waltz, a valse lente: wistful rather than ballroom,
     in the spirit of the slower waltzes of Tchaikovsky or Khachaturian. That is a reference for
     style and feel only; the melody, harmony and every figure are your own original material.
   - `style: orchestral`, `category: originals`, `time: 3/4`, tempo 88, `key: A-flat major` with a
     middle section in F minor. Length 4:00 to 5:00 (about 135 to 160 bars at 88).
   - The waltz pulse: low strings (`role=bass`) on beat 1, harp (`role=chords`) or pizzicato
     (`inst=pizzicato`) on beats 2 and 3. Give it the Viennese lilt: beat 2 slightly early
     (a small negative tick offset) and beat 3 on time or slightly late, varied, not constant.
   - The strings (`role=lead`) carry the main waltz theme; the horns (`role=lead2`) answer it with a
     counter-melody; the concert flute (`role=counter`) takes the second theme. A string pad
     (`role=pad`) under it all. Optionally one soft choir lift near the end (`inst=bank:choir-ooh`);
     glockenspiel (`role=arp`) only as a touch of colour. No oboe, no tubular bells.
   - Form: a short intro that sets up the pulse; waltz theme A on the strings; theme A again,
     fuller, with the horns answering; a contrasting, lighter theme B on the flute; a darker middle
     section in F minor; a slow build back; theme A in full; a coda that slows with tempo ramps
     (`@bars <from>-<to> tempo=88..<lower>`) and ends on a soft final chord. Change something every
     8 or 16 bars. Use the tempo ramps sparingly elsewhere too (a breath at the end of a long
     phrase is fine).
   - Make it feel human: uneven velocities, small microtiming on the melody and the horns, phrasing
     that swells and falls. Keep registers apart: low strings low, harp and pad in the middle, horns
     middle-upper, strings and flute on top. The lead sits on top; the bass never louder than the
     lead; the pad and harp audible, not buried.
   - The Orchestral style already has The Cartographer (A major, 96 BPM, 4/4 overture), Lantern Ward
     (D minor, 76 BPM, 6/8 nocturne, oboe-led) and The Black Coach (G minor, 144 BPM, 3/4 scherzo).
     This song must sound clearly different from all three: slow, lyrical, major-key, string-led.

4. Build it as its own script, `tools/arranger/<slug>.mjs`:
   - Start the file from `tools/arranger/lib.mjs` (import what you need; it does note names,
     chord symbols, bars, sections, note text and saving). Every musical choice is written fresh in
     your script.
   - Use `sectionBuilder(keys, { barTicks: 2880 })` so every 3/4 bar is checked.
   - Write the chords once, and put `# chords:` lines in the song header (`formHeader` can build
     them), so `check:songs` counts off-chord notes.
   - Start the song file with a comment saying what the song is, who wrote it and how it is built,
     and give it an `about:` line.
   - If your script needs a plumbing helper that another script already has, move it into
     `lib.mjs` in this change (never a musical choice), and keep every other song byte-identical.
   - Run it with `node tools/arranger/<slug>.mjs` to write `src/songs/<slug>.song`. Add the script
     to `SCRIPT` in `tests/drift.test.ts`.

5. Credit: `composer:` is your own model name and SZ, e.g. `DeepSeek V4 & SZ`, the same names in
   the file's first comment, the README entry and the model-notes entry. If you do not know your
   exact model name, write `DeepSeek & SZ` and say in the report that the exact version is unknown;
   never guess a version.

6. Checks, fixing the song (in your script, then regenerate) until all pass:
   - `npm test` passes.
   - `CHECK_DETAIL=1 SONG=<slug> npm run check:songs`: aim for 0 clashes and 0 off-chord. Fix each
     one, or, for a deliberate one (a suspension, an appoggiatura), explain it in the song with an
     `# ok @<bar> <track> <note>: <reason>` line written by your script.
   - `SIBLINGS=orchestral npm run check:songs`: not a twin of the three songs above.
   - `npm run check:generators` prints `No copies found.`
   - `npm run balance -- <slug>` (with the `EDGE_PATH` from step 1) prints `No flags.` Fix flags as
     `docs/composing.md` step 4 says (track `vol=`, or velocities for a flag in only some bars).
     Run renders one at a time.

7. Docs: the README entry (a few lines on the song, in the style of its neighbours), a
   `tools/README.md` paragraph on the script, and a `docs/model-notes.md` entry saying how it was
   built and what the checks printed.

8. In `.handoff/report.md`, besides the usual: the title, slug, length, bar count, the form as a
   table of bar ranges, the final output of `SONG=<slug> npm run check:songs` and of the balance
   check, and anything you would improve in the tooling or docs.

## Acceptance

With `S=$(git status --porcelain src/songs | sed -n 's|^?? src/songs/\(.*\)\.song$|\1|p')`:

- `echo "$S" | wc -w` prints `1` (exactly one new song file).
- `test -f tools/arranger/$S.mjs && grep -q "tools/arranger/$S.mjs" tests/drift.test.ts && echo ok` prints `ok`.
- `npm test` exits 0 (includes the drift test for every generator, yours included).
- `npm run typecheck` exits 0.
- `SONG=$S npm run check:songs` exits 0; its line for the song shows `0 clashes` and `0 off-chord`
  (explained ones in `(+N explained)` are fine), a length from `4:00` to `5:00`.
- `grep -E "^(style|time|key|tempo|category):" src/songs/$S.song` prints `style: orchestral`,
  `time: 3/4`, `key: A-flat major` (or `Ab major`), `tempo: 88`, `category: originals`.
- `npm run check:generators` prints `No copies found.`
- `EDGE_PATH=/tmp/chromium-nosandbox npm run balance -- $S` prints `No flags.`
- `git status --porcelain src/ | grep -v "src/songs/$S.song"` prints nothing.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Never edit `src/songs/<slug>.song` by hand; change the script and regenerate.
- Don't change shared code (styles, instruments, engine, the arranger, the checkers). The one
  exception is `lib.mjs` under step 4's rule.
- Original melody only, nothing copyrighted or quoted from an existing piece.
- Run balance renders one at a time (the VM has 2 GB of RAM). Temporary files go under `/tmp`.
- Stop any server or browser you start.

## Out of scope

- Changing any other song, its script or its notes.
- A test file of its own for this song.
- Changes to the checkers, the balance thresholds or the style definitions.

## If blocked

If the balance check keeps flagging a part after three rounds of changes, stop changing it and
report the flag with the table rows. If a render fails three times, report it and finish the rest.
If something in the song format cannot express part of the brief, write the nearest thing it can
and say what you changed in the report.
