## Goal

Add formant filtering to synth patches (a bank of parallel band-pass filters that shapes the
oscillators into a vowel or a reed), a shared table of vowel formants, and four new bank patches
built with it: a choir "aah" pad, a choir "ooh" pad, a wordless vocal lead, and a reed lead.
Document it. Existing patches must sound exactly as before.

## Files to touch

- `src/audio/patches.ts`
- `src/audio/voices.ts`
- `src/audio/instruments.ts`
- `tests/patches.test.ts` (new)
- `tests/instruments.test.ts`
- `docs/sound.md`

## Steps

1. `src/audio/patches.ts`:
   - Add and export:

     ```ts
     /** One formant: a band-pass peak at a fixed frequency, whatever note is played. */
     export interface Formant {
       hz: number;   // centre frequency in Hz
       q: number;    // sharpness: centre frequency ÷ bandwidth
       gain: number; // level of this band, 0 to 1
     }

     /** Formants of sung vowels (an alto-like voice), loudest band first: use as `formants: VOWELS.ah`. */
     export const VOWELS: Record<'ah' | 'oh' | 'oo' | 'ee', Formant[]> = {
       ah: [{ hz: 800, q: 10, gain: 1 }, { hz: 1150, q: 12.8, gain: 0.5 }, { hz: 2900, q: 24.2, gain: 0.25 }],
       oh: [{ hz: 450, q: 6.4, gain: 1 }, { hz: 800, q: 10, gain: 0.3 }, { hz: 2830, q: 28.3, gain: 0.15 }],
       oo: [{ hz: 325, q: 6.5, gain: 1 }, { hz: 700, q: 11.7, gain: 0.15 }, { hz: 2530, q: 14.9, gain: 0.08 }],
       ee: [{ hz: 270, q: 4.5, gain: 1 }, { hz: 2140, q: 23.8, gain: 0.3 }, { hz: 2950, q: 29.5, gain: 0.2 }],
     };
     ```

   - Add to `SynthPatch`, after `string`:

     ```ts
     /** Formant bands: the oscillators and string pass through these band-pass filters in parallel,
      *  summed, before drive, filter, and envelope. Fixed frequencies make a vowel or a reed body. */
     formants?: Formant[];
     ```

2. `src/audio/voices.ts`, `playSynth`: right after `oscTarget` is decided (after the drive block,
   before the oscillators are created), if `patch.formants` has at least one entry:
   - Create a `GainNode` `formantIn` (gain 1). For each formant, create a `BiquadFilterNode` with
     `type = 'bandpass'`, `frequency.value = formant.hz`, `Q.value = formant.q`, and a `GainNode`
     with `gain.value = formant.gain`; connect `formantIn → band-pass → band gain → oscTarget`.
   - Push every new node into `collected.nodes`.
   - Set `oscTarget = formantIn`, so the oscillators and the plucked string connect to it.
   - When `formants` is undefined or empty, change nothing.

