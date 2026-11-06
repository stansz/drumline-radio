## Goal

Tighten the Synthwave bass on songs with very low bass lines (Underpass, Midnight Arcade):

1. Any oscillator whose frequency would fall below 30 Hz is not created (only rumble, and it makes the
   limiter pump). This drops Synthwave's sub-octave square under notes below about B1.
2. Synthwave gets a clean `sub-bass` patch, and Midnight Arcade's `sub` track asks for it with
   `inst=sub-bass` (Techno already has a `sub-bass` patch, so Techno is unchanged).
3. Synthwave's `synth-bass` release goes from 0.08 to 0.05.

## Files to touch

- `src/audio/curves.ts`
- `src/audio/voices.ts`
- `src/audio/styles.ts`
- `src/songs/midnight-arcade.song`
- `tests/curves.test.ts`
- `docs/sound.md`

## Steps

1. `src/audio/curves.ts`: add, next to `attackTime`:
   ```ts
   /** Below this an oscillator is felt as rumble, not heard, and only eats headroom. */
   export const MIN_OSC_HZ = 30;

   /** Whether an oscillator at `octave` above (or below) a note at `freq` is worth playing. */
   export function audibleOsc(freq: number, octave: number): boolean {
     return freq * 2 ** octave >= MIN_OSC_HZ;
   }
   ```
2. `src/audio/voices.ts`: import `audibleOsc` from `./curves` (add it to the existing import line).
   In the `for (const spec of patch.oscs)` loop, make the first line
   `if (!audibleOsc(freq, spec.octave)) continue;`. Leave everything else in the loop as is.
   If a patch then has no oscillators at all for a note, that is fine (it cannot happen with the
   current patches: every patch has an octave-0 oscillator and the lowest note is C1, 32.7 Hz).
3. `src/audio/styles.ts`, Synthwave (`STYLE_DEFS.synthwave.patches`):
   - In `'synth-bass'`, change `env(0.005, 0.2, 0.6, 0.08)` to `env(0.005, 0.2, 0.6, 0.05)`. Nothing
     else in that patch changes.
   - Add a new patch right after `'synth-bass'`:
     ```ts
     'sub-bass': synth({
       name: 'Sub bass',
       oscs: [osc('sine', 0, 0, 0.85), osc('triangle', 1, 0, 0.15)],
       env: env(0.003, 0.15, 0.8, 0.05),
       filter: { type: 'lowpass', hz: 400, q: 0.7, envAmount: 1, envDecay: 0.1 },
       gain: 0.45,
       sends: { reverb: 0, delay: 0 },
     }),
     ```
   - Do not change the Synthwave `roles` map or any other style.
4. `src/songs/midnight-arcade.song`: change exactly the line
   `track sub role=bass vol=0.62` to `track sub role=bass inst=sub-bass vol=0.62`. No other change to
   the file.
5. `tests/curves.test.ts`: add a `describe('audibleOsc')` (import `audibleOsc` and `MIN_OSC_HZ`) with:
   F1 (43.65 Hz) one octave down → `false`; C2 (65.41 Hz) one octave down → `true`; E1 (41.2 Hz) at
   octave 0 → `true`; exactly `MIN_OSC_HZ` at octave 0 → `true`; 29.9 at octave 0 → `false`.
6. `docs/sound.md`: where it describes how voices are built (or the Synthwave patches), add one
   sentence: oscillators that would sound below 30 Hz are skipped, so a sub-octave layer drops out
   under very low notes. If it lists Synthwave patches, add `sub-bass` (a clean sine sub, used by
   Midnight Arcade's `sub` track via `inst=sub-bass`). Fix any statement the change makes false
   (e.g. a quoted synth-bass release of 0.08).

## Acceptance

- `npm run test:sandbox` exits 0.
- `npm run typecheck` exits 0.
- `git diff -- src/songs/midnight-arcade.song` shows exactly one changed line, the `track sub` line.
- `git status --porcelain` lists only files in **Files to touch** (plus `.handoff/`).

Verifier only:

- `npm test` exits 0 (includes `tests/drift.test.ts`).
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it; do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.
- `src/audio/curves.ts` and `src/audio/styles.ts` stay free of the DOM and audio.
- No note in any `.song` file changes.

## Out of scope

- Any other style's patches, the Techno `sub-bass` patch, the mixer, compressor or limiter.
- Underpass's song file or `tools/arranger/club.mjs`.
- Changing bass octaves in any song.

## If blocked

Stop and write `.handoff/report.md` with the failing step, the exact command and output, and what you
would need to continue.
