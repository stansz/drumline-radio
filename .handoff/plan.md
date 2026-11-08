## Goal

This is a rerun. The previous run already implemented most of this plan in the working tree;
keep that work, fix only what differs from this plan (the loop gain in step 2 and step 7b), and make
sure every touched file has LF line endings (`src/audio/voices.ts` currently has CRLF).


Add plucked-string (Karplus-Strong) synthesis to synth patches, so guitar instruments sound like
plucked strings instead of oscillators. Rebuild `indie-lead` on it and add two new guitar
instruments, `acoustic-guitar` and `crunch-guitar`, to the bank.

## Files to touch

- `src/audio/strings.ts` (new)
- `src/audio/patches.ts`
- `src/audio/voices.ts`
- `src/audio/instruments.ts`
- `src/audio/styles.ts`
- `tests/strings.test.ts` (new)
- `tests/instruments.test.ts`
- `tests/styles.test.ts`
- `docs/sound.md`
- `AGENTS.md`

## Steps

1. In `src/audio/patches.ts`, add to `SynthPatch` an optional field, documented with a `/** */`
   comment like `drive`:

   ```ts
   /** A plucked string (Karplus-Strong) voiced with the oscillators. */
   string?: {
     octave: number;      // like Osc.octave: -1 sounds an octave below the written note
     level: number;       // like Osc.level
     decay: number;       // seconds for the string to fall 60 dB
     brightness: number;  // 0 (mellow, plain averaging) to 1 (bright, metallic)
     pick: number;        // pick position, 0.05 (near the bridge, thin) to 0.5 (middle, round)
   };
   ```

   `oscs` stays required; a string-only patch passes `oscs: []`.

2. Create `src/audio/strings.ts`, free of the DOM and Web Audio (pure functions only, like
   `curves.ts`). Export:

   ```ts
   export interface StringSpec { decay: number; brightness: number; pick: number }
   export const STRING_SECONDS = 2.5;
   export function pluckSamples(sampleRate: number, freq: number, spec: StringSpec, seconds = STRING_SECONDS): Float32Array<ArrayBuffer>
   ```

   `pluckSamples` implements Karplus-Strong exactly like this:
   - `period = sampleRate / freq`.
   - Loop filter: `y = s * x[n] + (1 - s) * x[n - 1]` with `s = 0.5 + 0.45 * clamp(brightness, 0, 1)`.
     Its delay is `1 - s` samples.
   - Fractional tuning with a first-order all-pass: `delayTotal = period - (1 - s)`;
     `N = Math.floor(delayTotal - 0.5)` (at least 2); `frac = delayTotal - N` (between 0.5 and 1.5);
     all-pass coefficient `c = (1 - frac) / (1 + frac)`; all-pass
     `ap[n] = c * in[n] + in[n - 1] - c * ap[n - 1]`.
   - Loop gain `g = 10 ** (-3 / (decay * freq))`, with `decay` clamped to at least 0.05. Each
     sample passes through the loop once per period, so this gives −60 dB after `decay` seconds.
   - Excitation: `N` samples of noise from a fixed-seed LCG (copy `seededNoise` from
     `src/audio/voices.ts` into `strings.ts`, seed 11; never use `Math.random`), so output is
     deterministic. Apply the pick-position comb: `P = Math.max(1, Math.round(clamp(pick, 0.05, 0.5) * N))`;
     `e[i] = noise[i] - noise[i - P]` (treat `noise[i - P]` as 0 for `i < P`). Remove the mean, then
     scale so the peak absolute value is 1.
   - Run a circular delay line of length `N` initialised with the excitation. Each output sample is
     the value read from the delay line; the value written back is
     `g * allpass(loopFilter(read))`, keeping the filter and all-pass states across samples.
   - Output length `Math.ceil(seconds * sampleRate)`. Finally scale the whole output so its peak
     absolute value is 1 (skip if the peak is 0).

