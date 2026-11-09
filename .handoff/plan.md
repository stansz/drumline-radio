## Goal

Extend the drum-kit model with optional settings (a kick body, multi-tone and gated snares, per-kit
toms and clap, kit-level drive and low-pass) whose defaults keep today's sound exactly, then give
five kits new first-guess values so they stop sounding alike. The verifier tunes levels in a
browser afterwards.

## Files to touch

- `src/audio/patches.ts`
- `src/audio/voices.ts`
- `src/audio/instruments.ts`
- `tests/patches.test.ts`
- `docs/sound.md`

## Steps

1. `src/audio/patches.ts`:
   - Extend `DrumKit` (every new field optional, each with a one-line `/** */` comment):
     - `kick.body?: { hz: number; decay: number; level: number }` — a second sine at a fixed `hz`
       (no sweep) for the drum shell's thud; `level` is relative to the kick (0 to 1).
     - `snare.tones?: number[]` — tuned tones in Hz; when set it replaces `toneHz` (one triangle
       per entry). `snare.toneDecay?: number` — seconds for the tones to fade; default
       `snare.decay * 0.5`. `snare.gate?: number` — seconds; when set the noise holds at full
       level for this long, then cuts to silence in 15 ms (an 80s gated snare) instead of decaying.
     - `toms?: { hz: [number, number, number]; sweep: number; sweepTime: number; decay: number;
       wave?: 'sine' | 'triangle' }` — low, mid, and high tom pitches (GM 41, 45, 50).
     - `clap?: { hz: number; q: number; decay: number }`.
     - `drive?: number` — 0 to 1, tanh drive on every hit of the kit. `lowpassHz?: number` — a
       low-pass on every hit of the kit.
   - Export the current hard-coded values and two resolvers (pure):

     ```ts
     export const DEFAULT_TOMS = { hz: [90, 130, 180] as [number, number, number], sweep: 1.6, sweepTime: 0.06, decay: 0.35, wave: 'sine' as const };
     export const DEFAULT_CLAP = { hz: 1100, q: 1.2, decay: 0.18 };
     /** The kit's toms, or the defaults. */
     export function kitToms(kit: DrumKit): Required<NonNullable<DrumKit['toms']>>
     /** The kit's clap, or the defaults. */
     export function kitClap(kit: DrumKit): NonNullable<DrumKit['clap']>
     ```

     `kitToms` fills a missing `wave` with `'sine'`.

2. `src/audio/voices.ts`, `playDrum`:
   - After creating `out`, build the kit's output chain: if `drums.drive` > 0, a `WaveShaper` with
     `driveCurve(drums.drive)` (cached in `kit.driveCurves` like `playSynth` does,
     `oversample = '2x'`); if `drums.lowpassHz` is set, a low-pass `BiquadFilter` at that frequency
     (Q 0.7). Connect `out → [shaper] → [lowpass] → dest` (only the stages that exist; with neither,
     `out → dest` exactly as now). Push the new nodes into `collected.nodes`. `out` stays the gain
     the voice fades through.
   - Kick (36): if `kick.body` is set, add a sine oscillator at `body.hz` through a gain that starts
     at `level * body.level` and falls exponentially to 0.001 over `body.decay`, into `out`;
     `longest = max(longest, body.decay)`.
   - Snare (38): if `snare.gate` is set, schedule the noise body as
     `setValueAtTime(level * 0.8, time)`, `setValueAtTime(level * 0.8, time + gate)`,
     `linearRampToValueAtTime(0.0001, time + gate + 0.015)`, and use `gate + 0.015` as its length
     instead of `snare.decay`. Tones: the list is `snare.tones ?? (snare.toneHz > 0 ? [snare.toneHz] : [])`;
     each tone is a triangle at its frequency through a gain from `clampLevel(level * 0.5 / sqrt(n))`
     (n = number of tones) falling to 0.001 over `snare.toneDecay ?? snare.decay * 0.5`. With
     `tones`, `toneDecay`, and `gate` unset, the result must be identical to today's code.
   - Toms (41, 45, 50): use `kitToms(drums)`: the pitch is `hz[0]`, `hz[1]`, or `hz[2]`; start at
     `hz * sweep`, ramp to `hz` over `sweepTime`, the wave is `wave`, the body decays over `decay`,
     and the voice ends at `time + decay + 0.05`.
   - Clap (39): use `kitClap(drums)` for the band-pass frequency, Q, and the final decay (the
     `time + 0.18` becomes `time + clap.decay`, and the voice ends at `time + clap.decay + 0.05`).
   - With every new field unset, every drum must schedule exactly what it does now.

