## Goal

Build Drumline Radio's sound engine, its 4 styles, and the player screen, on top of the existing song
parser (`src/song.ts`) and timing (`src/timing.ts`). The player looks like a hi-fi radio tuner: a
glowing readout and VU meters on top, a "living score" canvas in the middle that scrolls each track's
notes past a playhead, and a tuner dial below where songs are stations. A band switch picks the style
(remix), and each style recolours the whole page. Four short test songs ship with it.

## Files to touch

Create:
- `src/songs/neon-test-pattern.song`, `src/songs/pixel-postcard.song`, `src/songs/ninefold.song`,
  `src/songs/acid-test.song` (copied verbatim, see step 1)
- `src/library.ts`, `src/styles.ts`, `src/curves.ts`, `src/view.ts` (pure)
- `src/engine.ts`, `src/voices.ts` (Web Audio)
- `src/ui.ts`, `src/score.ts`, `src/dial.ts`, `src/meters.ts` (DOM / canvas)
- `src/style.css`
- `src/fonts/vt323-latin-400-normal.woff2`, `src/fonts/OFL-VT323.txt` (copied from
  `../drumline-studio/src/fonts/`)
- `tests/library.test.ts`, `tests/styles.test.ts`, `tests/curves.test.ts`, `tests/view.test.ts`
- `docs/sound.md`

Modify: `index.html`, `src/main.ts`, `README.md`, `AGENTS.md`.

Do not modify `src/song.ts`, `src/timing.ts`, `src/pitch.ts`, `src/roles.ts`, `BRIEF.md`, or any
existing test.

## Steps

### 1. Songs and library

1. Copy the four files in `.handoff/songs/` to `src/songs/` byte for byte (same names). Do not edit
   them.
2. `src/library.ts`:

   ```ts
   import { parseSong } from './song';
   import type { Song } from './song';

   const FILES = import.meta.glob('./songs/*.song', {
     query: '?raw', import: 'default', eager: true,
   }) as Record<string, string>;

   export interface LibraryEntry { id: string; song: Song; }
   export const LIBRARY: LibraryEntry[];      // all songs that parsed
   export const LIBRARY_ERRORS: string[];     // `${id}: ${error}` for every parse error
   ```

   `id` is the file name without folder and `.song`. Order: `public-domain` songs first, then
   `original`; within each group, by title (`localeCompare`).

### 2. Pure modules

**`src/curves.ts`**: port `softClipCurve()` and `crushCurve()` from
`../drumline-studio/src/audio.ts` (lines 51–74) with their constants (`SOFT_CLIP_KNEE = 0.7`,
`SOFT_CLIP_CEILING = 0.95`, `SOFT_CLIP_POINTS = 4097`, `CRUSH_STEPS = 24`, `CRUSH_POINTS = 4097`).
Also export:
- `pulseCoefficients(duty: number, harmonics: number): { real: Float32Array; imag: Float32Array }`:
  `real` all 0; `imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty)` for n = 1..harmonics,
  index 0 = 0. Arrays have length `harmonics + 1`.
- `velocityGain(velocity: number): number` = `(velocity / 127) ** 1.6`.
- `noteGain(patchGain: number, velocity: number, chordSize: number): number` =
  `patchGain * velocityGain(velocity) / Math.sqrt(Math.max(1, chordSize))`.

**`src/styles.ts`**: the four styles as data.

```ts
import type { Role, StyleId } from './roles';
import type { Track } from './song';

export type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pulse12' | 'pulse25';

export interface Osc { wave: Wave; octave: number; detune: number; level: number; }
export interface SynthPatch {
  kind: 'synth';
  name: string;                  // shown in the UI, e.g. "Saw lead"
  oscs: Osc[];
  env: { attack: number; decay: number; sustain: number; release: number };  // seconds, sustain 0..1
  filter?: { type: 'lowpass' | 'highpass' | 'bandpass'; hz: number; q: number;
             envAmount: number; envDecay: number };  // cutoff starts at hz*envAmount, falls to hz
  vibrato?: { rate: number; cents: number; delay: number };
  fm?: { ratio: number; index: number; decay: number };
  gain: number;
  sends: { reverb: number; delay: number };  // multipliers on the style's send levels
}
export interface DrumKit {
  kind: 'drums';
  name: string;
  kick: { wave: 'sine' | 'square' | 'triangle'; hz: number; sweep: number; sweepTime: number;
          decay: number; click: number };
  snare: { noise: 'white' | 'chip'; filter: 'bandpass' | 'highpass'; hz: number;
           toneHz: number; decay: number };
  hat: { noise: 'white' | 'chip' | 'metal'; hz: number; decay: number };
  crashDecay: number;
  gain: number;
  sends: { reverb: number; delay: number };
}
export type Patch = SynthPatch | DrumKit;

export interface StyleDef {
  id: StyleId;
  name: string;                  // "Synthwave", "Chiptune", "Orchestral", "Techno"
  blurb: string;
  roles: Record<Role, string>;   // role -> patch key
  patches: Record<string, Patch>;
  fx: { reverbSeconds: number; reverbSend: number; delayBeats: number; delaySend: number;
        delayFeedback: number; crush: number; lowpassHz: number };
  lanes: string[];               // 6 hex colours for score lanes, used in track order
}

export const STYLE_DEFS: Record<StyleId, StyleDef>;
export function resolvePatch(style: StyleDef, track: Pick<Track, 'role' | 'inst'>): Patch;
export function patchKey(style: StyleDef, track: Pick<Track, 'role' | 'inst'>): string;
```

