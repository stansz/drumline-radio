## Goal

Set up the Drumline Radio project (Vite + TypeScript + Vitest, no runtime dependencies), copied from the
sibling repo at `../drumline-studio`, and build the song format: a parser and checker that turns a
song text file into a typed `Song`, plus pure timing functions that turn it into a timeline of notes in
seconds. There is no audio and no real UI in this task; the page is a placeholder.

## Files to touch

Create (the repo currently holds only `BRIEF.md` and `.handoff/`):

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.sandbox.config.mjs`
- `.gitignore`, `LICENSE`, `.github/workflows/deploy.yml`
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/song-format.md`
- `index.html`, `src/main.ts`
- `src/roles.ts`, `src/pitch.ts`, `src/song.ts`, `src/timing.ts`
- `tests/pitch.test.ts`, `tests/song.test.ts`, `tests/timing.test.ts`
- `tests/fixtures/features.song`
- `node_modules/` (copied, ignored by git)

Do not modify `BRIEF.md`.

## Steps

### 1. Project setup

1. Copy these files from `../drumline-studio/` unchanged: `tsconfig.json`, `vitest.sandbox.config.mjs`,
   `.gitignore`, `LICENSE`, `.github/workflows/deploy.yml`.
2. Append the line `.npm-cache/` to `.gitignore`.
3. `package.json`, exactly:

   ```json
   {
     "name": "drumline-radio",
     "private": true,
     "license": "MIT",
     "version": "0.1.0",
     "type": "module",
     "scripts": {
       "dev": "vite",
       "preview": "vite preview",
       "test": "vitest run",
       "test:sandbox": "node node_modules/vitest/vitest.mjs run --config vitest.sandbox.config.mjs",
       "typecheck": "tsc --noEmit",
       "build": "tsc --noEmit && vite build"
     },
     "devDependencies": {
       "typescript": "7.0.2",
       "vite": "8.3.5",
       "vitest": "5.0.5"
     }
   }
   ```

4. Copy `../drumline-studio/package-lock.json` to `package-lock.json`, then replace both occurrences of
   `"name": "drumline-studio"` with `"name": "drumline-radio"`. Change nothing else in it.
5. Copy the installed packages:
   `node -e "require('fs').cpSync('../drumline-studio/node_modules','node_modules',{recursive:true})"`
6. `vite.config.ts`:

   ```ts
   import { defineConfig } from 'vite';

   export default defineConfig({
     base: '/drumline-radio/',
   });
   ```

7. `CLAUDE.md` contains exactly one line: `@AGENTS.md`
8. `AGENTS.md`, exactly:

   ```markdown
   # AGENTS.md

   Drumline Radio is a browser jukebox that plays full songs written as text scores. It uses
   TypeScript, Vite, and Web Audio, with no framework or runtime dependencies. Its sibling project is
   Drumline Studio (`stansz/drumline-studio`).

   Commands: `npm run dev`, `npm test`, `npm run test:sandbox`, `npm run typecheck`,
   `npm run build`. Pushing to `main` deploys to GitHub Pages, and a failing test blocks the deploy.
   `CLAUDE.md` only imports this file.

   ## Read before changing

   - Song files, the parser, or timing: [docs/song-format.md](docs/song-format.md)

   ## Rules

   - Keep `src/song.ts`, `src/roles.ts`, `src/pitch.ts`, and `src/timing.ts` free of the DOM and
     audio, so Vitest can test them.
   - Songs are public-domain melodies (composer long dead and published before 1930, or traditional)
     arranged by Claude, or Claude's own originals. Never add copyrighted songs. Credit every
     public-domain piece in `README.md`.
   - Song data is written by Claude and pasted verbatim. Don't change notes in a song file to make a
     test pass; report the failing check instead.
   - Vitest has no Web Audio or DOM, so test audio logic through exported pure functions. Check UI
     and audio changes in a browser.
   - On Windows, `npm test` and `npm run build` fail with `spawn EPERM` inside the
     `dsh --profile headless` sandbox. Use `npm run test:sandbox` there, and still run `npm test`
     outside the sandbox before committing. Don't widen the sandbox, set `NODE_OPTIONS`, or stub
     modules.
   - Docs describe only what the code does now. When a change makes a doc statement false, fix the
     doc in the same change.
   - Update `README.md` for features or commands, `docs/song-format.md` for the song format, and
     this file for rules.
   ```

