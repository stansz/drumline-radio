# Song format

A song is one plain-text file. It has a header, optional tempo and time changes, and one or more
tracks of notes. `parseSong` in `src/music/song.ts` turns the file into a `Song`. Every problem it finds
becomes an error string that starts with `line <n>: `, and it keeps going so you see all of them at
once.

Lines may end in `\n` or `\r\n`. A `#` at the start of a line or after whitespace begins a comment
that runs to the end of the line. Blank lines are ignored.

## The header

The header is a list of `key: value` lines before the first `track` line. Both sides are trimmed.
Every key may appear once, and no other keys are allowed.

| Key        | Required | Rules                                            |
| ---------- | -------- | ------------------------------------------------ |
| `title`    | yes      | Any non-empty text.                              |
| `composer` | yes      | Any non-empty text. For originals the app shows model families without versions (`Gemini 3.8 Flash & SZ` shows as `Gemini & SZ`; see docs/composing.md). |
| `arranger` | no       | Any non-empty text. Shown after the composer as "arr. …". |
| `about`    | no       | One line of plain text: the song's story, shown on its song card. |
| `hidden`   | no       | `true` leaves the song out of the library; it is still parsed and checked. |
| `year`     | yes      | Any non-empty text, e.g. `1856` or `traditional`. |
| `source`   | yes      | `public-domain` or `original`.                   |
| `category` | yes      | `carols`, `classics`, or `originals`. Picks the preset group in the player. |
| `style`    | yes      | One of `synthwave`, `chiptune`, `orchestral`, `techno`, `lofi`, `cinematic`, `altrock`, `studio`. |
| `key`      | yes      | Any non-empty text, e.g. `C major`.              |
| `tempo`    | yes      | Number from 20 to 400, quarter notes per minute; decimals allowed. |
| `time`     | yes      | `N/D`, N an integer 1 to 32, D one of 1, 2, 4, 8, 16. |
| `pickup`   | no       | A duration such as `/4` or `/4.`.                |

A bar of `N/D` lasts `N * 3840 / D` ticks. The starting time signature is the one in the header.

### Pickup

A pickup is a short first bar that leads into the song. Its length is the `pickup` duration. It must
be longer than 0 ticks and shorter than one bar of the starting time signature. The pickup bar is
bar 0; the bar after it is bar 1.

## Time and tempo changes

Header lines and directives may only appear before the first `track` line. Use directives to change
tempo or time signature partway through:

```
@bar 5 tempo=90
@bar 7 time=3/4
@bar 9 tempo=90 time=6/8
```

- `@bar N` changes the value from bar N onward. Both options may share one line.
- `@bars N-M tempo=A..B` ramps the tempo across bars N to M. Bar N gets A, bar M gets B, and the bars
  between are evenly spaced, so bar `N+i` gets `A + (B - A) * i / (M - N)`. Bars after M stay at B
  until another directive.
- N and M must be between 1 and the last bar of the song.
- Bars before the first directive use the header tempo and time. The pickup bar always uses the
  header values.

The tempo of a bar is constant for that whole bar.

## Tracks and roles

Each track starts with a `track` line:

```
track mel role=lead inst=saw-lead vol=0.7 pan=-0.25
```

- `id` follows `track` and matches `^[a-z0-9-]+$`. Track ids must be unique.
- `role` is required and is one of the roles below.
- `inst` is optional and matches `^(bank:)?[a-z0-9-]+$`; a plain name picks the current style's
  instrument of that name; when the song's home style has no instrument of that name, it plays the
  bank instrument of that name instead (so `inst=vox-lead` works in any song). `bank:<id>` picks a
  bank instrument in every style, except where a style swaps it for its own patch (see
  [sound.md](sound.md)). It defaults to none.
- `vol` is optional, from 0 to 1, default 0.8.
- `vol.<style>` is optional, from 0 to 4, for example `vol.altrock=0.2`: the track's volume when
  the song plays in that style, in place of `vol`. Use it when a remix makes a part too loud or too
  quiet; `npm run balance -- <song> <style>` suggests the number. Above 1 boosts a quiet part,
  such as an instrument swapped in with `inst.<style>`.
- `vol@N` is optional, from 0 to 1, for example `vol@9=0.5 vol@33=1`: the track's volume from bar N
  onward. It overrides `vol`/`vol.<style>` from that bar; before the first step the normal volume
  applies. Steps are applied at the bar line with a short smoothing so a held note does not click.
  N must be a bar in the song, and duplicate bars are errors. This is a clean track gain move, unlike
  `v=`, which is note velocity and can also change timbre.
