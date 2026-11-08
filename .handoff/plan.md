## Goal

Extend the synth's two-operator FM (velocity-scaled index, an index floor, an attack swell, and a
choice of which oscillators it modulates), add nine new bank patches built with FM and with the
existing plucked string (Karplus-Strong), and document how to build patches so later sessions can
use these techniques. Existing patches must sound exactly as before.

## Files to touch

- `src/audio/patches.ts`
- `src/audio/curves.ts`
- `src/audio/voices.ts`
- `src/audio/engine.ts`
- `src/audio/instruments.ts`
- `tests/curves.test.ts`
- `tests/instruments.test.ts`
- `docs/sound.md`
- `AGENTS.md`

## Steps

1. `src/audio/patches.ts`:
   - Replace the `fm` field of `SynthPatch` with:

     ```ts
     /** Two-operator FM: a sine modulator at note frequency × ratio wobbles the oscillators' pitch. */
     fm?: {
       ratio: number;     // modulator frequency ÷ note frequency; whole numbers are harmonic, others bell-like
       index: number;     // peak modulation depth (× note frequency); higher is brighter
       decay: number;     // seconds for the index to fall from its peak toward its floor
       attack?: number;   // seconds for the index to rise from its floor to its peak (a brass swell); default 0
       sustain?: number;  // the index floor as a fraction of the peak; default 0.05
       velocity?: number; // 0 to 1: how much a soft note lowers the peak (0 = velocity has no effect); default 0
       targets?: number[]; // indexes into `oscs` that the modulator drives; default every oscillator
     };
     ```

   - Add a one-line `/** ... */` comment to every other field of `Osc`, `SynthPatch`, and its `env`,
     `filter`, `vibrato`, `drive`, `gain`, and `sends` saying what it does and its unit (seconds,
     Hz, cents, 0–1, octaves). Keep the existing `string` and `drive` comments. Change no types
     other than `fm`.

2. `src/audio/curves.ts`: add after `noteGain`:

   ```ts
   /** The FM index at its peak and at its floor for a note, from the patch's fm settings. */
   export function fmIndex(
     fm: { index: number; sustain?: number; velocity?: number },
     velocity: number,
   ): { peak: number; floor: number }
   ```

   `amount = clamp(fm.velocity ?? 0, 0, 1)`; `peak = fm.index * (1 - amount + amount * (velocity / 127))`;
   `floor = peak * (fm.sustain ?? 0.05)`.

3. `src/audio/voices.ts`, `playSynth`:
   - Add a last parameter `velocity = 127` after `bends`.
   - Keep a list `oscBySpec: (OscillatorNode | undefined)[]` with one entry per `patch.oscs` item
     (undefined when `audibleOsc` skipped it) next to the existing `oscillators` array.
   - In the `if (patch.fm)` block, compute `const { peak, floor } = fmIndex(patch.fm, velocity)`
     and `const attack = patch.fm.attack ?? 0`. Schedule `depth.gain`:
     - `attack > 0`: `setValueAtTime(freq * floor, time)`, `linearRampToValueAtTime(freq * peak, time + attack)`,
       `setTargetAtTime(freq * floor, time + attack, Math.max(0.001, patch.fm.decay / 3))`.
     - otherwise: `setValueAtTime(freq * peak, time)`,
       `setTargetAtTime(freq * floor, time, Math.max(0.001, patch.fm.decay / 3))`.
   - Connect `depth` to `osc.frequency` of each oscillator in `patch.fm.targets` (looked up in
     `oscBySpec`, skipping undefined and out-of-range indexes), or of every oscillator when
     `targets` is undefined. The modulator never drives the plucked string.
   - With `attack`, `sustain`, `velocity`, and `targets` all unset, the result must be identical to
     today's code (peak = index, floor = index × 0.05, every oscillator).

4. `src/audio/engine.ts`: in the `playSynth(...)` call, pass `note.velocity` as the new last
   argument. Change nothing else.