`patchKey`: `track.inst` if it is a key of `style.patches`, else `style.roles[track.role]`.
`resolvePatch` returns `style.patches[patchKey(...)]`. Every `roles` entry for a pitched role points
at a `SynthPatch`; `roles.drums` points at a `DrumKit`.

Style data (use exactly; `sends` defaults to `{ reverb: 1, delay: 1 }` where not given; `detune` in
cents, `octave` in octaves; omitted `filter`/`vibrato`/`fm` = none):

Synthwave: blurb "Detuned saws, warm pads, and big gated drums under a neon sky."
fx `{ reverbSeconds: 2.8, reverbSend: 0.3, delayBeats: 0.75, delaySend: 0.2, delayFeedback: 0.35, crush: 0, lowpassHz: 18000 }`;
lanes `['#ff4fa3','#2de2e6','#ffb347','#b967ff','#f9f871','#ff6b6b']`.
- `saw-lead` "Saw lead": oscs saw 0/-8/0.5, saw 0/+8/0.5; env 0.01/0.3/0.7/0.25; filter lowpass 2400 q 2 envAmount 2.5 envDecay 0.25; vibrato 5.5/12/0.25; gain 0.32; sends reverb 1 delay 1.
- `square-lead` "Square lead": square 0/0/0.6, square 1/+4/0.2; env 0.01/0.2/0.6/0.2; filter lowpass 3000 q 1 envAmount 1.5 envDecay 0.2; gain 0.26.
- `warm-pad` "Warm pad": saw 0/-12/0.35, saw 0/+12/0.35, triangle -1/0/0.3; env 0.6/1/0.8/1.2; filter lowpass 1400 q 0.7 envAmount 1 envDecay 1; gain 0.22; sends reverb 1.4 delay 0.5.
- `poly-stab` "Poly stab": saw 0/-6/0.5, saw 0/+6/0.5; env 0.005/0.25/0.3/0.2; filter lowpass 1800 q 3 envAmount 3 envDecay 0.15; gain 0.22.
- `synth-bass` "Synth bass": saw 0/0/0.6, square -1/0/0.4; env 0.005/0.2/0.6/0.08; filter lowpass 500 q 4 envAmount 4 envDecay 0.12; gain 0.4; sends reverb 0.2 delay 0.
- `pluck` "Pluck": square 0/0/0.6, saw 1/+5/0.25; env 0.002/0.15/0/0.1; filter lowpass 2600 q 2 envAmount 2 envDecay 0.1; gain 0.2; sends reverb 1 delay 1.5.
- `gated-kit` "Gated kit": kick sine 55 sweep 3 sweepTime 0.12 decay 0.45 click 0.3; snare white bandpass 1800 toneHz 180 decay 0.25; hat white 7000 decay 0.05; crashDecay 1.6; gain 0.9; sends reverb 1.3 delay 0.
- roles: lead saw-lead, lead2 square-lead, counter square-lead, pad warm-pad, chords poly-stab, bass synth-bass, arp pluck, drums gated-kit.

Chiptune: blurb "Pulse-wave leads, a triangle bass, and crunchy noise drums."
fx `{ reverbSeconds: 0.8, reverbSend: 0.08, delayBeats: 0.5, delaySend: 0.12, delayFeedback: 0.25, crush: 0.35, lowpassHz: 12000 }`;
lanes `['#7cff4f','#4fd1ff','#ffd84f','#ff6f91','#c792ff','#ffffff']`.
- `pulse-lead` "Pulse lead": pulse12 0/0/1; env 0.002/0.1/0.8/0.06; vibrato 6/10/0.3; gain 0.22.
- `square-lead` "Square": square 0/0/1; env 0.002/0.1/0.7/0.05; gain 0.16.
- `square-pad` "Square pad": pulse25 0/0/1; env 0.02/0.3/0.6/0.2; gain 0.1.
- `pulse-chords` "Pulse chords": pulse25 0/0/1; env 0.002/0.15/0.4/0.05; gain 0.12.
- `triangle-bass` "Triangle bass": triangle 0/0/1; env 0.002/0.05/1/0.04; gain 0.5; sends reverb 0.3 delay 0.
- `pulse-arp` "Pulse arp": pulse12 0/0/1; env 0.001/0.08/0/0.03; gain 0.16.
- `chip-kit` "Noise kit": kick square 90 sweep 5 sweepTime 0.05 decay 0.1 click 0; snare chip highpass 1500 toneHz 0 decay 0.12; hat chip 3000 decay 0.035; crashDecay 0.6; gain 0.7; sends reverb 0.3 delay 0.
- roles: lead pulse-lead, lead2 square-lead, counter square-lead, pad square-pad, chords pulse-chords, bass triangle-bass, arp pulse-arp, drums chip-kit.

