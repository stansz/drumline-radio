## Goal

Ship four changes together:

1. A fifth style, **Lo-fi**: mellow keys, a round bass, a dusty swung kit, slow tape wobble, a dark
   lowpass, and a vinyl-crackle bed.
2. An optional `arranger:` song header, shown in the readout.
3. Every song file replaced from `.handoff/songs4/`. That covers 23 re-arranged or re-credited songs
   plus the new Lo-fi original `late-bus-home.song`, which uses `style: lofi` and makes 24 songs.
4. The UI, docs, and tests updated for five styles and the new credits.

## Files to touch

- `src/music/roles.ts`, `src/music/song.ts`
- `src/audio/styles.ts`, `src/audio/curves.ts`, `src/audio/engine.ts`
- `src/ui/ui.ts`, `src/ui/style.css`, `index.html`
- `src/songs/*.song` (copied from `.handoff/songs4/`, 24 files)
- `tests/song.test.ts`, `tests/library.test.ts`, `tests/curves.test.ts`, `tests/styles.test.ts` (only if
  it hard-codes four styles)
- `README.md`, `docs/song-format.md`, `docs/how-it-works.md`, `docs/sound.md`

## Steps

1. **Songs.** Copy every file in `.handoff/songs4/` to `src/songs/` byte for byte, overwriting the files
   that exist. Do not edit any song file.

2. **`src/music/roles.ts`:** set `STYLES = ['synthwave', 'chiptune', 'orchestral', 'techno', 'lofi'] as const`.

3. **`src/music/song.ts`:**
   - Add `arranger: string | null;` to `SongMeta`, after `composer`, defaulting to `null`.
   - Add `'arranger'` to `KNOWN_HEADER_KEYS` only. It is optional, not required.
   - When present it must be non-empty, otherwise `err(line, 'arranger must not be empty')`. Store the
     trimmed value.

4. **`src/audio/curves.ts`.** Add a pure function:
   ```ts
   /** A loopable vinyl bed: faint hiss plus sparse clicks of random size. */
   export function crackleSamples(length: number, sampleRate: number, random: () => number): Float32Array<ArrayBuffer>
   ```
   - Hiss: every sample gets `(random() * 2 - 1) * 0.015`.
   - Clicks: about 7 per second at random positions. Each adds a burst of `Math.round(sampleRate * 0.002)`
     samples with amplitude `0.25 + random() * 0.75`, a random sign, and a linear decay to 0.
   - Clamp every sample to [-1, 1].

