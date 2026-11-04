## Goal

Add a 6th style, **Cinematic** (grand piano, overdriven lead guitar, strings, warm bass, analog
synth, organic drums), plus two opt-in engine features it needs: note **bends** in the song format
(`^`) and per-patch **drive** (distortion). Existing songs must sound and parse exactly as before.

## Files to touch

- `src/music/roles.ts`
- `src/music/song.ts`
- `src/music/timing.ts`
- `src/audio/curves.ts`
- `src/audio/styles.ts`
- `src/audio/voices.ts`
- `src/audio/engine.ts`
- `src/ui/ui.ts`
- `src/ui/style.css`
- `index.html`
- `tests/song.test.ts`
- `tests/timing.test.ts`
- `tests/curves.test.ts`
- `tests/styles.test.ts`
- `docs/song-format.md`
- `docs/sound.md`
- `docs/how-it-works.md`
- `README.md`
- `.handoff/report.md`

## Steps

### 1. Bends in the song format (`src/music/song.ts`)

1. Add an optional field to `Note`: `bends?: { at: number; pitch: number }[]`. `at` is a tick
   offset from the note's own `tick`; `pitch` is the MIDI pitch the note glides to starting at
   that offset. Only set the field when the note has at least one bend (notes without bends must
   not have the key at all, so existing `toEqual` tests keep passing).
2. In `parseNoteToken`, after the `:VEL` part, accept either `~` (tie, as now) or `^` (bend), not
   both. Return a new boolean `bend` alongside `tie`. `G4/8^`, `G4^`, `G4/8':90^` are valid.
   `G4/8~^` and `G4/8^~` are unrecognised tokens.
3. Bend semantics in the note-assembly loop (where `pendingTie` is handled): `X^ Y` merges X and Y
   into one note that starts at X's tick, lasts both written lengths, keeps X's velocity and
   staccato flag, and gets a bend `{ at: <ticks from note start to Y's start>, pitch: <Y's pitch> }`.
   Chains work: `G4/8^ A4/8^ G4/4` is one note with two bends (to A4 at 480, back to G4 at 960).
   Ties and bends combine in either order and the pending note keeps growing:
   `G4/4~ G4/4^ A4/2` (G held, then bends to A) and `G4/8^ A4/8~ A4/2` (bend to A, then hold) are
   each one note. A bend may cross a bar line.
4. Bend errors (each pushed with `err(line, ...)` and the pending note flushed like a broken tie):
   - `bend from a chord in track <id>`: a chord token with `^`.
   - `bend to a chord in track <id>`: a chord following a bend.
   - `bend into a rest in track <id>`: a rest, `R`, or `R*n` following a bend.
   - `bend has no following note in track <id>`: the track ends on a bend.
   - `bend in a drums track <id>`: `^` in a drums track.
   The bend target's pitch is range-checked like any note (the existing check already covers it).
5. Keep a tie to different pitches an error, as now.

### 2. Timeline (`src/music/timing.ts`)

1. Add `bends?: { time: number; pitch: number }[]` to `ScheduledNote`, where `time` is seconds from
   the note's start: `tickToSeconds(song, note.tick + b.at) - start`. Only set it when the note has
   bends. Staccato does not change bend times.

### 3. Curves (`src/audio/curves.ts`, pure, no Web Audio)