Orchestral: blurb "Strings, brass, woodwinds, harp, and timpani in a large hall."
fx `{ reverbSeconds: 3.5, reverbSend: 0.45, delayBeats: 0.75, delaySend: 0, delayFeedback: 0.2, crush: 0, lowpassHz: 14000 }`;
lanes `['#e8c27a','#c97b4a','#8fb8a8','#d9d2c3','#a77fb0','#7f9fd1']`.
- `strings` "Strings": saw 0/-7/0.34, saw 0/0/0.33, saw 0/+7/0.33; env 0.12/0.4/0.85/0.5; filter lowpass 3200 q 0.5 envAmount 1 envDecay 0.3; vibrato 5/14/0.3; gain 0.24; sends reverb 1.2 delay 0.
- `brass` "Brass": saw 0/0/0.7, saw 0/+5/0.3; env 0.06/0.3/0.8/0.25; filter lowpass 1200 q 1 envAmount 3 envDecay 0.25; vibrato 5/8/0.4; gain 0.26.
- `woodwind` "Woodwind": triangle 0/0/0.8, sine 1/0/0.2; env 0.05/0.2/0.8/0.15; vibrato 5.5/16/0.2; gain 0.3.
- `string-pad` "String pad": saw 0/-9/0.5, saw 0/+9/0.5; env 0.5/1/0.85/1.2; filter lowpass 1800 q 0.5 envAmount 1 envDecay 1; vibrato 4.5/10/0.4; gain 0.2; sends reverb 1.3 delay 0.
- `harp` "Harp": triangle 0/0/0.8, sine 1/0/0.2; env 0.002/1.2/0/0.6; gain 0.3.
- `low-strings` "Low strings": saw 0/-5/0.5, saw 0/+5/0.5; env 0.08/0.3/0.85/0.35; filter lowpass 900 q 0.7 envAmount 1 envDecay 0.3; gain 0.36; sends reverb 0.8 delay 0.
- `bells` "Bells": sine 0/0/1; fm ratio 3.5 index 2 decay 1.5; env 0.002/1.8/0/1; gain 0.2.
- `orchestra-kit` "Timpani & cymbals": kick sine 70 sweep 1.15 sweepTime 0.08 decay 1.1 click 0; snare white bandpass 2500 toneHz 200 decay 0.18; hat white 8000 decay 0.06; crashDecay 2.5; gain 0.85; sends reverb 1.2 delay 0.
- roles: lead strings, lead2 brass, counter woodwind, pad string-pad, chords harp, bass low-strings, arp bells, drums orchestra-kit.

Techno: blurb "Squelchy acid lines, dark pads, and a pounding four-on-the-floor kit."
fx `{ reverbSeconds: 1.6, reverbSend: 0.15, delayBeats: 0.75, delaySend: 0.18, delayFeedback: 0.4, crush: 0, lowpassHz: 20000 }`;
lanes `['#c6ff00','#ff2a2a','#00e5ff','#ff9100','#f5f5f5','#d500f9']`.
- `acid` "Acid": saw 0/0/1; env 0.003/0.18/0.3/0.06; filter lowpass 380 q 14 envAmount 7 envDecay 0.14; gain 0.24; sends reverb 0.6 delay 1.
- `square-stab` "Square stab": square 0/0/0.7, square 0/+7/0.3; env 0.003/0.12/0.2/0.08; filter lowpass 1600 q 4 envAmount 3 envDecay 0.08; gain 0.18.
- `fm-pluck` "FM pluck": sine 0/0/1; fm ratio 2 index 3 decay 0.2; env 0.002/0.3/0/0.15; gain 0.24.
- `dark-pad` "Dark pad": saw 0/-10/0.5, saw 0/+10/0.5; env 1/1.5/0.8/1.5; filter lowpass 700 q 2 envAmount 1.5 envDecay 1.5; gain 0.2; sends reverb 1.5 delay 0.5.
- `stab` "Chord stab": saw 0/-8/0.5, saw 0/+8/0.5; env 0.002/0.18/0/0.12; filter lowpass 1500 q 5 envAmount 4 envDecay 0.1; gain 0.2; sends reverb 1 delay 1.3.
- `sub-bass` "Sub bass": sine 0/0/0.85, square 1/0/0.15; env 0.003/0.15/0.8/0.05; filter lowpass 600 q 1 envAmount 1 envDecay 0.1; gain 0.5; sends reverb 0 delay 0.
- `acid-arp` "Acid arp": saw 0/0/1; env 0.002/0.1/0/0.04; filter lowpass 900 q 10 envAmount 5 envDecay 0.08; gain 0.18.
- `909-kit` "909 kit": kick sine 50 sweep 4 sweepTime 0.08 decay 0.38 click 0.5; snare white bandpass 2000 toneHz 190 decay 0.2; hat metal 8000 decay 0.04; crashDecay 1.6; gain 0.9; sends reverb 0.4 delay 0.
- roles: lead acid, lead2 square-stab, counter fm-pluck, pad dark-pad, chords stab, bass sub-bass, arp acid-arp, drums 909-kit.

(Notation above: `saw 0/-8/0.5` means `{ wave: 'sawtooth', octave: 0, detune: -8, level: 0.5 }`;
env `a/d/s/r`; vibrato `rate/cents/delay`.)

**`src/view.ts`**: pure helpers for the UI.
- `formatTime(seconds: number): string` → `m:ss` (floor; 0 → `0:00`, 61.9 → `1:01`, 600 → `10:00`;
  negative → `0:00`).
- `stationLabel(index: number): string` → `(88.1 + index * 2.2).toFixed(1)` (0 → `88.1`, 3 → `94.7`).
- `prevAction(position: number): 'restart' | 'previous'` → `'restart'` when position > 3, else
  `'previous'`.
- `export interface Lane { track: number; top: number; height: number; low: number; high: number;
  rows: number[] | null; }` and `laneLayout(song: Song, height: number): Lane[]`: one lane per track,
  equal heights, stacked top to bottom in track order (`top = i * height / n`). For pitched tracks
  `low`/`high` = the track's lowest and highest pitch padded by 2 semitones each way (a track with no
  notes uses 58..62) and `rows = null`. For drums tracks `rows` = the distinct pitches used, sorted
  descending, and `low`/`high` = min/max of them.
