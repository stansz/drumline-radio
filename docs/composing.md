# Composing a song

How to write a song that sounds good in this app, and what to check before committing it. For the
notation itself, see [song-format.md](song-format.md); for the instruments, see [sound.md](sound.md).
This file holds the lessons from earlier songs, so a new song doesn't repeat their mistakes.

## Before writing

- **Listen to (read) the songs in the same style first,** and make the new one different on paper:
  key, tempo, form, and drum feel. Print the originals' basics with:

  ```bash
  grep -l "^category: originals" src/songs/*.song | xargs grep -E "^(style|key|tempo):"
  ```

  Shortwave first came out with Third Rail's key, tempo, 64-bar form, boom-bap drums and nearly the
  same hook chords, and had to be reworked. Two songs in one style should not be twins.
- **Pick a form that fits the idea,** not a default verse/hook/verse/hook. A song can be a loop
  (Last Stop), a club track with drops (Night Shift), or a classical form (Lantern Ward). Hand-write
  it, or use the arranger and `arrangeForm()`; see [tools/README.md](../tools/README.md).
- **The user's taste so far:** simpler and grittier over jazzy in Lo-fi; character over realism;
  bass parts that still hit hard when the song is remixed into Techno.

## Writing the parts

- **Write the chord progression once,** as a comment at the top of the song or as a constant in its
  script, and make every pitched part follow it bar by bar. Lantern Ward's harp and bells first
  repeated a 2-bar `{ Dm | Bb }*4` loop over an 8-bar progression, so they played Bb major against
  the strings' A major at every cadence. A repeat that is shorter than the progression is the usual
  cause of wrong notes.
- **Repeated sections are copies.** In a hand-written song, a change to the hook has to be made in
  every copy of it. When a song has many repeats and will keep changing, write it as a script in
  `tools/arranger/` (like `last-stop.mjs`) and add it to `tests/drift.test.ts`.
- **Give each part its own register and rhythm.** Lead on top, chords in the middle, bass at the
  bottom; a counter-line answers the lead in its gaps instead of doubling it.
- **Use micro-timing for feel, sparingly** (see [song-format.md](song-format.md#micro-timing)).
  What has worked: snare or rim dragged +10 to +30 ticks, off-beat hats -6 to -8, a lead or guitar
  +10 to +20 behind the beat, chord stabs +25. Some songs stay on the grid on purpose (Night Shift,
  Save Point).

## Picking instruments

Each style maps every role to a patch ([sound.md](sound.md) has the tables). Choose the lead's
patch on purpose rather than taking the default. Every patch lives once in the instrument bank,
`src/audio/instruments.ts`, grouped into leads, keys, pads, basses, and kits, and a track can pick
one in two ways:

- **`inst=<name>`** picks the current style's instrument of that name. When the song is remixed
  into a style without it, the track falls back to that style's patch for its role. Prefer this:
  each style keeps its own sound.
- **`inst=bank:<id>`** picks a bank instrument in every style, so the part sounds the same in every
  remix. Use it only when that sound is the point of the part, for example a signature lead. If
  every song reaches for the same favourite this way, the styles start to sound alike.

A new instrument goes into the bank under a new unique id (see
[sound.md](sound.md#adding-a-patch-or-a-style)). Measure it with `timbre.mjs` (below) before a song
depends on it.

- **The flute problem.** A held, smooth tone with few harmonics and slow wobble, in a lead's
  register (about G4 to E5), sounds like a flute whatever it was meant to be. Lo-fi is prone to it:
  its patches are dark and its master chain cuts the highs. The user has flagged `soft-lead` and a
  first version of `radio-lead` for this. Fixes that work: a plucked envelope (a hard attack that
  decays), real buzz from drive or a pulse wave, no vibrato, or a lower octave (Last Stop's upright
  bass).
- **Measure a lead before using it.** With `npm run dev` running:

  ```bash
  node tools/browser/timbre.mjs lofi soft-flute,radio-lead,dusty-sample
  ```

  It prints how many harmonics sit within 30 dB of the loudest. One to three, with a centroid near
  the fundamental, is a near-sine (`soft-flute` 1, `soft-lead` 3); a lead that cuts through has
  eight or more (`saw-lead` 8, `radio-lead` 17).
- **Lo-fi notes:** `round-bass` reads as rounded and jazzy, so it suits a walking line more than a
  boom-bap one. `tine-keys` plays both lead2 and chords, so a tine-keys lead blurs into the chords.
  The extras are `dusty-sample` (a chopped-record lead), `upright-bass` (sounds an octave below the
  written note) and `radio-lead` (a buzzy plucked lead).
- **Low notes:** an oscillator below 30 Hz is skipped, so a patch's sub-octave layer drops out under
  very low notes. Check a low bass line in every style it might be remixed into, Techno above all.

## Before committing

1. `npm test` passes. A new song changes the counts and orders in `tests/library.test.ts`; update
   them, but never change notes just to make a test pass.
2. `CHECK_DETAIL=1 npm run check:songs` lists every half-step clash between a lead and the pad or
   bass. Fix each one, or say in the commit why it stays (a short passing note or a deliberate
   suspension is fine). A song with ten clashes is not ready.
3. Check the balance with `tools/browser/tracks.mjs` (see [tools/README.md](../tools/README.md)) at
   a busy point and a quiet one. The lead should be on top: in Shortwave's hook it sits at −30 dB
   with the keys at −36 and the drums at −33. Nothing should be buried 15 dB under the rest.
4. Add the song to the originals list in `README.md`.
5. The user listens and decides; a passing check is not the same as sounding good.

## Credits

- `composer:` names who wrote it, the user last. Credit yourself by your own model name, not by a
  name copied from another song: `Kimi & SZ` for a song Kimi wrote, or `GLM, Claude & SZ` when GLM
  wrote the first version and Claude reworked it. Most songs here say Claude because Claude wrote
  them; that is not a template.
- Public-domain pieces keep the real composer and add an arranger line in the same form, such as
  `arranger: Claude & SZ`.
- Start the file with a comment that says what the song is, who wrote it (the same names as
  `composer:`), and how it is built, and give it an `about:` line for the song card.