9. `README.md`, exactly:

   ````markdown
   # Drumline Radio

   A browser jukebox for full songs written as text scores: public-domain melodies arranged by
   Claude, and Claude's own originals. It is the sibling of
   [Drumline Studio](https://stansz.github.io/drumline-studio/).

   So far the song format and its parser are built. The player and the sound engine are not, so the
   page only shows a placeholder.

   ## Song format

   Each song is one plain-text file. See [docs/song-format.md](docs/song-format.md).

   ## Commands

   ```bash
   npm install
   npm run dev
   npm test
   npm run typecheck
   npm run build
   ```

   ## License

   MIT. See [LICENSE](LICENSE).
   ````

10. `index.html`:

    ```html
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Drumline Radio</title>
      </head>
      <body>
        <div id="app"></div>
        <script type="module" src="/src/main.ts"></script>
      </body>
    </html>
    ```

11. `src/main.ts`: find `#app` and set its content to an `<h1>` "Drumline Radio" and a `<p>`
    "The player is coming soon." using `document.createElement` and `textContent` (no `innerHTML`).
    It imports nothing.

### 2. `src/roles.ts`

```ts
export const STYLES = ['synthwave', 'chiptune', 'orchestral', 'techno'] as const;
export type StyleId = (typeof STYLES)[number];

export const ROLES = ['lead', 'lead2', 'counter', 'pad', 'chords', 'bass', 'arp', 'drums'] as const;
export type Role = (typeof ROLES)[number];
export type PitchedRole = Exclude<Role, 'drums'>;

/** Inclusive MIDI note range allowed for each pitched role. */
export const ROLE_RANGES: Record<PitchedRole, readonly [number, number]> = {
  lead: [48, 96], lead2: [48, 96], counter: [41, 91], pad: [36, 84],
  chords: [36, 84], bass: [24, 60], arp: [36, 96],
};

/** Drum names used in `drums` tracks, mapped to General MIDI percussion numbers. */
export const DRUMS: Record<string, number> = {
  k: 36, rim: 37, s: 38, cl: 39, tl: 41, h: 42, tm: 45, oh: 46, cr: 49, th: 50, rd: 51,
};
```

Also export `isStyle(s: string): s is StyleId` and `isRole(s: string): s is Role`.

### 3. `src/pitch.ts`

- `parsePitch(name: string): number | null`. Accepts `^[A-G](#|b)?[0-8]$` only (uppercase letter,
  optional `#` or `b`, one octave digit). MIDI number = `(octave + 1) * 12 + letter + accidental`,
  where C=0 D=2 E=4 F=5 G=7 A=9 B=11, `#` = +1, `b` = -1. So `C4` = 60, `A4` = 69, `Bb3` = 58,
  `Cb4` = 59, `B#3` = 60. Anything else returns `null`.
- `midiToFreq(midi: number): number` = `440 * 2 ** ((midi - 69) / 12)`.
- `midiName(midi: number): string` using sharps: 60 → `C4`, 61 → `C#4`, 70 → `A#4`.

### 4. `src/song.ts`: the format

Exports:

```ts
export const TICKS_PER_QUARTER = 960;
export const TICKS_PER_WHOLE = 3840;

export interface SongMeta {
  title: string; composer: string; year: string;
  source: 'public-domain' | 'original';
  style: StyleId; key: string;
  tempo: number;            // quarter notes per minute at the start
  time: [number, number];   // starting time signature
  pickupTicks: number;      // 0 when there is no pickup
}
export interface BarInfo {
  number: number;           // 0 for a pickup bar, otherwise 1, 2, 3...
  startTick: number; ticks: number;
  time: [number, number];
  tempo: number;            // quarter notes per minute, constant for the whole bar
}
export interface Note {
  tick: number; ticks: number;
  pitches: number[];        // MIDI numbers, ascending; GM drum numbers in drums tracks
  velocity: number;         // 1..127
  staccato: boolean;
}
export interface Track {
  id: string; role: Role; inst: string | null;
  vol: number; pan: number;
  notes: Note[];            // sorted by tick, ties already merged
}
export interface Song { meta: SongMeta; bars: BarInfo[]; tracks: Track[]; totalTicks: number; }
export type ParseResult = { ok: true; song: Song } | { ok: false; errors: string[] };
export function parseSong(text: string): ParseResult;
```

**Format rules** (implement all of them):

General
- Lines may end in `\n` or `\r\n`. `#` starts a comment that runs to the end of the line, anywhere.
  Blank lines are ignored.
- The file is a header (header lines and directive lines), then one or more track blocks. Header and
  directive lines are only allowed before the first `track` line.

Header lines: `key: value` (key, colon, value; trim both).
- Required: `title`, `composer`, `year`, `source`, `style`, `key`, `tempo`, `time`.
- Optional: `pickup`.
- `source` is `public-domain` or `original`. `style` must be in `STYLES`. `year` is any non-empty
  string (e.g. `1856`, `traditional`). `key` is any non-empty string.
- `tempo` is a number from 20 to 400 (quarter notes per minute, decimals allowed).
- `time` is `N/D`, N an integer 1..32, D one of 1, 2, 4, 8, 16. A bar of `N/D` is
  `N * 3840 / D` ticks.
- `pickup` is a duration (see Durations), e.g. `/4` or `/4.`. Its ticks must be greater than 0 and
  less than one bar of the starting time signature.
- An unknown key or a repeated key is an error.

Directive lines (header section only)
- `@bar N tempo=T` sets the tempo from bar N on. `@bar N time=A/B` sets the time signature from bar N
  on. Both may be on one line: `@bar 5 tempo=90 time=3/4`.
- `@bars N-M tempo=A..B` ramps the tempo across bars N to M (M > N): bar N gets A, bar M gets B, and
  bars in between are linearly interpolated per bar (bar N+i gets `A + (B - A) * i / (M - N)`). Bars
  after M keep B until another directive.
- N must be at least 1 and no higher than the last bar of the song; otherwise it is an error naming
  the bar (`bar 9`). Tempo and time values follow the header rules.
- Bars before any directive use the header `tempo` and `time`. The pickup bar (bar 0) always uses the
  header values.

Track blocks
- Header line: `track <id> role=<role> [inst=<name>] [vol=<v>] [pan=<p>]`, options in any order.
  `id` and `inst` match `^[a-z0-9-]+$`. `role` must be in `ROLES` (`unknown role` otherwise).
  `vol` is 0..1, default 0.8. `pan` is -1..1, default 0. `inst` defaults to `null`. Track ids must be
  unique (`duplicate track` otherwise).
- Every following non-blank line until the next `track` line or end of file is that track's notes.

Tokens: split track text on whitespace, except that a chord `[ ... ]` plus the characters right after
`]` up to the next whitespace is one token (chords contain spaces).

Bars
- `|` separates bars and must stand alone as a token. Text between two `|`s is one bar; empty segments
  (from leading, trailing, or doubled `|`, including across lines) are ignored. A bar may span lines.
- With a pickup, the first bar is bar 0 and must be exactly the pickup length. Without one, the first
  bar is bar 1. Every bar must add up to exactly its time signature's ticks.

Durations: `/N`, N one of 1, 2, 4, 8, 16, 32, 64; base ticks = `3840 / N`. Optional suffix:
`.` = ×1.5, `..` = ×1.75, `t` (triplet) = ×2/3. So `/4` = 960, `/8` = 480, `/4.` = 1440,
`/4..` = 1680, `/8t` = 320, `/1` = 3840. Any other duration is an error that quotes the token.

Note tokens
- Single note: `PITCH[DUR]['][:VEL][~]`, in that order. Examples: `C4/4`, `F#5/8'`, `G5/2:120`,
  `F5/2~`, `E5`.
- Chord: `[P P ...][DUR]['][:VEL][~]`, e.g. `[C4 E4 G4]/2.`. Pitches inside are separated by spaces.
  Store pitches sorted ascending, duplicates removed.
- Rest: `r[DUR]` (no `'`, `:` or `~`).
- PITCH is a note name for pitched roles (`parsePitch`), or a key of `DRUMS` for the `drums` role
  (stored as its GM number). A drum name in a pitched track or a note name in a drums track is an
  error containing the word `drum`.
- `'` = staccato (`staccato: true`).
- `:VEL` = velocity for this note only, an integer 1..127 (error containing `velocity` otherwise).
- `~` = tie: the next note-or-chord token in the same track (it may be in the next bar; no rest in
  between) must have exactly the same pitches; the two merge into one `Note` with the summed ticks and
  the first note's velocity and staccato flag. A tie with no following note, or to a rest or different
  pitches, is an error containing `tie`. Chains (`C4/4~ C4/4~ C4/4`) merge into one note.
- Pitches outside the role's `ROLE_RANGES` are an error containing `out of range`.
- An unrecognised token is an error that quotes the token.

Sticky values (per track, starting fresh in each track)
- A note, chord, or rest without a duration uses the last duration written in that track; the track
  starts with `/4`.
- `v=NN` (integer 1..127) is its own token; it occupies no time and sets the velocity of following
  notes in that track. The track starts at 100. `:VEL` overrides it for one note.

Whole-bar shortcuts (each must be the only content of its bar)
- `R` = a rest filling the bar. `R*n` (n ≥ 1) = n such bars, each sized to its own time signature.
- `%` = repeat the previous bar of this track exactly (after expansion). `%` as the first bar is an
  error containing `%`.
- Group: `{` starts a bar and `}*n` (n 1..64) ends one; everything between (one or more bars, with
  `|` inside) is repeated n times. Groups may not nest (error containing `nested`).

Song-level checks
- At least one track. Every track must have the same number of bars (error containing `bar count`
  that names each track and its count).
- The song's bars (`Song.bars`) are built from the header, directives, and that bar count. `startTick`
  is cumulative; `totalTicks` is the end of the last bar.

Errors
- Collect all errors and keep going where possible (do not stop at the first bad bar). Return
  `{ ok: false, errors }` if there are any.
- Every error string starts with `line <n>: `, n being the 1-based source line it came from (for a
  missing header key use `line 1`; for a track-level error use the track's header line; for a bar
  error use the line where the bar's first token is).
- A bar-length error reads `line <n>: track <id> bar <number> is <got> ticks, expected <want>`.

### 5. `src/timing.ts`

```ts
export interface ScheduledNote {
  track: number;            // index into song.tracks
  pitches: number[]; velocity: number;
  start: number;            // seconds
  duration: number;         // seconds; staccato notes get half their written length
}
export interface Timeline { song: Song; duration: number; notes: ScheduledNote[]; }

export function tickToSeconds(song: Song, tick: number): number;
export function secondsToTick(song: Song, seconds: number): number;
export function barAt(song: Song, tick: number): BarInfo;
export function buildTimeline(song: Song): Timeline;
export function notesBetween(timeline: Timeline, from: number, to: number): ScheduledNote[];
```

- Each bar's tempo is constant, so seconds per tick in a bar = `60 / (bar.tempo * 960)`.
- `tickToSeconds` sums whole bars, then the part of the current bar. Ticks past `totalTicks` continue
  at the last bar's tempo; negative ticks clamp to 0.
- `secondsToTick` is the inverse, clamped to `[0, totalTicks]`.
- `barAt` returns the bar containing the tick (the last bar for `tick >= totalTicks`).
- `buildTimeline` computes every note's start and duration once
  (`duration = tickToSeconds(end) - tickToSeconds(start)`, halved for staccato), sorted by start, then
  track index. `duration` of the timeline = `tickToSeconds(song, song.totalTicks)`.
- `notesBetween` returns the notes with `from <= start < to`, in timeline order, found by binary
  search (not a full scan).

### 6. `tests/fixtures/features.song`, exactly (verbatim, do not edit)

```
# Format fixture for the tests. Uses every feature at least once.
title: Fixture
composer: original
year: 2026
source: original
style: synthwave
key: C major
tempo: 120
time: 4/4
pickup: /4

@bars 2-4 tempo=100..140
@bar 4 time=3/4

track mel role=lead inst=saw-lead vol=0.7 pan=-0.25
| G4/4
| C5/4 E5 G5 C6 | [C4 E4 G4]/2. r/4 | v=70 D5/8 D5 E5/4' F5/2~
| F5/4 G5/2:120 |

track bass role=bass
| r/4 | C2/1 | R | r/2 G2/2~ | G2/4 r/2 |

track beat role=drums
| h/4 | { [k h]/8 h [s h] h [k h] h [s h] h }*2 | % | k/4 s/4 [k cr]/4 |
```

Load it in tests with `import fixture from './fixtures/features.song?raw';`.

### 7. Tests

`tests/pitch.test.ts`
- `parsePitch`: `C4`→60, `A4`→69, `Bb3`→58, `F#5`→78, `Cb4`→59, `B#3`→60, `C0`→12, `B8`→119;
  `H4`, `C9`, `c4`, `C#`, `` → null.
- `midiToFreq(69)` = 440, `midiToFreq(81)` = 880, `midiToFreq(57)` = 220.
- `midiName`: 60→`C4`, 61→`C#4`, 70→`A#4`.

`tests/song.test.ts`, the fixture (`parseSong(fixture)` is ok):
- meta: title `Fixture`, style `synthwave`, source `original`, tempo 120, time `[4, 4]`,
  pickupTicks 960.
- `bars` equals exactly:
  `[{number:0,startTick:0,ticks:960,time:[4,4],tempo:120}, {number:1,startTick:960,ticks:3840,time:[4,4],tempo:120}, {number:2,startTick:4800,ticks:3840,time:[4,4],tempo:100}, {number:3,startTick:8640,ticks:3840,time:[4,4],tempo:120}, {number:4,startTick:12480,ticks:2880,time:[3,4],tempo:140}]`;
  `totalTicks` 15360.
- track `mel`: role `lead`, inst `saw-lead`, vol 0.7, pan -0.25, 11 notes. `notes[0]` =
  `{tick:0,ticks:960,pitches:[67],velocity:100,staccato:false}`; `notes[4]` pitches `[84]` tick 3840;
  `notes[5]` = `{tick:4800,ticks:2880,pitches:[60,64,67],velocity:100,staccato:false}`; `notes[6]` =
  `{tick:8640,ticks:480,pitches:[74],velocity:70,staccato:false}`; `notes[8]` =
  `{tick:9600,ticks:960,pitches:[76],velocity:70,staccato:true}`; `notes[9]` (tied F5) =
  `{tick:10560,ticks:2880,pitches:[77],velocity:70,staccato:false}`; `notes[10]` =
  `{tick:13440,ticks:1920,pitches:[79],velocity:120,staccato:false}`.
- track `bass`: inst null, vol 0.8, pan 0, notes exactly
  `[{tick:960,ticks:3840,pitches:[36],velocity:100,staccato:false}, {tick:10560,ticks:2880,pitches:[43],velocity:100,staccato:false}]`.
- track `beat`: 28 notes; `notes[0]` tick 0 pitches `[42]`; `notes[1]` tick 960 pitches `[36,42]`
  ticks 480; `notes[17]` tick 8640 pitches `[36,42]` (from `%`); last note tick 14400 ticks 960
  pitches `[36,49]`.

`tests/song.test.ts`, small inline songs. Use this header (8 lines, so a track header is line 9 and
its first bar line is line 10):

```
title: T
composer: original
year: 2026
source: original
style: chiptune
key: C major
tempo: 120
time: 4/4
```

Each case below gives the track text after the header; assert `ok` is false and some error contains
the quoted text (or `ok` is true where stated):
1. `track a role=lead\n| C4/4 C4 C4 C4 C4 |` → `line 10: track a bar 1 is 4800 ticks, expected 3840`.
2. `track a role=lead\n| C4/2 | C4/1 C4/4 |` → at least 2 errors.
3. `track b role=bass\n| C6/1 |` → `out of range`.
4. `track a role=lead\n| C4/1 | C4/1 |\ntrack b role=bass\n| C2/1 |` → `bar count`.
5. `track a role=kazoo\n| C4/1 |` → `unknown role`.
6. `track a role=lead\n| k/1 |` → `drum`; `track a role=drums\n| C4/1 |` → `drum`.
7. `track a role=lead\n| C4/2~ D4/2 |` → `tie`; `track a role=lead\n| C4/1~ |` → `tie`;
   `track a role=lead\n| C4/2~ r/2 |` → `tie`.
8. Header without its `title:` line → `missing title`.
9. Header with `style: polka` → `unknown style`.
10. `track a role=lead\n| C4/4 X9 C4 C4 C4 |` → `X9`.
11. `track a role=lead\n| C4/3 C4/2 |` → `C4/3`.
12. Header plus `pickup: /4`, track `track a role=lead\n| C4/2 | C4/1 |` → `track a bar 0`.
13. `track a role=lead\n| % |` → `%`.
14. `track a role=lead\n| { { C4/1 }*2 }*2 |` → `nested`.
15. Header plus `@bar 9 tempo=90`, track `track a role=lead\n| C4/1 |` → `bar 9`.
16. `track a role=lead\n| C4/1 |\ntrack a role=bass\n| C2/1 |` → `duplicate track`.
17. `track a role=lead vol=1.5\n| C4/1 |` → `vol`; `track a role=lead pan=-2\n| C4/1 |` → `pan`.
18. `track a role=lead\n| C4/1:0 |` → `velocity`; `| C4/1:128 |` → `velocity`.
19. Every error string from cases 1–18 matches `/^line \d+: /`.
20. OK: `track a role=lead\n| C4/8t C4 C4 C4/8t C4 C4 C4/2 |\n| C4/4.. C4/16 C4/2 |` with
    `track b role=bass\n| R*2 |` → ok; track a's first note ticks 320, the note at index 7 has ticks
    1680; track b has no notes and `song.bars.length` is 2.
21. OK: `track a role=lead\n| C4/1 | # comment\n| [E4 C4 E4]/1 |` with CRLF line endings → ok, second
    note pitches `[60, 64]`.
22. OK: `track a role=lead\n| C4/4~ C4/4~ C4/2 |` → ok, one note with ticks 3840.

`tests/timing.test.ts` (fixture timeline; compare floats with `toBeCloseTo(x, 6)`):
- `tickToSeconds`: 0→0, 960→0.5, 4800→2.5, 8640→4.9, 12480→6.9, 15360→8.185714.
- `secondsToTick`: 0.25→480, 4.9→8640, 100→15360, -1→0.
- `barAt(song, 9000).number` = 3; `barAt(song, 99999).number` = 4.
- `buildTimeline(song).duration` → 8.185714; `notes.length` = 41 (11 + 2 + 28).
- `notesBetween(tl, 0, 0.5)`: 2 notes, tracks `[0, 2]`, both start 0, track 0's duration 0.5.
- `notesBetween(tl, 5.39, 5.41)` contains a track-0 note with start 5.4 and duration 0.25
  (staccato E5).
- The tied F5 (track 0, start 5.9) has duration 1.428571.
- `notesBetween(tl, 8.2, 9)` is empty.

### 8. `docs/song-format.md`

A plain-language guide to writing a song file, for someone who reads music a little. Sections:
the header, time and tempo changes, tracks and roles (with the range table and the drum-name table),
notes and durations, chords, rests, ties, staccato and velocity, shortcuts (`R`, `R*n`, `%`, groups),
sticky values, what the checker rejects, and how timing works (960 ticks per quarter note, tempo in
quarter notes per minute even in 9/8). Show the fixture file as a full example. Describe only what the
parser does. Short sentences; tables where they help.

## Acceptance

- `node -e "const p=require('./package-lock.json');process.exit(p.name==='drumline-radio'&&p.packages[''].name==='drumline-radio'?0:1)"` exits 0.
- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0 and reports 3 passed test files.
- `git diff --exit-code -- BRIEF.md` exits 0.
- `git check-ignore -q node_modules` exits 0.

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0, and `dist/index.html` contains `/drumline-radio/assets/`.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md` (and `.npm-cache/` if the
  fallback in **If blocked** is used).
- No runtime dependencies; do not add or change devDependencies.
- `src/roles.ts`, `src/pitch.ts`, `src/song.ts`, `src/timing.ts` must not reference `window`,
  `document`, `AudioContext`, or `localStorage`.
- Copy `tests/fixtures/features.song` exactly as written; do not edit it to make tests pass.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Audio, instruments, styles' sounds, the player UI, fonts, CSS, the visualizer, real songs.
- Editing `BRIEF.md`.

## If blocked

- If step 1.5 (copying `node_modules`) fails, run `npm ci --cache .npm-cache` instead. If that also
  fails, stop and report the exact error.
- If a fixture expectation in the tests disagrees with your parser, re-read the format rules; if you
  still believe the expectation is wrong, leave that test failing and explain it in the report rather
  than changing the fixture or the expectation.