3. In `src/audio/voices.ts`:
   - Add `strings: Map<string, AudioBuffer>` to `VoiceKit` and initialise it in `createVoiceKit`.
   - In `playSynth`, after the oscillator loop and before the vibrato block, if `patch.string` is
     set and `audibleOsc(freq, patch.string.octave)`:
     - `stringFreq = freq * 2 ** patch.string.octave`.
     - Cache key `` `${ctx.sampleRate}:${stringFreq.toFixed(3)}:${decay}:${brightness}:${pick}` ``.
       On a miss, call `pluckSamples(ctx.sampleRate, stringFreq, patch.string)`, copy it into a new
       mono `AudioBuffer` (`ctx.createBuffer(1, samples.length, ctx.sampleRate)` then
       `copyToChannel`), and store it.
     - Create an `AudioBufferSourceNode` with that buffer, a `GainNode` with `gain.value =
       patch.string.level`, connect source → gain → `oscTarget` (the same target the oscillators
       use, so drive, filter and envelope apply).
     - Bends: if `bends.length > 0`, call `scheduleBends(source.detune, 0)`.
     - Push the source and gain onto `collected.nodes`, push `{ node: source }` onto
       `collected.sources`, and keep the source in a new `detuneTargets: AudioParam[]` list.
   - Change the vibrato block so its depth connects to every oscillator's `detune` and to every
     entry of `detuneTargets` (the string source's `detune`). Leave FM connecting to oscillators
     only.

4. In `src/audio/instruments.ts`:
   - Replace the `indie-lead` entry in `LEADS` (keep its comment style, rewrite the comment to
     describe a plucked string sounding an octave below the written note) with:

     ```ts
     'indie-lead': synth({ name: 'Indie lead', oscs: [],
       string: { octave: -1, level: 1, decay: 2.2, brightness: 0.55, pick: 0.18 },
       env: env(0.002, 1.5, 0.35, 0.4), filter: { type: 'lowpass', hz: 3200, q: 0.9, envAmount: 1.6, envDecay: 0.2 },
       vibrato: { rate: 0.9, cents: 5, delay: 0 }, drive: 0.25, gain: 0.5, sends: { reverb: 1.3, delay: 2.4 } }),
     ```

   - Add to `KEYS`, after `power-chords`, with one comment line each:

     ```ts
     'acoustic-guitar': synth({ name: 'Acoustic guitar', oscs: [],
       string: { octave: -1, level: 1, decay: 3, brightness: 0.45, pick: 0.25 },
       env: env(0.002, 2.5, 0.3, 0.5), filter: { type: 'lowpass', hz: 5000, q: 0.7, envAmount: 1.2, envDecay: 0.3 },
       gain: 0.5, sends: { reverb: 1, delay: 0.4 } }),
     'crunch-guitar': synth({ name: 'Crunch guitar', oscs: [],
       string: { octave: -1, level: 1, decay: 2, brightness: 0.7, pick: 0.12 },
       env: env(0.002, 1.2, 0.5, 0.25), filter: { type: 'lowpass', hz: 2600, q: 1, envAmount: 1.5, envDecay: 0.15 },
       drive: 0.6, gain: 0.3, sends: { reverb: 0.6, delay: 0.3 } }),
     ```

5. In `src/audio/styles.ts`, add `'acoustic-guitar': 'acoustic-guitar'` and
   `'crunch-guitar': 'crunch-guitar'` to the `altrock` recipe's `instruments`, after
   `'shimmer-guitar'`. Change no roles.

6. Create `tests/strings.test.ts` (Vitest, importing only from `../src/audio/strings`) with these
   tests, at `sampleRate = 48000` and spec `{ decay: 2, brightness: 0.5, pick: 0.2 }` unless stated:
   - Length is `Math.ceil(2.5 * 48000)` by default and `Math.ceil(1 * 48000)` with `seconds = 1`;
     peak absolute value is 1 within 1e-6; every sample is finite.
   - Same inputs give identical arrays (deterministic).
   - Pitch: for freq 110, 220, 440, and 659.25, estimate the period by autocorrelation over samples
     2400–7200 (search lags from `0.5 * sr / freq` to `1.5 * sr / freq`, pick the lag with the
     highest correlation, refine with parabolic interpolation) and expect `sr / lag` within 1% of
     freq.
   - Decay: RMS of samples 0.9–1.0 s is at least 20 dB below RMS of samples 0.0–0.1 s with
     `decay: 1`.
   - Brightness: the mean absolute first difference over samples 0–4800 is larger for
     `brightness: 1` than for `brightness: 0`.

7. In `tests/instruments.test.ts`, change `expect(total).toBe(57)` to `expect(total).toBe(59)`.

7b. In `tests/styles.test.ts`, change the assertion at line 31,
    `expect(patch.oscs.length, `${id} ${key}`).toBeGreaterThanOrEqual(1);`, so a patch with a
    `string` may have no oscillators:
    `expect(patch.oscs.length + (patch.string ? 1 : 0), `${id} ${key}`).toBeGreaterThanOrEqual(1);`.

8. In `docs/sound.md`:
   - Under "Patches and styles", after the paragraph about `drive`, add a paragraph: a synth patch can
     set `string` to add a plucked string (Karplus-Strong): a burst of fixed-seed noise, shaped by
     the pick position, circulates in a delay line one period long and is softened on each pass, so
     it rings and decays like a string. `decay`, `brightness`, and `pick` shape it, `octave` and
     `level` work as for an oscillator, and it goes through the patch's drive, filter, and
     envelope. Each pitch is rendered once (2.5 s, `src/audio/strings.ts`) and reused. Guitar
     patches set `octave: -1`, because guitar music is written an octave above where it sounds.
   - In the Alt rock section, replace the description of `inst=indie-lead` with one that says it is
     a plucked string, lightly driven, an octave below the written note, with a slow chorus wobble
     and a long delay tail; add that `inst=acoustic-guitar` (a plucked acoustic, rounder pick,
     longer ring) and `inst=crunch-guitar` (a driven plucked electric for crunchy parts) are also
     extras no role maps to; change "Its eight instruments" to "Its ten instruments".
9. In `AGENTS.md`, in the rule listing the files that stay free of the DOM and audio, add
   `src/audio/strings.ts` after `src/audio/curves.ts`.

## Acceptance

- `npm run test:sandbox` exits 0, and its output includes `tests/strings.test.ts` passing.
- `git diff --stat` lists only files from **Files to touch**, plus the two new files shown by
  `git status --porcelain`.
- `git grep -n "Math.random" -- src/audio/strings.ts` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any song in `src/songs/`, any other instrument, or `src/audio/engine.ts`.
- Keep `src/audio/strings.ts` free of DOM and Web Audio types.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- AudioWorklet or delay-node feedback loops.
- Changing `shimmer-guitar`, `fuzz-lead`, `clean-guitar`, `power-chords`, or `guitar-wall`.
- Level tuning in a browser.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