- `inst.<style>` is optional, for example `inst.techno=analog-synth`: the track's instrument when
  the song plays in that style, in place of `inst`. A name the style doesn't have plays the bank
  instrument of that name.
- `pan` is optional, from -1 to 1, default 0.

Options may come in any order. Every non-blank line after the `track` line, until the next `track`
line or the end of the file, holds that track's notes.

### Roles and pitch ranges

Pitched roles may only use notes inside their range:

| Role      | Lowest | Highest |
| --------- | ------ | ------- |
| `lead`    | C3 (48)  | C7 (96)  |
| `lead2`   | C3 (48)  | C7 (96)  |
| `counter` | F2 (41)  | G6 (91)  |
| `pad`     | C2 (36)  | C6 (84)  |
| `chords`  | C2 (36)  | C6 (84)  |
| `bass`    | C1 (24)  | C4 (60)  |
| `arp`     | C2 (36)  | C7 (96)  |
| `drums`   | -        | -        |

### Drum names

A `drums` track writes drum names instead of note names. Each name is a General MIDI percussion
number:

| Name  | Drum              | MIDI |
| ----- | ----------------- | ---- |
| `k`   | bass drum         | 36   |
| `rim` | side stick        | 37   |
| `s`   | snare             | 38   |
| `cl`  | hand clap         | 39   |
| `tl`  | low floor tom     | 41   |
| `h`   | closed hi-hat     | 42   |
| `tm`  | low tom           | 45   |
| `oh`  | open hi-hat       | 46   |
| `cr`  | crash cymbal      | 49   |
| `th`  | high tom          | 50   |
| `rd`  | ride cymbal       | 51   |

A note name in a drums track, or a drum name in a pitched track, is an error.

## Notes and durations

A single note is a pitch, an optional duration, an optional staccato mark, an optional offset, an
optional velocity, and an optional tie or bend, in that order:

```
C4/4      F#5/8'      G5/2:120      F5/2~      E5
```

Durations are a slash and a number. A duration lasts this many ticks:

| Duration | Ticks | Duration | Ticks |
| -------- | ----- | -------- | ----- |
| `/1`     | 3840  | `/8`     | 480   |
| `/2`     | 1920  | `/16`    | 240   |
| `/4`     | 960   | `/32`    | 120   |
| `/64`    | 60    |          |       |

Three suffixes change the length: `.` multiplies by 1.5 (`/4.` = 1440), `..` by 1.75 (`/4..` =
1680), and `t` makes a triplet, multiplying by 2/3 (`/8t` = 320).

### Sticky duration and velocity

A note, chord, or rest with no duration uses the last duration written in that track. Every track
starts at `/4`.

A `v=NN` token sets the velocity (1 to 127) for the notes after it in that track and takes no time.
Every track starts at 100. A velocity written on a note with `:VEL` applies to that note only. The
default velocity is 100.

### Staccato

A `'` after the duration makes the note staccato. It plays for half its written length.

## Micro-timing

A `+N` or `-N` after the duration and staccato mark moves a note's start by N ticks. One tick is
1/960 of a quarter note and the range is -240 to 240 (a sixteenth). Positive is later, negative is
earlier, and a note with no offset keeps its written timing.

```
k/8+18      s/8-10      [C4 E4 G4]/2+24:88
```

An offset moves only the start; the note still ends at its written end, so a later start makes it
sound shorter and an earlier start makes it sound longer. Staccato halves the remaining length, and
a note never sounds for less than 10 ms. The offset applies to the whole chord when written on a
chord token.

The first token of a tie or bend chain owns the offset; an offset on a continuation token is an
error. Bend times stay at their written positions in time, measured from the shifted start, and a
bend that would land before the start is clamped to it. A note that would start before tick 0
starts at tick 0 instead.

Offsets never change bar lengths or the song's written length; those use written durations. `%` and
`{ ... }*n` repeat offsets along with the rest of their bars. The score draws a shifted note where
it sounds.

## Chords

Square brackets group pitches that start together, and the duration and other suffixes follow the
closing bracket:

```
[C4 E4 G4]/2.
[E4 C4 E4]/1
[k h]/8
```

Pitches inside are separated by spaces. The parser stores them ascending with duplicates removed. A
note token with several pitches is one note.

## Rests

`r` is a rest. It takes a duration like a note and has no staccato mark, offset, velocity, tie, or
bend: `r/4`, `r/2`.

## Ties

A `~` after a note or chord ties it to the next note or chord in the same track. The next token must
have exactly the same pitches. The two merge into one note that starts where the first one starts,
lasts the sum of both written lengths, and keeps the first note's velocity and staccato flag.