- `noteY(lane: Lane, pitch: number): number` → the y of the top of the note bar. Pitched: maps `high`
  to `lane.top + 4` and `low` to `lane.top + lane.height - 4 - barH` linearly, where
  `barH = noteHeight(lane)`. Drums: row `i` of `rows` at
  `lane.top + 4 + i * (lane.height - 8) / rows.length`.
- `noteHeight(lane: Lane): number` → pitched: `max(3, min(10, (lane.height - 8) / (high - low + 1)))`;
  drums: `max(3, (lane.height - 8) / rows.length - 2)`.
- `nearestStation(centers: number[], x: number): number` → index of the center closest to x
  (ties → lower index; empty array → -1).

### 3. Audio

**`src/voices.ts`**: functions that build one note's audio graph. Each returns a `Voice`:

```ts
export interface Voice { end: number; stop(at: number): void; }
export interface VoiceKit {
  ctx: AudioContext;
  noise: { white: AudioBuffer; chip: AudioBuffer; metal: AudioBuffer };
  pulse12: PeriodicWave; pulse25: PeriodicWave;
}
export function createVoiceKit(ctx: AudioContext): VoiceKit;
export function playSynth(kit: VoiceKit, patch: SynthPatch, midi: number, time: number,
  duration: number, gain: number, out: AudioNode): Voice;
export function playDrum(kit: VoiceKit, drums: DrumKit, gm: number, time: number,
  gain: number, out: AudioNode): Voice;
```

- `createVoiceKit`: noise buffers 1 s long, mono. `white` = `Math.random()*2-1`. `chip` and `metal`
  exactly as in `../drumline-studio/src/audio.ts` lines 262–284 (seeded noise with
  `CHIP_NOISE_HOLD = 14`, seed 7; `METAL_HZ` square-sum recipe); port `seededNoise` from line 76.
  `pulse12`/`pulse25` from `pulseCoefficients(0.125, 32)` and `pulseCoefficients(0.25, 32)`.
- `playSynth`: `freq = midiToFreq(midi)`. One envelope `GainNode`: value 0 at `time`, linear ramp to
  `gain` at `time + attack`, `setTargetAtTime(gain * sustain, time + attack, decay / 3)`; release at
  `relStart = time + max(duration, attack)`: `cancelAndHoldAtTime(relStart)` is not used — instead
  call `setTargetAtTime(0, relStart, release / 3)`. `end = relStart + release + 0.1`. Each `Osc` is an
  `OscillatorNode` (pulse waves via `setPeriodicWave`) at `freq * 2 ** octave`, `detune` set, into
  its own level `GainNode`, then into the filter (if any) else the envelope. Filter: `BiquadFilterNode`
  of `type`, `Q = q`, frequency starts at `min(hz * envAmount, 18000)` at `time` and
  `setTargetAtTime(hz, time, envDecay / 3)`. Vibrato: one LFO oscillator (`rate`) into a gain whose
  value goes 0 → `cents` (linear ramp from `time + delay` to `time + delay + 0.2`), connected to every
  oscillator's `detune`. FM: one sine modulator at `freq * ratio`, into a gain starting at
  `freq * index` with `setTargetAtTime(freq * index * 0.05, time, decay / 3)`, connected to every
  oscillator's `frequency`. Envelope → `out`. Start all sources at `time`, stop at `end`. When the
  last oscillator ends (`onended`), disconnect every node of the voice. `stop(at)`: ramp the envelope
  to 0 over 0.03 s from `at` (`cancelScheduledValues(at)`, `setValueAtTime(current, at)`,
  `linearRampToValueAtTime(0, at + 0.03)`) and stop sources at `at + 0.05`.
- `playDrum` by General MIDI number (anything else is ignored and returns a voice with `end = time`):
  - 36 kick: oscillator `kick.wave`, frequency `kick.hz * kick.sweep` → exponential ramp to `kick.hz`
    over `sweepTime`; gain `gain` → exponential ramp to 0.001 over `decay`. If `click > 0`, also a
    5 ms white-noise burst through a 2500 Hz highpass at `gain * click`.
  - 38 snare: noise buffer `snare.noise` through a `BiquadFilter` (`snare.filter`, `snare.hz`, Q 0.8),
    gain `gain * 0.8` → 0.001 over `snare.decay`. If `toneHz > 0`, plus a triangle at `toneHz`, gain
    `gain * 0.5` → 0.001 over `decay * 0.5`.
  - 42 closed hat: noise `hat.noise` through a highpass at `hat.hz`, gain `gain * 0.45` → 0.001 over
    `hat.decay`. 46 open hat: same with decay `hat.decay * 6`.
  - 49 crash: white noise + metal noise (each gain 0.5) through a highpass 5000 Hz, gain `gain * 0.5`
    → 0.001 over `crashDecay`. 51 ride: metal noise through a bandpass 7000 Hz Q 1, gain
    `gain * 0.3` → 0.001 over 0.6 s.
  - 41 / 45 / 50 toms: sine from `hz * 1.6` → `hz` over 0.06 s (hz 90 / 130 / 180), gain → 0.001
    over 0.35 s.
  - 39 clap: white noise through a bandpass 1100 Hz Q 1.2; gain envelope with three bursts at
    `time`, `+0.01`, `+0.02` (each jumps to `gain * 0.7` and falls to 0.1 × that in 8 ms), then a tail
    from `+0.03` falling to 0.001 over 0.15 s.
  - 37 rim: square 1800 Hz, gain `gain * 0.4` → 0.001 over 0.03 s.
  - Buffer sources start at `time` with a random offset in the buffer (0..0.5 s) so repeats differ.
  - `end` = time + longest decay + 0.05; cleanup and `stop` as in `playSynth`.

