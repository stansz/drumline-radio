## Goal

One complete, final pass that moves every piece of plumbing the song generators in
`tools/arranger/` still repeat into `tools/arranger/lib.mjs`, so every generator writes notes,
chords, bars, sections and files the same way. Every generated song must stay byte-identical.
This is the whole list: after this pass no generator defines any of the helpers below itself.

Plumbing means code that turns musical decisions into song-file text or moves bars around.
Musical choices (pitches, melodies, chords, voicings, rhythms, grooves, drum and stab patterns,
velocities, velocity caps, swing, note spelling per song) stay in each song's own script.

## Files to touch

- `tools/arranger/lib.mjs`
- `tools/arranger/arranger.mjs`, `club.mjs`, `confetti-cannon.mjs`, `exit-sign.mjs`, `fathom.mjs`,
  `fur-elise.mjs`, `greensleeves.mjs`, `ivory-and-ash.mjs`, `last-stop.mjs`, `mountain-king.mjs`,
  `night-bus-home.mjs`, `night-shift.mjs`, `nocturne.mjs`, `piano-piece.mjs`, `clair-de-lune.mjs`,
  `moonlight.mjs`, `riverfront.mjs`, `save-point.mjs`, `songs.mjs`, `sunliner.mjs`,
  `swan-lake.mjs`, `the-silent-keep.mjs`, `velvet-freeway.mjs` (all in `tools/arranger/`)
- `tools/arranger/examples/form-demo.mjs`
- `AGENTS.md`, `tools/README.md`
- `.handoff/report.md`

## Steps

1. Run `npm ci`.

2. Add these exports to `tools/arranger/lib.mjs`, each with a one-line comment in the style of
   the existing ones. Keep every existing export unchanged except `sectionBuilder` (step 2.12).

   2.1 `export const R = 'R';`

   2.2 `export const TICKS` — make the existing private `TICKS` table an export (same values).

   2.3 `export function noteMidi(name)` — parses `C4`, `C#4`, `Db4`, `C-1` with
       `/^([A-G])(#|b)?(-?\d)$/`; returns `(octave + 1) * 12 + letter + accidental` using
       `{ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }`, `#` = +1, `b` = -1. Throws
       `bad note ${name}` when it does not match.

   2.4 `export const PITCH_CLASS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
       'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };`

   2.5 `export const CHORD_QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10],
       m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6] };`

   2.6 `export function parseChord(symbol, shift = 0)` — matches
       `/^([A-G](?:#|b)?)(maj7|m7|m|7|dim)?(?:\/([A-G](?:#|b)?))?$/`, throws `bad chord ${symbol}`
       on no match, returns `{ pc, iv, bass }` where `pc = mod12(PITCH_CLASS[root] + shift)`,
       `iv = CHORD_QUALITY[quality ?? '']`, `bass = slash ? mod12(PITCH_CLASS[slash] + shift) : pc`,
       and `mod12(x) = ((x % 12) + 12) % 12`.

   2.7 `export function chordText(pitches, name = noteName)` → `` `[${pitches.map(name).join(' ')}]` ``.

   2.8 `export function transpose(text, by, name = noteName)` — returns `text` unchanged when
       `by === 0`; otherwise replaces every match of `/\b[A-G](?:#|b)?\d\b/g` with
       `name(noteMidi(match) + by)`.

   2.9 Bar-list helpers:
       - `export function times(n, fn)` → `Array.from({ length: n }, (_, i) => fn(i))`
       - `export function repeatBar(bar, n)` → `Array(n).fill(bar)`
       - `export function repeatBars(bars, n)` → `Array.from({ length: n }, () => bars).flat()`
       - `export function cycle(list, n)` → `Array.from({ length: n }, (_, i) => list[i % list.length])`

   2.10 `export function entryVelocity(vel, bars, { afterRests = true } = {})` — maps each bar:
        `null`/`undefined`/`'R'` → `'R'`; otherwise prefixes `` `v=${vel} ` `` when `i === 0`, or
        when `afterRests` and the previous bar is `null`, `undefined` or `'R'`; else the bar as is.

   2.11 Lookups:
        - `export function valueAt(table, i)` → the value of the last `[start, value]` entry with
          `start <= i` (`table.filter(([a]) => a <= i).pop()[1]`).
        - `export function barMarks(list)` → `new Map([...list].map(([bar, text]) => [bar - 1, text]))`
          (1-based bar numbers to `writeBlock` marks).
        - `export function chordSpans(text)` → `text.split(' ')` as `{ c: parseChord(s), ticks: 3840 / count }`.
        - `export function eachChord(texts, fn)` → `texts.map((t) => chordSpans(t).map(({ c, ticks }) => fn(c, ticks)).join(' '))`.

   2.12 Replace `sectionBuilder(keys)` with `sectionBuilder(keys, { label, exact = false } = {})`
        returning `{ tracks, marks, sections, section, block }`:
        - `section(name, n, parts, { map } = {})`: `start` = current length + 1, `end` = start + n - 1.
          Pushes mark `[start - 1, label ? label(name, start, end) : name]` and
          `{ name, start, end }` onto `sections`. For each key: `list = parts[key] ?? []`; throws the
          existing "more than n" error when `list.length > n`; with `exact`, also throws
          `` `${name}: ${key} has ${list.length} bars` `` when `parts[key]` is given and its length is
          not `n`; pushes `list[i] ?? 'R'`, passed through `map(bar, key)` when `map` is given.
        - `block(key, options)` → `writeBlock(tracks[key], marks, options)`.

   2.13 `export function formHeader(form)` for forms of `{ name, bars }` (bars = space-separated
        chord names), returning `{ chords, starts, chordRange, chordLines, formLines }` built exactly
        as `CHORDS`, `starts`, `chordRange`, `chordLines` and `formLines` are built today in
        `sunliner.mjs` and `velvet-freeway.mjs`.

   2.14 Output:
        - `export function outDir()` → `process.argv[2] ?? 'src/songs'`
        - `export function saveSong(out, file, text)` → `mkdirSync(out, { recursive: true })`,
          `writeFileSync(join(out, file), text)`, returns `join(out, file)`.