5. `src/audio/instruments.ts`: add these patches. Put a one-line `//` comment above each saying
   what it is for. Change no existing patch and no style.

   In `LEADS`:
   ```ts
   'fm-brass': synth({ name: 'FM brass', oscs: [osc('sine', 0, 0, 1)],
     fm: { ratio: 1, index: 3.5, attack: 0.07, decay: 0.5, sustain: 0.45, velocity: 0.7 },
     env: env(0.06, 0.4, 0.8, 0.2), filter: { type: 'lowpass', hz: 3000, q: 0.7, envAmount: 1, envDecay: 0.2 },
     vibrato: { rate: 5, cents: 8, delay: 0.35 }, gain: 0.26 }),
   ```

   In `KEYS`:
   ```ts
   'fm-rhodes': synth({ name: 'FM Rhodes', oscs: [osc('sine', 0, 0, 1), osc('sine', 0, 7, 0.35)],
     fm: { ratio: 1, index: 2.2, decay: 1.2, sustain: 0.15, velocity: 0.8, targets: [0] },
     env: env(0.003, 2.5, 0.12, 0.6), gain: 0.3, sends: { reverb: 0.8, delay: 0.4 } }),
   'fm-bells': synth({ name: 'FM bells', oscs: [osc('sine', 0, 0, 1)],
     fm: { ratio: 1.4, index: 4, decay: 2.5, sustain: 0.1, velocity: 0.5 },
     env: env(0.001, 3, 0, 2), gain: 0.22 }),
   'glockenspiel': synth({ name: 'Glockenspiel', oscs: [osc('sine', 1, 0, 1)],
     fm: { ratio: 3.5, index: 1.5, decay: 0.3, sustain: 0.02, velocity: 0.6 },
     env: env(0.001, 1.4, 0, 1), gain: 0.2 }),
   'concert-harp': synth({ name: 'Concert harp', oscs: [],
     string: { octave: 0, level: 1, decay: 3.5, brightness: 0.25, pick: 0.35 },
     env: env(0.002, 4, 0.5, 0.8), filter: { type: 'lowpass', hz: 3500, q: 0.5, envAmount: 1.2, envDecay: 0.3 },
     gain: 0.5, sends: { reverb: 1, delay: 0.3 } }),
   'pizzicato': synth({ name: 'Pizzicato strings', oscs: [],
     string: { octave: 0, level: 1, decay: 0.45, brightness: 0.3, pick: 0.22 },
     env: env(0.003, 0.4, 0, 0.15), filter: { type: 'lowpass', hz: 2500, q: 0.6, envAmount: 1.2, envDecay: 0.1 },
     gain: 0.5 }),
   'nylon-guitar': synth({ name: 'Nylon guitar', oscs: [],
     string: { octave: -1, level: 1, decay: 2.2, brightness: 0.2, pick: 0.3 },
     env: env(0.006, 1.5, 0.3, 0.4), filter: { type: 'lowpass', hz: 2200, q: 0.6, envAmount: 1.2, envDecay: 0.2 },
     gain: 0.6, sends: { reverb: 0.9, delay: 0.3 } }),
   ```

   In `BASSES`:
   ```ts
   'dx-bass': synth({ name: 'DX bass', oscs: [osc('sine', 0, 0, 1), osc('sine', -1, 0, 0.4)],
     fm: { ratio: 1, index: 5, decay: 0.15, sustain: 0.08, velocity: 0.8, targets: [0] },
     env: env(0.002, 0.5, 0.3, 0.1), gain: 0.4, sends: { reverb: 0.15, delay: 0 } }),
   'string-bass': synth({ name: 'String bass', oscs: [osc('sine', -1, 0, 0.35)],
     string: { octave: -1, level: 1, decay: 1.2, brightness: 0.15, pick: 0.22 },
     env: env(0.004, 1, 0.25, 0.15), filter: { type: 'lowpass', hz: 900, q: 0.8, envAmount: 2, envDecay: 0.08 },
     gain: 0.6, sends: { reverb: 0.4, delay: 0.1 } }),
   ```

