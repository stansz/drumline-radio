# Micro-timing plan

Per-note pocket. Decided 2026-11-05: Option A (±240 ticks), no scheduler change. Handed to dsh to
build; this file records the design.

## Problem

Every note starts exactly on its tick. A song can swing (the grid is written with triplets) but it
cannot sit behind the beat, push the hats, or drag a snare by a few milliseconds. That is the
difference between a groove that is *correct* and one that is *played*.

## Syntax

A tick offset on a note, written after the duration (and staccato mark) and before the velocity:

```
k/8+18          kick 18 ticks late
s/8-10          snare 10 ticks early
[C4 E4 G4]/2+24:88
C4/8'-6:70~
```

```
pitch  /duration  ['staccato]  [+/-offset]  [:velocity]  [~ tie | ^ bend]
```

One tick is 1/960 of a quarter note. At 88 BPM that is about 0.71 ms, so `+18` is roughly 13 ms.
Positive is later, negative is earlier. With no offset a token parses exactly as it does today.

## Limit

±240 ticks (a sixteenth), checked at parse time:

```
line 12: offset 300 is outside -240..240 in 'C4/8+300'
```

That covers every played feel (laid-back snare, pushed hats, a leaning kick) and is too small to
disguise a rhythm that is simply wrong. Deliberate displacement (flams, chops answering the grid)
should be written as rhythm. The limit is one constant if a wider range is ever needed.

## Semantics

- The offset moves the note's **start** only. Its end stays at the written end, so the sounding
  length is the written length minus the offset.
- Staccato halves that sounding length.
- The sounding length never drops below 10 ms, so a short note with a large positive offset still
  sounds.
- It applies to the whole chord when written on a chord token.
- **Ties and bends:** the first token of the chain owns the offset. An offset on a continuation
  token (`C4/4~ C4/4+10`) is an error.
- **Bend times** stay at their written positions in time; they are measured from the shifted start,
  and a bend that would land before the shifted start is clamped to it.
- Rests cannot carry one (their suffix grammar already rejects it).
- `%` and `{ ... }*n` repeat offsets, because they repeat the bar's tokens.
- A negative offset that would begin before tick 0 clamps to 0.
- Offsets never change a song's written length or bar count, and the bar-length check still uses
  written durations.

## Scheduling

No engine change. `buildTimeline` bakes the offset into each note's `start`, the timeline is sorted
by `start`, and `notesBetween` selects by `start`. An early note is therefore picked up by the
scheduler window before its grid position, inside the existing 120 ms lookahead.

Known edge: seeking exactly to a grid time skips a note that was pushed earlier than that time,
because it now starts before the seek point. That is expected, not a bug.

## Display and checks

- The score view draws from the timeline, so a shifted note is drawn (and lit) where it sounds. At
  ±240 ticks that is a few pixels at most.
- `check:songs` clash timing uses the timeline, so a shifted melody note is checked where it
  actually sounds.

## What changes

| File | Change |
| --- | --- |
| `src/music/song.ts` | `Note.offset?` (ticks, set only when non-zero); parse `+N`/`-N`; range and continuation rules |
| `src/music/timing.ts` | start from `tick + offset` clamped at 0; length rule; bends measured from the shifted start |
| `docs/song-format.md` | the syntax, the rules, the limit |
| `tests/song.test.ts` | parse, chord, drum, tie, continuation error, out of range, boundary values |
| `tests/timing.test.ts` | start shift, length, staccato, minimum length, clamp at 0, bends, `notesBetween` picks up an early note |

## What must not change

- Existing songs: with no offset nothing is added to a note, and every scheduled time is identical.
  `drift.test.ts` and all existing tests must pass unchanged.
- `check:songs` output.
- `tools/browser/late.mjs`: `late` stays 0 and `min` stays positive.

## Later, on top of offsets

- A `@swing 62` directive that displaces every other sixteenth. It applies one ratio to every
  instrument, so it complements per-note offsets rather than replacing them.
- `@humanize` jitter is rejected: random timing is not groove, and it breaks the drift test's
  reproducibility.