3. Switch every generator to the lib versions, deleting the local copies. Call the lib names
   directly: no local aliases (`const off = offsetText`, `const shiftOf = offsetText`,
   `const each = ...map`, `const v = (...) => entryVelocity(...)`, and so on).
   - `midi` → `noteMidi`: arranger, club, fur-elise, greensleeves, mountain-king, nocturne,
     save-point. Delete their `LETTER` tables. `arranger.mjs` stops exporting `midi`.
   - Chord parsing → `parseChord` / `PITCH_CLASS` / `CHORD_QUALITY`: arranger (`chord(sym, shift)`),
     club and ivory-and-ash (`chord`), save-point and swan-lake (`chord`). Delete their `PC` and
     `QUALITY` tables; any other use of `PC[...]` becomes `PITCH_CLASS[...]`.
   - `chordOf` (confetti-cannon, fathom, riverfront) and `chordName` (the-silent-keep) →
     `chordText(notes, nm)`. In sunliner and velvet-freeway, `chd` builds its brackets with
     `chordText(pitches, nm)`.
   - Transposers → `transpose(text, by, nm)`: arranger `tr`, save-point `up`, swan-lake `up`.
     night-bus-home `up(p)` becomes `transpose(p, 12, nm)`.
   - `rep` (club, ivory-and-ash, night-shift, nocturne) → `repeatBar`; `rest(count)` (sunliner,
     velvet-freeway) → `repeatBar(R, count)`; `repeat` (exit-sign) and `loop` (last-stop) →
     `repeatBars`; `cyc` (club, night-shift) → `cycle`; `bars(n, fn)` (fathom, night-bus-home)
     and `fill(n, fn)` (riverfront) → `times`.
   - `v(vel, bars)` → `entryVelocity(vel, bars)` in club, ivory-and-ash, night-shift, save-point;
     `entryVelocity(vel, bars, { afterRests: false })` in greensleeves and swan-lake.
   - `velAt` (fur-elise, mountain-king) → `valueAt(DYN, i)`; `at` (mountain-king, nocturne) →
     `barMarks(SECTIONS)`.
   - `spans`/`each` in ivory-and-ash → `eachChord`. In swan-lake, `each(names, fn)` becomes
     `eachChord(names.map((b) => H[b]), fn)` and every `T` function's second parameter becomes
     `ticks`, with `half` replaced by `ticks === 1920`. `each` (night-shift) and `ch`
     (save-point) → plain `.map(fn)`.
   - Every `const R = 'R'` → import `R`. club's `TICKS` table → import `TICKS`.
   - `const off = offsetText` (sunliner, velvet-freeway) and `const shiftOf = offsetText`
     (night-bus-home) → call `offsetText` directly.
   - Sections: every generator that lays parts out section by section uses `sectionBuilder` and
     its `block`, and deletes its own `tracks`/`marks`/`section`/`push` and its
     `block = (key) => writeBlock(tracks[key], marks)` line:
     - fathom, ivory-and-ash, last-stop, night-bus-home, night-shift, riverfront: destructure
       `block` from the builder and delete the local `block` line.
     - greensleeves (its `parts` object), save-point (pass `{ map: (bar, key) => transpose(bar,
       key === 'drums' ? 0 : by, nm) }`), swan-lake (`section(name, bars, parts)` passes
       `bars.length` as n): plain builder.
     - sunliner, velvet-freeway: `push(name, { bars, ...parts })` → `section(name, bars, parts)`;
       the header lines come from `formHeader(FORM)`.
     - the-silent-keep: builder with `label: (name, start, end) => `${name} (bars ${start}-${end})``;
       its local `section(name, n, time, parts)` keeps only its `times` push, then calls the
       builder's `section`; its `form` list comes from the builder's `sections`.
     - exit-sign: builder with the same `label` and `exact: true`; its local
       `section(name, progression, parts)` keeps only its `form` push and calls the builder's
       `section` with `n = PROGRESSIONS[progression].length`.
     - fur-elise, mountain-king, nocturne, confetti-cannon, club, piano-piece keep their own
       layout and call `writeBlock` with their options; they are not section-by-section.
   - Output: every script that reads `process.argv` for its folder uses `const out = outDir();`
     and writes with `saveSong(out, file, text)`; keep each script's `console.log` line as it is.
     `songs.mjs` keeps `const [out = 'src/songs', ...only] = process.argv.slice(2);` (it needs
     `only`) but drops its `mkdirSync`. `arranger.mjs` `writeSong`, `piano-piece.mjs`
     `writePianoPiece` and `examples/form-demo.mjs` write through `saveSong`. No file in
     `tools/arranger/` other than `lib.mjs` imports `mkdirSync` or `writeFileSync`.

