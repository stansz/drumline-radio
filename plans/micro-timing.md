# Micro-timing plan (not built yet)

An idea for per-note pocket, not implemented. Written before touching the parser.

## Problem

Every note starts exactly on its tick. A song can swing (the grid is written with triplets) but it
cannot sit behind the beat, push the hats, or drag a snare by a few milliseconds. That is the
difference between a groove that is *correct* and one that is *played*. Right now the format has no
way to express it, so the engine is always perfectly quantised.

## Idea

A tick offset on a note, written after the duration and before the velocity:

```
k/8+18          kick 18 ticks late
s/8-10          snare 10 ticks early
[C4 E4 G4]/2+24:88
```

One tick is 1/960 of a quarter note. At 88 BPM that is about 0.71 ms, so `+18` is roughly 13 ms —
enough to hear, not enough to sound like a mistake. Positive is later, negative is earlier.

### Where it sits in the token grammar

```
pitch  /duration  ['staccato]  [+/-offset]  [:velocity]  [~ tie | ^ bend]
```

Backwards compatible: with no offset the token parses exactly as it does today.

## Semantics

- The offset moves the note's **start** only. Its written length and its end are unchanged.
- It applies to the whole chord when written on a chord token.
- **Ties and bends:** the offset comes from the first token in the chain; the merged note keeps it.
  An offset on a continuation token (`C4/4~ C4/4+10`) is an error, so the intent stays unambiguous.
- Rests cannot carry one (their suffix grammar already rejects it).
- `%` and `{ ... }*n` repeat offsets, because they repeat the bar.
- A negative offset that would begin before tick 0 clamps to 0.
- Offsets never change a song's written length or bar count.
- The score view keeps drawing notes on the grid in this version. Offsets are a performance detail,
  not a notation one; drawing them would make the score look broken at small sizes.
- `check:songs` clash timing uses the timeline, so a shifted melody note is checked where it
  actually sounds. That is the correct behaviour.

## The lookahead problem

`engine.ts` schedules 120 ms ahead (`LOOKAHEAD`) and ticks every 25 ms. A note that starts *early*
must be booked earlier than its grid position, or it will be booked late, lose its attack, and
click. At 88 BPM, a −240 tick offset is −170 ms, which is beyond the current lookahead.

Design: when a song loads, compute the largest negative offset in its timeline and extend the
scheduler's lookahead by that much (rounded up to the 25 ms tick). One line when the song is set,
no per-note work, and it costs nothing for songs with no negative offsets.

## Limits

Cap at **±240 ticks**, one sixteenth. Beyond that it is no longer micro-timing but a different
rhythm, and the error should say so:

```
line 12: offset 300 is outside -240..240 in 'C4/8+300'
```

Rejected at parse time, so no invalid offset can reach the timeline.

## What changes

| File | Change |
| --- | --- |
| `src/music/song.ts` | `Note.offset` (ticks, default 0); parse `+N`/`-N`; range and tie rules |
| `src/music/timing.ts` | `start = tickToSeconds(song, tick + offset)`, clamped at 0 |
| `src/audio/engine.ts` | extend the lookahead by the song's largest negative offset |
| `docs/song-format.md` | the syntax, the rules, the limit |
| `docs/sound.md` | the scheduling paragraph: the lookahead is 120 ms, extended by a song's largest early offset |
| `tests/song.test.ts` | parse, chord, tie, rest, out-of-range, boundary values |
| `tests/timing.test.ts` | the start shifts by exactly `offset * secondsPerTick` |

## What must not change

- **Existing songs.** With no offset the value is 0 and every scheduled time is identical.
  `drift.test.ts` must still report the generated `.song` files byte-identical.
- **Audio.** Record 12 s of Third Rail before and after the change, decode both to WAV, and compare
  the PCM hashes. They must match exactly. If they do not, the change is wrong regardless of tests.
- **`check:songs`** output for songs that use no offsets.
- **The bundle** grows by a few hundred bytes; the service-worker cache version changes, as it does
  for any build.

## Verification order

1. `npm test` and `npm run typecheck`.
2. `npm run check:songs` — same counts and clash totals as before.
3. Before/after audio hash of an unmodified song.
4. A draft song that uses `+18` on the snare and `-8` on the hats, run through
   `tools/browser/late.mjs`; `late` must stay 0 and `min` must stay positive.
5. Listen.

## Open question for Sz

Cap at ±240 ticks (a sixteenth), or allow up to ±half a bar so it can also do deliberate flams and
displaced chops? Recommendation: start at a sixteenth. It already covers every played feel; a wider
range invites using it as a rhythm feature, which the format should express honestly instead.

## Other options considered

1. **Per-note offsets (this plan).** Recommended: it is the primitive, and everything else can be
   layered on it.
2. **A `@swing 62` directive** that auto-displaces every other sixteenth. Simpler to write, but it
   applies one ratio to every instrument — it cannot put the snare behind the kick while the hats
   push. Worth adding later *on top of* offsets, not instead of them.
3. **A `@humanize N` jitter.** Rejected: random timing is not groove, and it makes a song
   unreproducible, which breaks the drift test's contract.
