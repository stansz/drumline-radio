## Goal

A chord-map check: a song can declare its chord progression in a comment, and `npm run check:songs`
reports long notes that start on a beat and aren't in that bar's chord. It is a report, like the
clash count, not a failure.

## Files to touch

- `src/music/chords.ts` (new)
- `tests/chords.test.ts` (new)
- `tools/check/songs.check.ts`
- `docs/composing.md`
- `tools/README.md`
- `AGENTS.md`

## Steps

1. Create `src/music/chords.ts`, free of the DOM and Web Audio, exporting:

   ```ts
   /** Pitch classes (0 = C … 11 = B) of a chord symbol, or null for no chord ("-" or "N.C.").
    *  Throws an Error naming the symbol if it can't be read. */
   export function chordTones(symbol: string): number[] | null

   export interface ChordMap {
     /** The chord symbol for a 1-based bar number, or null when the song declares no chord there. */
     chordAt(bar: number): string | null;
   }

   /** Reads the `# chords:` comment lines of a song's text. Returns null when there are none.
    *  Throws an Error naming the line for a bad line or symbol. */
   export function parseChordMap(text: string): ChordMap | null
   ```

   - Chord symbols: a root `[A-G]` with an optional `#` or `b`, then an optional quality, then an
     optional `/X` bass note (ignored except that X is a valid root). Qualities and their intervals
     in semitones from the root:
     - none: 0 4 7; `m`: 0 3 7; `dim`: 0 3 6; `aug`: 0 4 8; `sus2`: 0 2 7; `sus4` or `sus`: 0 5 7;
     - `7`: 0 4 7 10; `maj7`: 0 4 7 11; `m7`: 0 3 7 10; `m7b5`: 0 3 6 10; `dim7`: 0 3 6 9;
     - `6`: 0 4 7 9; `m6`: 0 3 7 9; `add9`: 0 2 4 7; `madd9`: 0 2 3 7; `9`: 0 2 4 7 10;
       `m9`: 0 2 3 7 10; `maj9`: 0 2 4 7 11.
     Return the pitch classes `(root + interval) % 12`, sorted ascending, without duplicates.
   - Chord-map lines: a line whose trimmed text starts with `# chords` is one of:
     - `# chords: <symbols>` — the symbols, separated by spaces, one per bar starting at bar 1;
     - `# chords @<N>: <symbols>` — the same, starting at bar N (N ≥ 1).
     Each line's symbols repeat in a cycle from its start bar until the next line's start bar (or the
     end of the song). Lines must be in increasing start-bar order; a `# chords:` line without `@`
     counts as `@1`. `|` tokens among the symbols are ignored, so `# chords: F#m | D | A | E` works.
     Bars before the first line's start have no chord (null).
   - Validate every symbol with `chordTones` while parsing.

2. Create `tests/chords.test.ts` (Vitest, importing only `../src/music/chords`):
   - `chordTones('C')` → `[0, 4, 7]`; `chordTones('F#m')` → `[1, 6, 9]`; `chordTones('Bb7')` →
     `[2, 5, 8, 10]`; `chordTones('Dm9')` → `[0, 2, 4, 5, 9]`; `chordTones('G/B')` → `[2, 7, 11]`;
     `chordTones('-')` and `chordTones('N.C.')` → `null`; `chordTones('H')` throws.
   - `parseChordMap('no chords here')` → `null`.
   - For text `"# chords: F#m D A E\n# chords @9: Bm | G\n"`: `chordAt(1)` is `F#m`, `chordAt(4)` is
     `E`, `chordAt(5)` is `F#m`, `chordAt(8)` is `E`, `chordAt(9)` is `Bm`, `chordAt(10)` is `G`,
     `chordAt(11)` is `Bm`.
   - For `"# chords @5: C\n"`: `chordAt(4)` is `null`, `chordAt(5)` is `C`.
   - `parseChordMap("# chords: C Xm\n")` throws; `parseChordMap("# chords @9: C\n# chords @5: D\n")`
     throws.

3. `tools/check/songs.check.ts`: after the clash count for a song, if `parseChordMap(text)` returns a
   map (catch a thrown error and report it as `CHORD MAP ERROR <message>` on the song's line, counting
   as a failure like a parse error):
   - For every track whose role is not `drums`, and every note in `song.tracks[i].notes`: find its bar
     (the last `song.bars` entry with `startTick <= note.tick`), its offset in the bar
     (`note.tick - bar.startTick`), and its length in seconds
     (`tickToSeconds(song, note.tick + note.ticks) - tickToSeconds(song, note.tick)`).
   - Count it as off-chord when: the bar has a chord (not null); the length is at least
     `MIN_SECONDS` (0.3 s); the offset is a multiple of the beat (`TICKS_PER_WHOLE / bar.time[1]`,
     using `TICKS_PER_WHOLE` from `src/music/song.ts`); and any of its pitches' pitch class is not in
     `chordTones(chord)`.
   - Append to the song's line ` · <n> off-chord` (or ` · 0 off-chord`) only for songs with a chord
     map, with a per-track breakdown in the same style as the clash breakdown when n > 0.
   - With `CHECK_DETAIL=1`, list each off-chord note:
     `  off-chord bar <N> (<chord>) <track> <note name> (<length>s) at <start seconds>s`.
   - Songs without `# chords` lines print exactly as before.
   - Update the usage comment at the top of the file.

4. `docs/composing.md`, the bullet that starts "**Write the chord progression once,**": add that a
   hand-written song should declare it as `# chords:` comment lines (one symbol per bar, cycling,
   `# chords @N:` to change from bar N, `-` for no chord), and that `npm run check:songs` then counts
   long on-beat notes outside the bar's chord ("off-chord"); like clashes, it is a report: a held 9th
   or a suspension is fine if the chord symbol says so (`Dm9`, `Asus4`) or the commit explains it.

5. `tools/README.md`, in the `npm run check:songs` section: one or two sentences describing the
   `# chords:` lines and the off-chord count, with the supported chord qualities listed briefly.

6. `AGENTS.md`: in the rule listing files free of the DOM and audio, add `src/music/chords.ts` is
   already covered by "everything in `src/music/`" — so instead add nothing there; in the rule that
   starts "`npm run check:songs` reports half-step clashes", add one sentence: songs with `# chords:`
   lines also get an off-chord count, which is a report too.

## Acceptance

- `npm run test:sandbox` exits 0, and its output shows `tests/chords.test.ts` passing.
- `git diff --stat` and `git status --porcelain` list only files from **Files to touch** (plus
  `.handoff/` files).
- `git grep -n "off-chord" -- tools/check/songs.check.ts` prints at least two lines.
- `git diff -- src/songs` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run check:songs` exits 0, and its output is unchanged for songs without `# chords` lines.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any song file, the parser (`src/music/song.ts`), or the clash check's results.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- Adding `# chords:` lines to songs, a "safe notes" helper, browser checks, the balance tool.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