4. These stay local on purpose; do not move them: each song's `nm` line (its spelling choice),
   `vel` velocity caps (sunliner, velvet-freeway), `n`/`chd` note builders in sunliner and
   velvet-freeway (they apply the song's cap), `stabBar`, `hookBar`/`answered`, `padBar`,
   `bassBar`, drum and groove helpers (`ride`, `wash`, `hissHits`, `roll8`, `kickOnly`, ...),
   club's `stretchText`, arranger's `fill` (it falls back to smaller units), mountain-king's
   `shiftOf` array, the `loop` pickers in night-bus-home and night-shift, riverfront's `CHORDS`
   and `ch`, confetti-cannon's `chordLines`, the-silent-keep's `humanize`, ivory-and-ash's `lay`, exit-sign's
   `velocity`, fur-elise's per-bar `push`, and all melody, chord and voicing data.

5. Update the docs, replacing the existing `lib.mjs` paragraph in `tools/README.md` and the
   existing `lib.mjs` bullet in `AGENTS.md`:
   - `tools/README.md`: list every `lib.mjs` export by group (text: `writeBlock`, `barLength`,
     `TICKS`, `DURATIONS`, `durationText`, `splitDuration`, `fillUnits`, `noteName`,
     `SHARPS`/`FLATS`/`MIXED`, `noteMidi`, `chordText`, `transpose`, `offsetText`,
     `clampVelocity`; chords: `PITCH_CLASS`, `CHORD_QUALITY`, `parseChord`, `chordSpans`,
     `eachChord`; bars: `R`, `times`, `repeatBar`, `repeatBars`, `cycle`, `entryVelocity`,
     `valueAt`, `barMarks`; layout: `sectionBuilder` with `label`/`exact`/`map`/`block`/`sections`,
     `formHeader`; files: `outDir`, `saveSong`).
   - `AGENTS.md` bullet, in these words: "Song generators in `tools/arranger/` take all their
     plumbing from `tools/arranger/lib.mjs` (see `tools/README.md`) and never define their own
     copy. A new generator starts from `lib.mjs`, not from another song's script. When a helper
     that turns music into song text is needed by a second generator, it moves into `lib.mjs` in
     the same change. Only plumbing goes in `lib.mjs`: melodies, chords, voicings, grooves,
     drum and stab patterns, velocities, velocity caps and note spelling stay in each song's own
     script, so songs don't start to sound alike."

## Acceptance

- `npm test` exits 0 (includes `tests/drift.test.ts`: all 21 generator scripts reproduce
  `src/songs/` byte for byte).
- `npm run typecheck` exits 0.
- `git status --porcelain src/` prints nothing.
- `grep -nE "^(export )?(const|function) +(midi|LETTER|PC|QUALITY|TICKS|rep|cyc|repeat|rest|bars|chordOf|chordName|spans|velAt|at|tr|up|off|R|starts|chordRange|formLines)\b|^const loop = \(bars|^const fill = \(n|^const ch = \(list|= (offsetText|clampVelocity);|^const (CHORDS|chordLines) = FORM" tools/arranger/*.mjs | grep -v "^tools/arranger/lib.mjs"` prints nothing.
- `grep -nE "^const (v|each) *=|^function section\b|^const block = \(key\) => writeBlock\(tracks\[key\], marks\)" tools/arranger/*.mjs | grep -vE "^tools/arranger/(exit-sign|the-silent-keep)\.mjs:[0-9]+:function section"` prints nothing.
- `grep -ln "mkdirSync\|writeFileSync" tools/arranger/*.mjs tools/arranger/examples/*.mjs` prints only `tools/arranger/lib.mjs`.
- `grep -ln "process.argv" tools/arranger/*.mjs` prints only `tools/arranger/lib.mjs` and `tools/arranger/songs.mjs`.
- `node tools/arranger/examples/form-demo.mjs /tmp/demo-check` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`. Never edit anything
  in `src/songs/`: if a song's output changes, fix the generator.
- Output must stay byte-identical; the drift test is the judge. Run `npx vitest run tests/drift.test.ts`
  after each generator you change.
- Installing dependencies and temporary files outside the repo are fine.

## Out of scope

- Any change to musical content, track headers, song headers or console messages.
- Literal numbers such as `3840` in song scripts.
- Moving the items listed in step 4.
- `src/`, `tests/`, `docs/`.

## If blocked

If one replacement in step 3 cannot be made byte-identical (for example night-bus-home's
`transpose(p, 12, nm)` spells a note differently), keep that one local copy, finish everything
else, and list it in `.handoff/report.md` with the diff it would cause. Do not change a
lib.mjs signature from this plan to make one song fit without reporting it.