5. **`src/audio/styles.ts`:**
   - Add `crackle: number;` to `StyleDef['fx']`, and set `crackle: 0` in the four existing styles.
   - Add the `lofi` style after `techno`:
   ```ts
   lofi: {
     id: 'lofi',
     name: 'Lo-fi',
     blurb: 'Mellow keys, a dusty swung kit, tape wobble, and vinyl crackle.',
     roles: { lead: 'soft-lead', lead2: 'tine-keys', counter: 'soft-flute', pad: 'tape-pad', chords: 'tine-keys', bass: 'round-bass', arp: 'muted-pluck', drums: 'dusty-kit' },
     patches: {
       'soft-lead': synth({ name: 'Soft lead', oscs: [osc('triangle', 0, 0, 0.8), osc('sine', 1, 0, 0.2)],
         env: env(0.02, 0.4, 0.6, 0.4), filter: { type: 'lowpass', hz: 1800, q: 0.5, envAmount: 1.2, envDecay: 0.3 },
         vibrato: { rate: 0.7, cents: 9, delay: 0 }, gain: 0.3, sends: { reverb: 1, delay: 0.8 } }),
       'tine-keys': synth({ name: 'Tine keys', oscs: [osc('sine', 0, 0, 1)], fm: { ratio: 1, index: 1.2, decay: 0.8 },
         env: env(0.005, 1.2, 0.25, 0.5), filter: { type: 'lowpass', hz: 2200, q: 0.5, envAmount: 1, envDecay: 0.3 },
         vibrato: { rate: 0.6, cents: 7, delay: 0 }, gain: 0.26, sends: { reverb: 1, delay: 0.5 } }),
       'soft-flute': synth({ name: 'Soft flute', oscs: [osc('sine', 0, 0, 0.7), osc('triangle', 0, 3, 0.3)],
         env: env(0.05, 0.3, 0.7, 0.3), filter: { type: 'lowpass', hz: 2000, q: 0.5, envAmount: 1, envDecay: 0.2 },
         vibrato: { rate: 0.7, cents: 10, delay: 0 }, gain: 0.22 }),
       'tape-pad': synth({ name: 'Tape pad', oscs: [osc('sawtooth', 0, -10, 0.3), osc('sawtooth', 0, 10, 0.3), osc('triangle', -1, 0, 0.4)],
         env: env(0.8, 1.2, 0.8, 1.5), filter: { type: 'lowpass', hz: 900, q: 0.5, envAmount: 1, envDecay: 1 },
         vibrato: { rate: 0.5, cents: 8, delay: 0 }, gain: 0.18, sends: { reverb: 1.4, delay: 0.3 } }),
       'round-bass': synth({ name: 'Round bass', oscs: [osc('sine', 0, 0, 0.75), osc('triangle', 0, 0, 0.25)],
         env: env(0.01, 0.3, 0.7, 0.12), filter: { type: 'lowpass', hz: 600, q: 0.7, envAmount: 1.5, envDecay: 0.1 },
         gain: 0.5, sends: { reverb: 0.1, delay: 0 } }),
       'muted-pluck': synth({ name: 'Muted pluck', oscs: [osc('triangle', 0, 0, 1)],
         env: env(0.003, 0.25, 0, 0.2), filter: { type: 'lowpass', hz: 1600, q: 1, envAmount: 2, envDecay: 0.12 },
         vibrato: { rate: 0.6, cents: 8, delay: 0 }, gain: 0.18, sends: { reverb: 1, delay: 1.2 } }),
       'dusty-kit': drums({ name: 'Dusty kit',
         kick: { wave: 'sine', hz: 50, sweep: 2, sweepTime: 0.08, decay: 0.35, click: 0.1 },
         snare: { noise: 'white', filter: 'bandpass', hz: 1400, toneHz: 0, decay: 0.18 },
         hat: { noise: 'white', hz: 6000, decay: 0.03 },
         crashDecay: 1.2, gain: 0.75, sends: { reverb: 0.6, delay: 0 } }),
     },
     fx: { reverbSeconds: 2.2, reverbSend: 0.25, delayBeats: 0.75, delaySend: 0.15, delayFeedback: 0.3, crush: 0.08, lowpassHz: 4200, crackle: 0.08 },
     lanes: ['#ffb37a', '#7fd1c7', '#e8a0bf', '#c3b1e1', '#f6d186', '#9ad0ec'],
   },
   ```
   If a field name differs from the existing `SynthPatch`/`DrumKit` types, match the types and say so in
   the report. Do not change the types beyond adding `fx.crackle`.

6. **`src/audio/engine.ts`.** Add the crackle bed. The engine must still not touch the DOM.
   - In the constructor, build one stereo 4-second `AudioBuffer`. Fill each channel with
     `crackleSamples(4 * sampleRate, sampleRate, Math.random)`.
   - Create `crackleGain` (a GainNode with gain 0) connected to `this.clip`, so it passes through
     volume and the meters but not the compressor.
   - `applyStyleFx()` sets `crackleGain.gain.setTargetAtTime(fx.crackle, now, 0.05)`.
   - When playback begins (inside `begin`, where the timer starts), create a looping
     `AudioBufferSourceNode` on that buffer, connect it to `crackleGain`, and start it.
   - In `stopAll()`, stop and disconnect it, then clear the reference.