3. `src/audio/instruments.ts`: import `VOWELS` from `./patches` and add these patches, each with a
   one-line `//` comment above it saying what it is for. Change no existing patch and no style.

   In `LEADS`:
   ```ts
   'vox-lead': synth({ name: 'Vox lead', oscs: [osc('sawtooth', 0, 0, 0.7), osc('pulse25', 0, 4, 0.3)],
     formants: VOWELS.ah, env: env(0.06, 0.3, 0.9, 0.3),
     vibrato: { rate: 5.5, cents: 18, delay: 0.25 }, gain: 0.9, sends: { reverb: 1, delay: 0.6 } }),
   'reed-lead': synth({ name: 'Reed lead', oscs: [osc('square', 0, 0, 0.6), osc('sawtooth', 0, 3, 0.3)],
     formants: [{ hz: 1200, q: 3, gain: 1 }, { hz: 2700, q: 5, gain: 0.35 }],
     env: env(0.04, 0.2, 0.85, 0.15), vibrato: { rate: 5, cents: 8, delay: 0.35 }, gain: 0.6 }),
   ```

   In `PADS`:
   ```ts
   'choir-aah': synth({ name: 'Choir aah',
     oscs: [osc('sawtooth', 0, -9, 0.4), osc('sawtooth', 0, 9, 0.4), osc('sawtooth', 0, 0, 0.3)],
     formants: VOWELS.ah, env: env(0.35, 1, 0.85, 0.9),
     filter: { type: 'lowpass', hz: 4000, q: 0.5, envAmount: 1, envDecay: 0.1 },
     vibrato: { rate: 5, cents: 10, delay: 0.4 }, gain: 0.9, sends: { reverb: 1, delay: 0.3 } }),
   'choir-ooh': synth({ name: 'Choir ooh',
     oscs: [osc('sawtooth', 0, -9, 0.4), osc('sawtooth', 0, 9, 0.4), osc('sawtooth', 0, 0, 0.3)],
     formants: VOWELS.oo, env: env(0.4, 1, 0.85, 1),
     filter: { type: 'lowpass', hz: 3000, q: 0.5, envAmount: 1, envDecay: 0.1 },
     vibrato: { rate: 5, cents: 10, delay: 0.4 }, gain: 0.9, sends: { reverb: 1, delay: 0.3 } }),
   ```

4. Create `tests/patches.test.ts` (Vitest, importing only `../src/audio/patches`):
   - Every entry of `VOWELS` (`ah`, `oh`, `oo`, `ee`) has exactly 3 formants, with `hz` strictly
     ascending, every `q` > 0, and every `gain` in (0, 1].
   - The first formant of each vowel has `gain` 1.

5. `tests/instruments.test.ts`: change the bank total from 70 to 74.

6. `docs/sound.md`, section `## Building a patch`:
   - In the table, add a row: `| Choir, wordless vocals, reeds | formants | \`choir-aah\`, \`choir-ooh\`, \`vox-lead\`, \`reed-lead\` |`.
   - Add a subsection `### Formants` after `### Plucked string` and before
     `### Hearing and levelling a patch`, covering: `formants` is a list of band-pass bands at
     fixed frequencies that the oscillators and plucked string pass through in parallel (summed)
     before drive, filter, and envelope; fixed peaks are what make a vowel, so the vowel stays the
     same whatever note is played; `VOWELS` in `src/audio/patches.ts` holds `ah`, `oh`, `oo`, and
     `ee` (use as `formants: VOWELS.ah`); a reed or a body is one or two broad bands (low `q`, as
     in `reed-lead`); start from a bright source (saws, a square, a pulse), since a band-pass only
     takes away; narrow bands remove most of the energy, so formant patches need a higher `gain`
     than plain ones and should be level-matched with `tools/browser/levels.mjs`; it sounds like a
     synth choir, not real singers.
   - In `## Patches and styles`, change "(oscillators, a plucked string, envelope, filter, vibrato,
     FM, drive, and send levels)" to "(oscillators, a plucked string, formants, envelope, filter,
     vibrato, FM, drive, and send levels)".

## Acceptance

- `npm run test:sandbox` exits 0, and its output shows `tests/patches.test.ts` and
  `tests/instruments.test.ts` passing.
- `git diff --stat` and `git status --porcelain` list only files from **Files to touch** (plus
  ignored `.handoff/` files).
- `git grep -c -E "'(vox-lead|reed-lead|choir-aah|choir-ooh)': synth" -- src/audio/instruments.ts`
  prints `src/audio/instruments.ts:4`.
- `git grep -n "### Formants" -- docs/sound.md` prints one line.
- `git diff -- src/audio/styles.ts src/audio/engine.ts` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change any existing patch, style, song, the engine, or playback scheduling. A patch
  without `formants` must build exactly the same audio graph as before.
- Keep `src/audio/patches.ts` free of DOM and Web Audio.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- Pitch-tracking formants, vowel morphing over time, breath noise, wiring the new patches into
  styles or songs, changing `woodwind` or `soft-flute`, browser checks.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