3. `src/audio/instruments.ts`: change these kits (keep ids, names, and comments' first words; update
   each comment to say what the kit is now). Leave `chip-kit` and `orchestra-kit` unchanged.

   ```ts
   // Synthwave drums: an 80s electronic kit, with a gated snare and big sweeping toms.
   'gated-kit': drums({ name: 'Gated kit',
     kick: { wave: 'sine', hz: 50, sweep: 3.5, sweepTime: 0.1, decay: 0.5, click: 0.3 },
     snare: { noise: 'white', filter: 'bandpass', hz: 1500, toneHz: 0, tones: [180, 240], toneDecay: 0.12, decay: 0.3, gate: 0.22 },
     hat: { noise: 'white', hz: 7500, decay: 0.05 },
     toms: { hz: [80, 120, 170], sweep: 2.4, sweepTime: 0.18, decay: 0.5 },
     clap: { hz: 1200, q: 1, decay: 0.25 },
     crashDecay: 1.6, gain: 0.9, sends: { reverb: 1.3, delay: 0 } }),
   // Techno drums: a 909-style kit, a clicky kick and a snappy two-tone snare.
   '909-kit': drums({ name: '909 kit',
     kick: { wave: 'sine', hz: 48, sweep: 4, sweepTime: 0.07, decay: 0.4, click: 0.55 },
     snare: { noise: 'white', filter: 'highpass', hz: 2500, toneHz: 0, tones: [185, 330], toneDecay: 0.08, decay: 0.18 },
     hat: { noise: 'metal', hz: 8000, decay: 0.04 },
     toms: { hz: [100, 140, 200], sweep: 1.4, sweepTime: 0.05, decay: 0.3 },
     clap: { hz: 1400, q: 1.5, decay: 0.22 },
     drive: 0.15, crashDecay: 1.6, gain: 0.9, sends: { reverb: 0.4, delay: 0 } }),
   // Lo-fi drums: a dusty, swung kit, dark and saturated like a sampled record.
   'dusty-kit': drums({ name: 'Dusty kit',
     kick: { wave: 'sine', hz: 52, sweep: 1.8, sweepTime: 0.08, decay: 0.3, click: 0.05 },
     snare: { noise: 'white', filter: 'bandpass', hz: 1300, toneHz: 0, tones: [170], toneDecay: 0.06, decay: 0.16 },
     hat: { noise: 'white', hz: 6000, decay: 0.03 },
     toms: { hz: [90, 125, 170], sweep: 1.3, sweepTime: 0.06, decay: 0.3 },
     drive: 0.3, lowpassHz: 5000, crashDecay: 1.2, gain: 0.75, sends: { reverb: 0.6, delay: 0 } }),
   // Cinematic and Studio drums: a clean, natural studio kit with a little shell in the kick.
   'studio-kit': drums({ name: 'Studio kit',
     kick: { wave: 'sine', hz: 56, sweep: 2, sweepTime: 0.05, decay: 0.45, click: 0.2, body: { hz: 80, decay: 0.12, level: 0.3 } },
     snare: { noise: 'white', filter: 'bandpass', hz: 1900, toneHz: 0, tones: [190], toneDecay: 0.1, decay: 0.22 },
     hat: { noise: 'white', hz: 8500, decay: 0.05 },
     toms: { hz: [95, 135, 190], sweep: 1.25, sweepTime: 0.05, decay: 0.45 },
     crashDecay: 2.4, gain: 0.8, sends: { reverb: 0.9, delay: 0 } }),
   // Alt rock: a punchy, driven kit in a small room: a kick with a thud, a snare with long wires, resonant toms.
   'rock-kit': drums({ name: 'Rock kit',
     kick: { wave: 'sine', hz: 58, sweep: 2.6, sweepTime: 0.07, decay: 0.42, click: 0.4, body: { hz: 90, decay: 0.15, level: 0.5 } },
     snare: { noise: 'white', filter: 'bandpass', hz: 2200, toneHz: 0, tones: [200], toneDecay: 0.08, decay: 0.35 },
     hat: { noise: 'white', hz: 7500, decay: 0.07 },
     toms: { hz: [85, 115, 160], sweep: 1.3, sweepTime: 0.04, decay: 0.55, wave: 'triangle' },
     drive: 0.35, crashDecay: 1.8, gain: 0.9, sends: { reverb: 0.8, delay: 0 } }),
   ```

4. `tests/patches.test.ts`: add tests (importing `drums` and the new exports from
   `../src/audio/patches`):
   - `kitToms` of a kit without `toms` equals `DEFAULT_TOMS`, and `DEFAULT_TOMS` is
     `{ hz: [90, 130, 180], sweep: 1.6, sweepTime: 0.06, decay: 0.35, wave: 'sine' }`.
   - `kitToms` of a kit with `toms` but no `wave` fills `wave: 'sine'`.
   - `kitClap` of a kit without `clap` equals `{ hz: 1100, q: 1.2, decay: 0.18 }`.
   Build test kits with `drums({...})` and minimal valid kick/snare/hat values.

5. `docs/sound.md`: add a `### Drum kits` subsection at the end of `## Building a patch` (before
   `### Hearing and levelling a patch` if that is the last subsection, otherwise after `### Breath`):
   what a kit can set (kick pitch, sweep, decay, click, and body; snare noise band, tones,
   toneDecay, and gate; hat noise and decay; toms; clap; crash length; kit drive and low-pass), that
   every new field is optional and the defaults are the old sound, and one line per re-voiced kit
   on what makes it distinct (gated snare and sweeping toms; two-tone snappy snare and click;
   dark and saturated; clean with shell; driven with long snare wires and resonant toms).

## Acceptance

- `npm run test:sandbox` exits 0, and its output shows `tests/patches.test.ts` passing.
- `git diff --stat` and `git status --porcelain` list only files from **Files to touch** (plus
  `.handoff/` files).
- `git grep -n "kitToms\|kitClap" -- src/audio/voices.ts` prints at least two lines.
- `git diff -- src/songs src/audio/styles.ts` prints nothing.

Verifier only:
- `npm test` exits 0.
- `npm run typecheck` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not change `chip-kit`, `orchestra-kit`, any synth patch, any song, or playback scheduling.
- Keep `src/audio/patches.ts` free of DOM and Web Audio.
- Files use LF line endings, UTF-8, and 2-space indents.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past
  it.

## Out of scope

- Level-matching or tuning the kits, browser checks, cymbal and rimshot changes, a room reverb.

## If blocked

Stop, write `.handoff/report.md` with what was done, the exact failing command and its output,
and what decision is needed.