7. **`src/ui/ui.ts`:**
   - The style keys become `/^[1-5]$/`. Band buttons already come from `STYLES`.
   - Subtitle: when `song.meta.arranger` is set, use
     `` `${composer}, arr. ${arranger} · ${year} · ${name}${remix}` ``; otherwise keep the current format.

8. **`index.html`:** in the info panel's keyboard line, change `1–4 style` to `1–5 style`.

9. **`src/ui/style.css`:**
   - Add a `:root[data-style='lofi']` token block with the same variables as the others:
     `--bg: #1a1418; --panel: rgba(34, 24, 30, 0.88); --text: #f5e6dc; --muted: #b39a94; --accent: #ffb37a;
     --accent-2: #7fd1c7; --glow: #ffb37a;`
   - `:root[data-style='lofi'] body { background: radial-gradient(ellipse at 50% 0%, #3a2530 0%, #1a1418 65%) fixed; }`
   - `:root[data-style='lofi'] body::after { background: repeating-radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 3px); }`
     This is a faint grain.
   - Inside the existing `@media (max-width: 640px)` block, change the `.band` rule so five fit on one row
     at 360 px: `padding: 9px 1px; font-size: 9px; letter-spacing: 0.02em;`.

10. **Tests:**
    - `tests/library.test.ts`:
      - the count becomes 24;
      - in the order test, insert `'late-bus-home'` immediately before `'midnight-arcade'` (the
        originals sort by title);
      - the per-category counts become carols 9, classics 11, originals 4.
    - `tests/song.test.ts`: a header with `arranger: Claude & SZ` parses, and `meta.arranger` is
      `'Claude & SZ'`; without the line it is `null`; `arranger:` with an empty value gives an error
      containing `arranger must not be empty`.
    - `tests/curves.test.ts`: `crackleSamples(48000, 48000, seeded)` has length 48000, every value is in
      [-1, 1], and at least one absolute value is > 0.2. For `seeded`, use a simple LCG so the test is
      deterministic.
    - If `tests/styles.test.ts` hard-codes four styles, update it to cover `STYLES` (five).

11. **Docs:**
    - `docs/song-format.md`:
      - add the header row `` | `arranger` | no | Any non-empty text. Shown after the composer as "arr. …". | ``
        after `composer`;
      - add `lofi` to the `style` row;
      - add an empty `arranger` to the list of header errors.
    - `README.md`:
      - "Four styles (Synthwave, Chiptune, Orchestral, Techno)" becomes "Five styles (Synthwave,
        Chiptune, Orchestral, Techno, Lo-fi)";
      - shortcuts `1–4 styles` becomes `1–5 styles`;
      - `Christmas carols, arranged by Claude:` becomes `Christmas carols, arranged by Claude and SZ:`;
      - `Other public-domain melodies, arranged by Claude:` becomes `..., arranged by Claude and SZ:`;
      - `Claude originals:` becomes `Originals by Claude and SZ:`, and add `- **Late Bus Home** (Lo-fi)` as the
        first item in that list.
    - `docs/how-it-works.md` and `docs/sound.md`: "four styles" becomes "five styles". In `docs/sound.md`,
      add one short paragraph on Lo-fi: tape wobble comes from slow vibrato on its patches, and the vinyl
      bed is a looping crackle buffer whose level is the style's `fx.crackle`.

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0.
- `git diff --no-index --quiet .handoff/songs4/late-bus-home.song src/songs/late-bus-home.song` exits 0, and the
  same holds for `valkyries.song` and `korobeiniki.song`.
- `grep -c "document\|window" src/audio/engine.ts` prints `0`.

Verifier only:

- `npm test` exits 0.
- `npm run build` exits 0.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not edit song data. If a song fails to parse, stop and report the error.
- No new dependencies. Keep `src/music/`, `src/audio/styles.ts`, `src/audio/curves.ts`, and `src/ui/view.ts`
  free of DOM and audio APIs.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report it.
  Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- Other UI changes, the service worker, and background playback.

## If blocked

Stop, write what failed and the exact error in `.handoff/report.md`, and do not improvise a different design.
