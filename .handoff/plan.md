## Goal

Re-voice the soft winds: add an optional breath-noise layer to synth patches, make `woodwind` a
flute with breath, make `soft-lead` (the Lo-fi lead) a formant muted trumpet, merge `soft-flute`
into `woodwind`, and make `tools/browser/levels.mjs` report where each patch's energy sits. Patch
gains are first guesses; they are level-matched later in a browser by the verifier.

## Files to touch

- `src/audio/patches.ts`
- `src/audio/voices.ts`
- `src/audio/instruments.ts`
- `src/audio/styles.ts`
- `tests/instruments.test.ts`
- `tests/styles.test.ts`
- `tools/browser/levels.mjs`
- `docs/sound.md`
- `docs/composing.md`
- `tools/README.md`

## Steps

1. `src/audio/patches.ts`: add to `SynthPatch`, after `formants`:

   ```ts
   /** Breath: band-passed noise mixed in with the oscillators and string, through the same
    *  formants, drive, filter, and envelope. A flute's air, a breathy pad. */
   breath?: {
     level: number; // mix level, 0 to 1, like Osc.level
     hz: number;    // centre of the noise band in Hz, fixed whatever note is played
     q: number;     // band sharpness: centre ÷ bandwidth; low is airy and wide
   };
   ```

2. `src/audio/voices.ts`, `playSynth`: after the plucked-string block and before the vibrato block,
   if `patch.breath` is set and `patch.breath.level > 0`:
   - `const spec = noiseSpec(kit, 'white');` set `(spec.node as AudioBufferSourceNode).loop = true`.
   - Create a `BiquadFilterNode` (`type = 'bandpass'`, `frequency.value = breath.hz`,
     `Q.value = breath.q`) and a `GainNode` (`gain.value = breath.level`).
   - Connect `source → band-pass → gain → oscTarget` (the same node the oscillators connect to).
   - Push the filter and gain into `collected.nodes` and `spec` into `collected.sources`.
   - Nothing else changes; a patch without `breath` builds the same graph as before.

3. `src/audio/instruments.ts`:
   - Replace `woodwind` (keep the id) with, and its comment with
     `// Orchestral counter-line: a flute. A near-sine with a soft octave and breath noise for the air.`:

     ```ts
     woodwind: synth({ name: 'Flute',
       oscs: [osc('sine', 0, 0, 0.8), osc('triangle', 0, 0, 0.15), osc('sine', 1, 0, 0.12)],
       breath: { level: 0.25, hz: 2500, q: 0.8 },
       env: env(0.06, 0.2, 0.85, 0.15), vibrato: { rate: 5, cents: 14, delay: 0.25 },
       gain: 0.3 }),
     ```

   - Replace `soft-lead` (keep the id) with, and its comment with
     `// Lo-fi lead: a muted trumpet. A saw and square through nasal formant bands, like a horn with a mute.`:

     ```ts
     'soft-lead': synth({ name: 'Muted trumpet',
       oscs: [osc('sawtooth', 0, 0, 0.7), osc('square', 0, 3, 0.3)],
       formants: [{ hz: 700, q: 2, gain: 0.35 }, { hz: 1500, q: 2.5, gain: 1 }, { hz: 3000, q: 3, gain: 0.45 }],
       env: env(0.03, 0.25, 0.8, 0.15), filter: { type: 'lowpass', hz: 3500, q: 0.5, envAmount: 1, envDecay: 0.2 },
       vibrato: { rate: 5, cents: 8, delay: 0.3 }, gain: 0.5, sends: { reverb: 1, delay: 0.8 } }),
     ```

   - Delete `soft-flute` and its comment line.

4. `src/audio/styles.ts`:
   - In the Lo-fi recipe's `instruments`, change `'soft-flute': 'soft-flute'` to
     `'soft-flute': 'woodwind'` (the role map keeps the local name `soft-flute`).
   - Add `'soft-flute': 'woodwind'` to `REPLACED`.

5. `tests/instruments.test.ts`: bank total 68 → 67. Add a test: `INSTRUMENTS.woodwind` is a synth
   patch with a `breath` whose `level` is above 0, and `INSTRUMENTS['soft-flute']` is undefined.
   `tests/styles.test.ts`: in the Studio test, add
   `expect(STYLE_DEFS.studio.patches['soft-flute']).toBe(INSTRUMENTS.woodwind);`.

6. `tools/browser/levels.mjs`: after measuring each patch's phrase, also measure where its energy
   sits. Render the same phrase buffer twice more through filters in new `OfflineAudioContext`s of
   the same length and rate (an `AudioBufferSourceNode` playing the rendered buffer): once through a
   `lowpass` at 300 Hz (Q 0.7), once through a `highpass` at 3000 Hz (Q 0.7). With `total`, `low`, and
   `high` the sums of squares over the same 2 s window, print after the peak:
   `  energy low/mid/high NN/NN/NN%` where low = low/total, high = high/total, mid = the rest
   (never below 0), each rounded to a whole percent. Update the header comment: a patch level-matched
   by RMS can still be buried if more of its energy sits under 300 Hz than the patch it replaces, so
   compare the energy split too.

7. `docs/sound.md`:
   - In `## Building a patch`, add a table row `| Flute, breathy parts | oscillators + breath |
     \`woodwind\` |` and a `### Breath` subsection after `### Formants`: what the field does (band-passed
     noise through the same formants, drive, filter, and envelope; fixed band; low `q` is airy; a
     flute is a near-sine plus a little breath around 2-3 kHz).
   - In `### Hearing and levelling a patch`, add: compare the energy split `levels.mjs` prints, not
     just RMS; the string pad and tape pad re-voices matched by RMS but moved energy under 300 Hz or
     into a darker band and were masked by the cellos, piano, or bass.
   - Where the Orchestral extras are described (`inst=oboe` "more cutting than the flute-like
     woodwind"), say "than the flute (woodwind)".
   - Add `soft-flute` → `woodwind` to the `## Removed patches` list.
   - In the Lo-fi section, if it describes the lead, say it is a muted trumpet.
8. `docs/composing.md`: the lines that mention `soft-flute` and `soft-lead` as near-sines describe
   the old patches. Rewrite them to say the Lo-fi lead is now a formant muted trumpet and the counter
   is the breathy flute (woodwind); keep the advice about timbre.mjs, using
   `node tools/browser/timbre.mjs lofi soft-lead,radio-lead,dusty-sample` as the example.
9. `tools/README.md`: in the levels entry, mention the energy split.

## Acceptance

- `npm run test:sandbox` exits 0, and its output shows `tests/instruments.test.ts` and
  `tests/styles.test.ts` passing.
- `git diff --stat` and `git status --porcelain` list only files from **Files to touch** (plus
  `.handoff/` files).
- `git grep -n "'soft-flute': synth" -- src/audio/instruments.ts` prints nothing.
- `git grep -n "breath" -- src/audio/voices.ts` prints at least two lines.
- `git diff -- src/songs` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run build` exits 0.
- `node tools/browser/levels.mjs woodwind:72,soft-lead:67` (with a dev server) prints an energy line.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any song, any other patch, or playback scheduling.
- Keep `src/audio/patches.ts` free of DOM and Web Audio.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- Level-matching or tuning the new patches, browser checks, drum kits, other patches.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