`C4/4~ C4/4~ C4/2` is one note of 3840 ticks. A tie may reach across a bar line. A tie with nothing
after it, or one followed by a rest or by different pitches, is an error.

## Bends

A `^` after a note bends it to the next note. That next token must be a single note, not a chord or a
rest. The two merge into one note that starts where the first one starts, lasts the sum of both
written lengths, and keeps the first note's velocity and staccato flag; the second note becomes a
bend to its pitch, which the voice glides to.

`G4/8^ A4/4` is a G that bends up to A. Bends chain: `G4/8^ A4/8^ G4/4` is one note that bends to A4
at 480 ticks and back to G4 at 960. A tie and a bend combine in either order and the pending note
keeps growing, so `G4/4~ G4/4^ A4/2` holds G and then bends to A. A bend may reach across a bar line.

Each bend glides over 0.1 seconds, or over half the time to the next bend point when that is closer.
Staccato does not change the bend times.

## Whole-bar shortcuts

These fill whole bars. Each must be the only content of its bar, between `|` marks: write
`| R*8 |`, not a bare `R*8` line. A new line does not start a new bar, so two bare shortcut lines run
together into one bar and fail with "a whole-bar shortcut must be the only thing in its bar".

- `R` is a rest that fills the bar.
- `R*n` is n such bars (`n` at least 1), each sized to its own time signature.
- `%` repeats the previous bar of this track exactly, after its shortcuts are expanded. `%` as the
  first bar is an error.
- `{` starts a group and `}*n` ends it. The bars between, separated by `|`, are repeated n times
  (`n` from 1 to 64). Groups may not nest. The count is of passes, not bars: `{ one bar }*4` is 4
  bars, and a 4-bar group `*4` is 16. If a track comes out short, the checker reports that the
  tracks have different numbers of bars.

```
| { [k h]/8 h [s h] h [k h] h [s h] h }*2 | % | k/4 s/4 [k cr]/4 |
```

## Bars

`|` separates bars and must stand alone as a token. A bar may span several lines, and a new line
never starts a new bar on its own. Empty segments —
from a leading, trailing, or doubled `|` — are ignored.

Every bar must add up to exactly its time signature's ticks, except the pickup bar, which must be
exactly the pickup length. When a bar is wrong the error reads
`line <n>: track <id> bar <number> is <got> ticks, expected <want> (<diff> short|over): ` followed by
every token in the bar with the ticks it got, for example `h/4 960, s/8' 480, s/8' 480, h 480`. A
token with no duration inherits the last one written, which is the usual cause.

Every track must have the same number of bars.

## What the checker rejects

- Headers with an unknown key, a repeated key, or a missing required key.
- An empty `arranger` or `about`, or a `hidden` value other than `true`.
- An unknown `source`, an unknown `category`, an unknown `style`, or a bad `tempo`, `time`, or `pickup`.
- A directive that names a bar past the end of the song, or a ramp whose end bar is not after its
  start bar.
- A track with an unknown role, an id that does not match `^[a-z0-9-]+$` or an instrument that does
  not match `^(bank:)?[a-z0-9-]+$`, a bad `vol`, `vol@N` step, or `pan`, or a duplicate id.
- A drum name in a pitched track, or a note name in a drums track.
- A pitch outside the role's range.
- A bad velocity, either in `:VEL` or in `v=`.
- An offset outside -240..240, a malformed offset, or an offset on a tie or bend continuation.
- A bad duration, an unrecognised token, a broken tie, or a misplaced whole-bar shortcut.
- A bend from or to a chord, a bend into a rest, a bend in a drums track, or a bend with no
  following note.
- A bar with the wrong number of ticks, tracks with different bar counts.
- A header or directive line after the first track, and a song with no tracks.

Errors report the line they came from: a bar error uses the line of the bar's first token, and a
track error uses the track's header line.

## How timing works

The format counts time in ticks: 960 ticks per quarter note and 3840 ticks per whole note.

Tempo is always quarter notes per minute, whatever the time signature is. In 9/8, a tempo of 120
means 120 quarter notes per minute; the eighth note is still half a quarter note for tick
arithmetic.

Each bar's tempo is constant, so seconds per tick in a bar is `60 / (tempo * 960)`.
`tickToSeconds` adds whole bars and then the part of the current bar. `secondsToTick` is its
inverse, clamped to the length of the song. `barAt` finds the bar holding a tick. `buildTimeline`
turns every note into a start and duration in seconds (staccato notes half their written length) and
`notesBetween` finds the notes that start in a time window.

## Full example

```
# Format fixture for the tests. Uses every feature at least once.
title: Fixture
composer: original
year: 2026
source: original
category: originals
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