1. `export const BEND_GLIDE = 0.1;` (seconds).
2. `export function bendGlide(segment: number): number` returns `Math.min(BEND_GLIDE, segment / 2)`,
   and at least `0.005`. `segment` is the seconds from this bend point to the next bend point (or to
   the note's end).
3. `export function driveCurve(amount: number, samples = 1024): Float32Array`: with
   `k = 1 + amount * 20`, sample `i` maps `x = (i / (samples - 1)) * 2 - 1` to
   `Math.tanh(k * x) / Math.tanh(k)`. `amount` is clamped to 0–1. The curve is odd-symmetric,
   starts at -1, and ends at 1.

### 4. Patch types and the Cinematic style (`src/audio/styles.ts`, `src/music/roles.ts`)

1. `roles.ts`: `STYLES = ['synthwave', 'chiptune', 'orchestral', 'techno', 'lofi', 'cinematic']`.
2. Add `drive?: number` (0–1) to `SynthPatch`.
3. Add `cinematic` to `STYLE_DEFS`, after `lofi`, written in the compact one-line-per-patch form the
   lofi style uses:
   - `name: 'Cinematic'`, `blurb: 'Grand piano, a soaring overdriven guitar, strings, and a big hall.'`
   - `roles: { lead: 'guitar', lead2: 'grand-piano', counter: 'cello', pad: 'strings', chords: 'grand-piano', bass: 'warm-bass', arp: 'analog-synth', drums: 'studio-kit' }`
   - patches:
     - `guitar`: name `Lead guitar`, oscs `osc('sawtooth', 0, 0, 0.6), osc('square', 0, 4, 0.25), osc('sine', -1, 0, 0.15)`,
       `env(0.008, 0.8, 0.7, 0.6)`, filter `{ type: 'lowpass', hz: 2600, q: 1.2, envAmount: 1.6, envDecay: 0.25 }`,
       `vibrato: { rate: 5.2, cents: 22, delay: 0.45 }`, `drive: 0.6`, `gain: 0.2`, `sends: { reverb: 1, delay: 1.5 }`.
     - `grand-piano`: name `Grand piano`, oscs `osc('triangle', 0, 0, 0.6), osc('sine', 1, 0, 0.25), osc('sawtooth', 0, 3, 0.15)`,
       `env(0.002, 2.6, 0, 0.45)`, filter `{ type: 'lowpass', hz: 1500, q: 0.6, envAmount: 3.5, envDecay: 0.5 }`,
       `gain: 0.32`, `sends: { reverb: 1.1, delay: 0.2 }`.
     - `cello`: name `Solo strings`, oscs `osc('sawtooth', 0, -4, 0.5), osc('sawtooth', 0, 4, 0.5)`,
       `env(0.18, 0.5, 0.85, 0.6)`, filter `{ type: 'lowpass', hz: 1900, q: 0.6, envAmount: 1, envDecay: 0.3 }`,
       `vibrato: { rate: 5, cents: 14, delay: 0.3 }`, `gain: 0.22`, `sends: { reverb: 1.2, delay: 0 }`.
     - `strings`: name `String section`, oscs `osc('sawtooth', 0, -9, 0.34), osc('sawtooth', 0, 0, 0.33), osc('sawtooth', 0, 9, 0.33)`,
       `env(0.6, 1, 0.85, 1.4)`, filter `{ type: 'lowpass', hz: 1800, q: 0.5, envAmount: 1, envDecay: 1 }`,
       `vibrato: { rate: 4.5, cents: 10, delay: 0.4 }`, `gain: 0.19`, `sends: { reverb: 1.4, delay: 0 }`.
     - `warm-bass`: name `Warm bass`, oscs `osc('sine', 0, 0, 0.6), osc('sawtooth', 0, 0, 0.4)`,
       `env(0.01, 0.4, 0.75, 0.2)`, filter `{ type: 'lowpass', hz: 650, q: 0.8, envAmount: 1.8, envDecay: 0.12 }`,
       `gain: 0.45`, `sends: { reverb: 0.15, delay: 0 }`.
     - `analog-synth`: name `Analog synth`, oscs `osc('sawtooth', 0, -6, 0.5), osc('pulse25', 0, 6, 0.5)`,
       `env(0.005, 0.35, 0.2, 0.3)`, filter `{ type: 'lowpass', hz: 1400, q: 3, envAmount: 3, envDecay: 0.18 }`,
       `gain: 0.16`, `sends: { reverb: 1, delay: 1.2 }`.
     - `synth-pad`: name `Analog pad`, oscs `osc('sawtooth', 0, -12, 0.5), osc('sawtooth', 0, 12, 0.5)`,
       `env(1.2, 1.5, 0.8, 2)`, filter `{ type: 'lowpass', hz: 1100, q: 1, envAmount: 1.5, envDecay: 2 }`,
       `vibrato: { rate: 0.4, cents: 6, delay: 0 }`, `gain: 0.16`, `sends: { reverb: 1.5, delay: 0.4 }`.
       (Not mapped to a role; songs pick it with `inst=synth-pad`.)
     - `studio-kit`: name `Studio kit`, drums `kick: { wave: 'sine', hz: 55, sweep: 2.2, sweepTime: 0.06, decay: 0.5, click: 0.25 }`,
       `snare: { noise: 'white', filter: 'bandpass', hz: 1800, toneHz: 180, decay: 0.22 }`,
       `hat: { noise: 'white', hz: 7000, decay: 0.05 }`, `crashDecay: 2.4`, `gain: 0.8`, `sends: { reverb: 0.9, delay: 0 }`.
   - `fx: { reverbSeconds: 3.2, reverbSend: 0.35, delayBeats: 0.75, delaySend: 0.22, delayFeedback: 0.38, crush: 0, lowpassHz: 15000, crackle: 0 }`
   - `lanes: ['#f2b55a', '#9ec3ff', '#e86a5c', '#c9d6df', '#8f7ad8', '#6fd3b5']`

### 5. Voices and engine (`src/audio/voices.ts`, `src/audio/engine.ts`)

1. `playSynth` gets a new last parameter `bends: { time: number; pitch: number }[] = []`.
2. Drive: when `patch.drive` is set and > 0, insert a `WaveShaperNode` (`oversample = '2x'`, curve
   from `driveCurve(patch.drive)`) between the oscillator level gains and the filter (or the env
   when there is no filter): `osc -> level -> shaper -> filter -> env`. Cache curves on the
   `VoiceKit` in a `Map<number, Float32Array>` keyed by amount, so a curve is built once. Push the
   shaper into `collected.nodes`.
3. Bends: for every oscillator, and for the FM modulator when `patch.fm` is set, schedule its
   `detune` param: `setValueAtTime(baseDetune, time)`, then for each bend in order, with `t =
   time + bend.time`, `cents = (bend.pitch - midi) * 100`, and the glide from `bendGlide(nextTime -
   bend.time)` (where `nextTime` is the next bend's time, or `duration` for the last):
   `setValueAtTime(<previous cents + baseDetune>, t)` then
   `linearRampToValueAtTime(cents + baseDetune, t + glide)`. `baseDetune` is the osc's
   `spec.detune` (0 for the modulator). The vibrato LFO stays connected to `detune` and adds on top.
   With no bends, keep the current `osc.detune.value = spec.detune` path unchanged.
4. `engine.ts` `scheduleNote`: pass `note.bends ?? []` to `playSynth`.

### 6. UI (`src/ui/ui.ts`, `src/ui/style.css`, `index.html`)

1. `ui.ts`: the band shortcut regex becomes `/^[1-6]$/`.
2. `style.css`: add `:root[data-style='cinematic']` tokens:
   `--bg: #0c1018; --panel: rgba(16, 20, 30, 0.88); --text: #eef1f6; --muted: #98a3b5; --accent: #f2b55a; --accent-2: #9ec3ff; --glow: #f2b55a;`
   and a background: `:root[data-style='cinematic'] body { background: radial-gradient(ellipse at 50% 20%, #26324a 0%, #0c1018 70%) fixed; }`.
3. `style.css`, inside `@media (max-width: 640px)`: change the band rule to `padding: 9px 0;
   font-size: 8px; letter-spacing: 0;` and change the comment `All four bands on one row.` to
   `All six bands on one row.`
4. `index.html` meta description: `five synth styles` → `six synth styles`.

### 7. Tests

1. `tests/song.test.ts`: add a `describe('bends', ...)` covering: a simple bend (`| G4/2^ A4/2 |`
   in a lead track gives one note of 3840 ticks with `bends: [{ at: 1920, pitch: 69 }]`); a chain
   (bend up and back); tie then bend; bend then tie; a bend across a bar line; notes without bends
   have no `bends` key; and each of the five errors in step 1.4 (match the message text).
2. `tests/timing.test.ts`: a bent note's `ScheduledNote.bends` has the right `time` in seconds at a
   known tempo (e.g. tempo 120, bend at 1920 ticks → 1 s), and an unbent note has no `bends` key.
3. `tests/curves.test.ts`: `bendGlide` (0.1 cap, half-segment, 0.005 floor); `driveCurve` (length,
   `[0] = -1`, last = 1, middle ≈ 0, odd symmetry, amount clamped).
4. `tests/styles.test.ts`: `STYLE_DEFS.cinematic.patches.guitar.drive` is 0.6, and every `drive` in
   any style is between 0 and 1. (The existing loops already cover the new style's roles and lanes.)

### 8. Docs

1. `docs/song-format.md`: header table style list adds `cinematic`; the note grammar line becomes
   "an optional tie or bend"; add a `## Bends` section after `## Ties` describing step 1.3–1.4 with
   the examples `G4/8^ A4/4` (bend up), `G4/8^ A4/8^ G4/4` (bend and release),
   `G4/4~ G4/4^ A4/2`, and the 0.1 s glide (shorter when the next bend is close). Add the five bend
   errors to "What the checker rejects".
2. `docs/sound.md`: "five styles" → "six styles"; add a `### Cinematic` section after `### Lo-fi`
   (piano, guitar with drive and long echo, strings, `synth-pad` via `inst=`); describe `drive` and
   bends (detune automation, `BEND_GLIDE`) where patch fields are described.
3. `docs/how-it-works.md`: "the five styles" → "the six styles" (both places).
4. `README.md`: "Five styles (Synthwave, Chiptune, Orchestral, Techno, Lo-fi)" → "Six styles
   (Synthwave, Chiptune, Orchestral, Techno, Lo-fi, Cinematic)"; shortcut "1–5 styles" → "1–6 styles".

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0 and the new bend, timing, curve, and style tests run.
- `git diff --stat -- src/songs` prints nothing (no song files changed).

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.
- `npm run check:songs` exits 0.
- `node tools/browser/layout.mjs` (with `npx vite preview --port 4173` running) reports no clipped
  bands and no scroll at any size.

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and
  report it; do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules.
- Existing songs must parse to identical `Song` objects; do not edit anything in `src/songs/`.
- Keep `src/music/`, `src/audio/styles.ts`, `src/audio/curves.ts` free of the DOM and Web Audio.
- Every voice still connects only through its track channel (`out`), never to the master chain.
- Match the surrounding code style (2-space indent, single quotes, the existing comment density).

## Out of scope

- Writing the Cinematic song (Claude composes it separately).
- Drawing bends on the score canvas.
- Any change to the arranger in `tools/`.

## If blocked

Stop, write what blocked you and the exact error to `.handoff/report.md`, and do not improvise a
different design.