**`src/engine.ts`**:

```ts
export class Engine {
  constructor(ctx: AudioContext);
  load(song: Song): void;            // stops voices, builds the timeline, style = song.meta.style, position 0, paused
  get song(): Song | null;
  get timeline(): Timeline | null;
  setStyle(id: StyleId): void;       // applies to notes scheduled from now on, and to fx
  get style(): StyleId;
  play(): void;                      // resumes the AudioContext if suspended
  pause(): void;
  seek(seconds: number): void;       // clamps to [0, duration]; keeps playing if it was
  get playing(): boolean;
  get position(): number;            // song seconds
  get duration(): number;
  onEnded: (() => void) | null;
  levels(): [number, number];        // RMS of the left/right outputs, 0..1
  setVolume(value: number): void;    // 0..1, default 0.8
}
```

- Graph: per track a channel `GainNode` (`track.vol`) → `StereoPannerNode` (`track.pan`) → `mix`
  bus. Each channel also feeds a reverb send gain and a delay send gain
  (`style.fx.reverbSend * patch.sends.reverb`, `style.fx.delaySend * patch.sends.delay`, for the
  track's resolved patch). Reverb: `ConvolverNode` with a generated stereo impulse
  (`reverbSeconds` long, noise × `exp(-4 i / length)`, as `createReverbImpulse` in
  `../drumline-studio/src/audio.ts` line 312), cached per length. Delay: `DelayNode` (max 2 s),
  time `delayBeats * 60 / song.meta.tempo`, feedback gain `delayFeedback`. Reverb and delay outputs →
  `mix`.
- `mix` (gain 0.7) → crush crossfade (dry gain `1 - crush`, wet gain `crush` through a
  `WaveShaper` with `crushCurve()`) → lowpass `BiquadFilter` (`lowpassHz`, Q 0.7) → compressor
  (`DynamicsCompressor`: threshold -18, knee 6, ratio 3, attack 0.01, release 0.25) → limiter
  (threshold -3, knee 0, ratio 20, attack 0.003, release 0.15) → soft clip (`WaveShaper`,
  `softClipCurve()`, oversample `'4x'`) → volume gain → `ctx.destination`. The soft clip output also
  goes to a `ChannelSplitter` feeding two `AnalyserNode`s (fftSize 1024) for `levels()`.
- Style changes set fx params with `setTargetAtTime(value, now, 0.05)` and swap the reverb buffer.
- Scheduling: a `setInterval` every 25 ms while playing. Song time maps to context time as
  `ctxTime = startCtx + (songTime - startPos)`. Each tick schedules every note from
  `notesBetween(timeline, scheduledUntil, position + 0.12)`, then sets `scheduledUntil` to
  `position + 0.12`. On `play()` from position p, `scheduledUntil = p` (notes that started before p
  are skipped). For each scheduled note: patch = `resolvePatch(STYLE_DEFS[style], track)`; drums
  tracks call `playDrum` once per pitch, others `playSynth` once per pitch, with
  `gain = noteGain(patch.gain, note.velocity, note.pitches.length)`, into the track's channel. Keep
  live voices in a `Set`; remove each when its time passes `end` (check every tick).
- `pause()`/`seek()`/`load()`: call `stop(ctx.currentTime)` on all live voices and clear the set.
- When `position >= duration + 0.5` while playing: stop the interval, set position to `duration`,
  mark paused, and call `onEnded`.
- No DOM access in `engine.ts` or `voices.ts`.

### 4. Player UI

**`index.html`** body (keep the head; add `<meta name="theme-color" content="#14101f">` and
`<meta name="description" content="Drumline Radio plays full songs, arranged and composed by Claude, through four synth styles.">`):

```html
<div id="app" class="radio">
  <header class="faceplate">
    <div class="brand">Drumline <span>Radio</span></div>
    <div class="readout" aria-live="polite">
      <div id="title" class="readout-title">Drumline Radio</div>
      <div id="subtitle" class="readout-sub">Press play</div>
    </div>
    <canvas id="meters" class="meters" width="120" height="48" aria-hidden="true"></canvas>
  </header>
  <main class="stage">
    <canvas id="score" class="score" aria-label="Scrolling score of the current song"></canvas>
    <div id="style-banner" class="style-banner"></div>
  </main>
  <section class="tuner" aria-label="Stations">
    <div class="dial-wrap">
      <div id="dial" class="dial" tabindex="0" aria-label="Tuner dial. Use left and right arrows to change station."></div>
      <div class="needle" aria-hidden="true"></div>
    </div>
    <div class="transport">
      <button id="prev" class="knob" type="button" aria-label="Previous song">⏮</button>
      <button id="play" class="knob knob-main" type="button" aria-label="Play">▶</button>
      <button id="next" class="knob" type="button" aria-label="Next song">⏭</button>
      <span id="elapsed" class="time">0:00</span>
      <input id="seek" class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">
      <span id="total" class="time">0:00</span>
    </div>
    <div id="bands" class="bands" role="radiogroup" aria-label="Style"></div>
  </section>
</div>
<script type="module" src="/src/main.ts"></script>
```

**`src/main.ts`**: imports `./style.css`, then calls `startUi()` from `./ui`. Nothing else.

**`src/ui.ts`** `startUi()`:
- Reads `LIBRARY`. If `LIBRARY_ERRORS` is non-empty, `console.error` each.
- Creates the `AudioContext` and `Engine` lazily on the first user gesture (play, station click,
  band click, or key). Before that, the UI shows the first song as selected with "Press play".
- State: `current` (library index), the engine. Loading a song: `engine.load(song)`, set
  `document.documentElement.dataset.style` to the engine style, update the readout, bands, dial,
  total time.
- Readout: `#title` = song title; `#subtitle` = `${composer} · ${year} · ${style name}` and, when the
  style differs from the song's own, ` (remix)` after the style name.
- Play button toggles play/pause; its text is `▶` or `❚❚` and its `aria-label` "Play"/"Pause".
- Prev: `prevAction(engine.position)` → restart (seek 0) or previous station (wraps). Next: next
  station (wraps). After a song ends (`onEnded`), go to the next station and play.
- Seek input: while not being dragged, `value = position / duration * 1000` each frame; on `input`,
  `engine.seek(value / 1000 * duration)`. `#elapsed`/`#total` use `formatTime`.
- Bands: one `button role="radio"` per style in `STYLES` order, label = style name; the active one has
  `aria-checked="true"`; the song's own style shows a small `★` before its name. Clicking sets the
  engine style and `dataset.style`, and updates the readout. Arrow keys inside the group move between
  bands.
- Keyboard (on `document`, ignored when focus is in the seek input): Space = play/pause,
  ArrowLeft/ArrowRight = previous/next station, `1`–`4` = band.
- A single `requestAnimationFrame` loop updates the score, meters, seek bar, and times.
- Style banner (`#style-banner`): on every style change, shows the style name and blurb for 2.5 s
  (CSS fade via a `show` class), then hides.

**`src/dial.ts`**: `createDial(el: HTMLElement, songs: LibraryEntry[], onTune: (index: number) => void)`
returns `{ select(index: number, smooth: boolean): void; tuning(): boolean }`.
- The dial is a horizontal strip that scrolls (`overflow-x: auto`, hidden scrollbar) with left and
  right padding of 50% so any station can sit under the fixed centre needle. Inside: a frequency
  scale (tick marks every 0.2 "MHz" with numbers every 2.0, drawn with CSS
  `repeating-linear-gradient`s on a full-width element) and one `button.station` per song, spaced
  160 px apart, showing `stationLabel(i)` and the song title under it. Group captions above the
  stations: "Classics" over the public-domain stations and "Originals" over the original ones; a
  caption is omitted when its group is empty.
- Clicking a station: `select(i, true)` then `onTune(i)`.
- Dragging with the mouse (pointer events on the strip) scrolls it; touch uses native scrolling.
  Mouse wheel scrolls horizontally (`deltaY` → `scrollLeft`).
- When scrolling stops (no `scroll` event for 160 ms) and the scroll was caused by the user (not by
  `select`), snap: find `nearestStation(stationCenters, needleX)`, `select(i, true)`, and call
  `onTune(i)` if it differs from the current station.
- `tuning()` is true while the user is scrolling and the nearest station's centre is more than 24 px
  from the needle. The current station button gets class `active`.
- Arrow keys on the focused dial: previous/next station (`select` + `onTune`).

**`src/score.ts`**: `createScore(canvas: HTMLCanvasElement)` returns
`{ draw(timeline: Timeline | null, position: number, style: StyleDef, tuning: boolean): void }`.
- Size the canvas to its CSS box × `devicePixelRatio` on every draw where the size changed.
- Window: 2 s of past and 6 s of future; the playhead sits at 25% of the width. `x(t) =
  playheadX + (t - position) * pxPerSecond`, `pxPerSecond = width * 0.75 / 6`.
- Background: transparent (the page background shows through). Faint vertical lines at each bar
  start in the window (`rgba(255,255,255,0.08)`), slightly stronger every 4th bar (0.16).
- Lanes from `laneLayout(song, height)`; a 1 px separator between lanes (`rgba(255,255,255,0.06)`);
  the patch name (`resolvePatch(...).name`) at the lane's top-left in 11px `system-ui` at 50% opacity.
- Notes: query `notesBetween(timeline, position - 2 - 8, position + 6)` and draw those visible
  (`x(start + duration) >= 0` and `x(start) <= width`). Colour = `style.lanes[track % 6]`. Each pitch
  of a note is a rounded rect (radius 2) at `noteY`, height `noteHeight`, width
  `max(2, duration * pxPerSecond)`. Notes not sounding are drawn at `globalAlpha 0.45`; notes
  sounding now (`start <= position < start + duration`) at alpha 1 with `shadowBlur 12` in the same
  colour.
- Playhead: a 2 px vertical line in `rgba(255,255,255,0.7)`.
- When `tuning` is true, draw radio static over everything: 1500 random 2×2 px grey dots at alpha
  0.5, new each frame.
- With no timeline, draw only the playhead.

**`src/meters.ts`**: `createMeters(canvas: HTMLCanvasElement)` returns
`{ draw(levels: [number, number], accent: string): void }`. Two horizontal LED bars (L over R), 16
segments each, lit count = `round(min(1, level * 3) * 16)`; segments 0–10 in `accent`, 11–13 in
`#ffd84f`, 14–15 in `#ff4f4f`; unlit segments at alpha 0.15. Draw `L`/`R` labels in VT323. Peak
hold: the highest lit segment stays for 0.6 s.

**`src/style.css`**:
- `@font-face` `VT323` from `./fonts/vt323-latin-400-normal.woff2`. UI text uses
  `system-ui, -apple-system, 'Segoe UI', sans-serif`; the readout, times, and station labels use
  `'VT323', monospace`.
- Colour tokens on `:root` and per style under `:root[data-style='...']`: `--bg`, `--panel`
  (faceplate/tuner background), `--text`, `--muted`, `--accent`, `--accent-2`, `--glow`. Values:
  - synthwave: bg `#12002b`, panel `rgba(20,6,40,0.82)`, text `#fbe9ff`, muted `#b59ac9`,
    accent `#ff4fa3`, accent-2 `#2de2e6`, glow `#ff4fa3`.
  - chiptune: bg `#0b0f14`, panel `rgba(10,16,12,0.9)`, text `#d8ffd0`, muted `#7fa07a`,
    accent `#7cff4f`, accent-2 `#4fd1ff`, glow `#7cff4f`.
  - orchestral: bg `#1a120b`, panel `rgba(38,26,16,0.88)`, text `#f3e6cc`, muted `#b29f80`,
    accent `#e8c27a`, accent-2 `#c97b4a`, glow `#e8c27a`.
  - techno: bg `#050505`, panel `rgba(14,14,14,0.92)`, text `#f0f0f0`, muted `#8a8a8a`,
    accent `#c6ff00`, accent-2 `#ff2a2a`, glow `#c6ff00`.
  - `:root` defaults = synthwave. `color-scheme: dark`.
- `body` background per style (fixed, full viewport), with `transition: background 0.6s`:
  - synthwave: a sunset — `linear-gradient(#12002b 0%, #2a0750 45%, #6b1a6e 62%, #ff4fa3 72%, #12002b 72.2%)`
    plus a sun (`radial-gradient(circle at 50% 66%, #ffb347 0 9%, transparent 9.2%)`), and a
    `body::after` perspective grid on the lower 28% (`repeating-linear-gradient`s of 1 px
    `rgba(45,226,230,0.35)` lines every 40 px both ways, `transform: perspective(300px) rotateX(60deg)`,
    `transform-origin: top`).
  - chiptune: `--bg` plus `body::after` scanlines (`repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 1px, transparent 1px 3px)`)
    over everything, `pointer-events: none`.
  - orchestral: `radial-gradient(ellipse at 50% 30%, #3a2716, #1a120b 70%)`.
  - techno: `--bg` plus `body::after` flash layer, `background: var(--accent)`, opacity driven by
    the CSS variable `--flash` (0..0.12), set by `ui.ts` each frame: 0.12 for 60 ms after any kick
    (GM 36) in a drums track starts, otherwise 0. Only in techno.
  - `body::after` is `position: fixed`, `pointer-events: none`, `z-index: 0`; `#app` is
    `position: relative; z-index: 1`.
- Layout: `#app` is a column filling `100dvh`, max width 1100 px, centred, 16 px side padding.
  `.faceplate` (top) and `.tuner` (bottom) are panels: `--panel` background, 12 px radius, 1 px
  border `rgba(255,255,255,0.08)`, `backdrop-filter: blur(6px)`. `.stage` takes the remaining height
  (min 240 px) and holds the score canvas at 100% × 100%.
- `.brand`: uppercase, letter-spacing 0.2em, 13px, `--muted`; its `span` in `--accent`.
- `.readout`: dark inset box (`#05030a`, inset shadow), title 30px VT323 in `--accent` with
  `text-shadow: 0 0 8px var(--glow)`, subtitle 18px VT323 in `--muted`; title truncates with ellipsis.
- `.dial-wrap`: `position: relative`, height 96px, inset dark background. `.needle`: absolute,
  centred, 2 px wide, full height, `--accent-2` with glow. `.station`: transparent, no border,
  `--muted` text, VT323 20px label + 13px title under it; `.station.active` in `--accent` with glow.
- `.transport`: row with gap 12px. `.knob`: 44 px circle, radial-gradient metal look
  (`#3a3a44` → `#15151b`), 1 px border, `--text`; `.knob-main` 56 px with `--accent` text.
  `.seek`: flex 1, `accent-color: var(--accent)`.
- `.bands`: row of 4 buttons styled as hi-fi push buttons (rectangular, 6 px radius, inset dark,
  uppercase 12px); `[aria-checked='true']` lit with `--accent` text, `box-shadow: 0 0 10px var(--glow)`.
- `.style-banner`: centred over the stage, panel look, opacity 0 → 1 with `.show`
  (`transition: opacity 0.4s`), `pointer-events: none`; name in VT323 32px `--accent`, blurb 14px.
- Focus: visible `outline: 2px solid var(--accent-2)` on `:focus-visible`.
- Narrow screens (`max-width: 640px`): faceplate stacks (brand, readout, meters in a column);
  readout title 24px; stations 130 px apart; knobs stay ≥ 44 px; bands wrap into 2 × 2. No horizontal
  page scroll at 360 px wide.
- `prefers-reduced-motion: reduce`: no techno flash, no banner transition.

### 5. Tests

- `tests/library.test.ts`: `LIBRARY_ERRORS` is `[]`; `LIBRARY.length` is 4; ids are
  `['acid-test', 'neon-test-pattern', 'ninefold', 'pixel-postcard']` in that order (all original, so
  sorted by title: Acid Test, Neon Test Pattern, Ninefold, Pixel Postcard); `ninefold`'s first bar
  has time `[9, 8]` and its bar 9 has time `[6, 8]`; each song's style is the one in its file
  (`techno`, `synthwave`, `orchestral`, `chiptune`).
- `tests/styles.test.ts`: every style in `STYLES` has a `STYLE_DEFS` entry with that id; every role
  in `ROLES` maps to an existing patch key; pitched roles resolve to `kind: 'synth'`, `drums` to
  `kind: 'drums'`; every synth patch has at least one osc, `env.attack > 0`, and `gain` in (0, 1];
  every style has 6 lanes; `resolvePatch` uses `inst` when it names a patch in the style
  (`{ role: 'lead', inst: 'brass' }` in orchestral → name "Brass") and falls back to the role when it
  does not (`{ role: 'lead', inst: 'brass' }` in techno → name "Acid"; `inst: null` → role patch).
- `tests/curves.test.ts`: `softClipCurve()` length 4097, value at the centre 0, at the ends
  ±(≤ 0.95), and identity at input 0.5 (index 3072 → 0.5 within 1e-3); `crushCurve()` length 4097
  with at most 49 distinct values; `pulseCoefficients(0.125, 32)`: lengths 33, `imag[0] = 0`,
  `imag[1]` ≈ `(2/π)·sin(π/8)`; `velocityGain(127) = 1`, `velocityGain(0) = 0`;
  `noteGain(0.5, 127, 4) = 0.25`.
- `tests/view.test.ts`: the `formatTime`, `stationLabel`, `prevAction` examples above;
  `nearestStation([0, 160, 320], 250) = 2`, `([0,160,320], 80) = 0`, `([], 5) = -1`;
  `laneLayout` on the parsed `tests/fixtures/features.song` (import with `?raw`) at height 300: 3
  lanes with tops 0/100/200 and heights 100; lane 0 low 58 high 86 rows null; lane 2 rows
  `[49, 42, 38, 36]`; `noteY` of lane 0 at pitch 86 = 4; `noteY` of lane 2 for pitch 38 =
  `200 + 4 + 2 * (92 / 4)`.

### 6. Docs

- `docs/sound.md`: plain language. How the engine schedules notes ahead on the audio clock; how a
  track's role and optional `inst` pick a patch in the current style, and how remix swaps styles;
  a table per style of role → patch name; the master chain (mix → crush → lowpass → compressor →
  limiter → soft clip → volume); and where to add a patch or a style.
- `README.md`: replace the "So far…" paragraph with a short feature list (tuner dial of stations,
  living score, VU meters, four styles with remix by band button, keyboard shortcuts: Space, ←/→,
  1–4). Add a "Songs" section listing the four songs as Claude originals with their styles, and a
  line that public-domain songs will be credited here. Keep the rest. Link `docs/sound.md`.
- `AGENTS.md`: add to "Read before changing": `- Sound, styles, or patches: [docs/sound.md](docs/sound.md)`.
  Add `src/library.ts`, `src/styles.ts`, `src/curves.ts`, and `src/view.ts` to the list of files
  that stay free of the DOM and audio. Add rules: "`src/engine.ts` and `src/voices.ts` don't touch
  the DOM." and "Every voice connects to its track's channel in `engine.ts`, never straight to the
  master chain, so track volume, pan, and sends cover everything." and "Every song in `src/songs/`
  must parse with no errors; `tests/library.test.ts` checks this."

## Acceptance

- `npm run typecheck` exits 0.
- `npm run test:sandbox` exits 0 and reports 7 passed test files.
- `node -e "const fs=require('fs');for(const f of fs.readdirSync('.handoff/songs')){if(!fs.readFileSync('.handoff/songs/'+f).equals(fs.readFileSync('src/songs/'+f)))process.exit(1)}"` exits 0.
- `git diff --exit-code -- src/song.ts src/timing.ts src/pitch.ts src/roles.ts BRIEF.md tests/song.test.ts tests/timing.test.ts tests/pitch.test.ts` exits 0.
- `node -e "const s=require('fs').readFileSync('src/engine.ts','utf8')+require('fs').readFileSync('src/voices.ts','utf8');process.exit(/document\.|window\./.test(s)?1:0)"` exits 0.

Verifier only:
- `npm test` exits 0.
- `npm run build` exits 0.
- Headless Edge check of the built site (done by the verifier).

## Parallel work

None — do it sequentially.

## Constraints

- Do not commit, push, or switch branches.
- Do not touch files outside **Files to touch** except `.handoff/report.md`.
- No runtime dependencies; do not add or change devDependencies.
- Copy the song files exactly; never edit notes to make a test pass.
- No `innerHTML` with song data; build DOM with `createElement` and `textContent`.
- Do not run the `Verifier only:` commands. If any command fails with `spawn EPERM`, stop and report
  it. Do not request wider sandbox access, set `NODE_OPTIONS`, or stub modules to get past it.

## Out of scope

- New songs, public-domain arrangements, sampled instruments, saving settings, share links,
  screenshots in the README.

## If blocked

- If a test expectation above disagrees with the code and you believe the expectation is wrong,
  leave that test failing and explain it in the report instead of changing the expectation.
- If a Web Audio method named above is missing from the TypeScript DOM types, use the closest typed
  equivalent and say so in the report.