6. `tests/curves.test.ts`: import `fmIndex` and add a `describe('fmIndex')` with:
   - `fmIndex({ index: 3 }, 64)` is `{ peak: 3, floor: 0.15 }` (toBeCloseTo, 6 digits).
   - `fmIndex({ index: 2, velocity: 1, sustain: 0.5 }, 127)` is `{ peak: 2, floor: 1 }`.
   - `fmIndex({ index: 2, velocity: 1 }, 0).peak` is 0.
   - `fmIndex({ index: 4, velocity: 0.5 }, 0).peak` is 2.
   - `fmIndex({ index: 4, velocity: 3 }, 0).peak` is 0 (velocity clamped to 1).

7. `tests/instruments.test.ts`: change the bank total from 61 to 70.

8. `docs/sound.md`: add a section `## Building a patch` before `## Saving a song`. It must cover,
   in short paragraphs and one table:
   - Start from the closest bank patch and change one thing at a time; every bank patch has a
     one-line comment saying what it is for, and every `SynthPatch` field is commented in
     `src/audio/patches.ts`.
   - A table, columns "Sound", "Technique", "Start from": leads, pads, and synth basses →
     oscillators + filter → `saw-lead`, `warm-pad`, `synth-bass`; electric piano, bells,
     glockenspiel → FM → `fm-rhodes`, `fm-bells`, `glockenspiel`; brass → FM with an index swell →
     `fm-brass`; slap/DX bass → FM → `dx-bass`; guitars, harp, pizzicato, upright bass → plucked
     string → `clean-guitar`, `nylon-guitar`, `concert-harp`, `pizzicato`, `string-bass`.
   - FM: what each `fm` field does (ratio: whole numbers harmonic, 1.4 or 3.5 bell-like; index:
     brightness; decay; sustain: the floor the tone settles to; velocity: soft notes mellower, the
     DX7 electric-piano trick; attack: a brass-style swell; targets: keep one oscillator unmodulated
     as a clean layer). The defaults keep older FM patches unchanged.
   - Plucked string: the `string` field (decay, brightness, pick position, octave, level), rendered
     once per pitch by `src/audio/strings.ts` and cached; it goes through the patch's drive,
     filter, and envelope, and can sit under oscillators (as `string-bass` does with a sine).
   - New bank patches get a one-line comment saying what they are for.
   Also in `## Patches and styles`, change "(oscillators, envelope, filter, vibrato, FM, drive, and
   send levels)" to "(oscillators, a plucked string, envelope, filter, vibrato, FM, drive, and send
   levels)".

9. `AGENTS.md`: change the line
   `- Sound, styles, or patches: [docs/sound.md](docs/sound.md)` to
   `- Sound, styles, or patches, including building a new patch with FM or a plucked string: [docs/sound.md](docs/sound.md)`.

## Acceptance

- `npm run test:sandbox` exits 0, and its output shows `tests/curves.test.ts` and
  `tests/instruments.test.ts` passing.
- `git diff --stat` and `git status --porcelain` list only files from **Files to touch** (plus
  ignored `.handoff/` files).
- `git grep -c -E "'(fm-brass|fm-rhodes|fm-bells|glockenspiel|concert-harp|pizzicato|nylon-guitar|dx-bass|string-bass)': synth" -- src/audio/instruments.ts`
  prints `src/audio/instruments.ts:9`.
- `git grep -n "## Building a patch" -- docs/sound.md` prints one line.
- `git diff -- src/audio/styles.ts` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any existing patch, style, song, or the playback scheduling; existing FM patches
  (`bells`, `fm-pluck`, `tine-keys`) must schedule exactly the same values as before.
- Keep `src/audio/curves.ts` and `src/audio/patches.ts` free of DOM and Web Audio.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- Formant filters, harmonic tables or AKWF waves, samples, operator feedback, more than two
  operators, wiring the new patches into styles or songs, browser checks.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
