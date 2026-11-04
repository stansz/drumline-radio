# Sound

Drumline Radio plays every song with a small Web Audio synth. There are no samples and no runtime
dependencies: oscillators, noise buffers, filters, and effects are built from the browser's audio
nodes.

## Scheduling

The audio clock is the master clock. `src/audio/engine.ts` turns the parsed score into a timeline of
seconds (`buildTimeline` in `src/music/timing.ts`), then every 25 ms it looks 120 ms ahead and schedules
the notes that start in that window on the `AudioContext` clock. Scheduled notes are never touched
again: the Web Audio engine plays them at the exact time they were given. Pausing, seeking, or
loading another song stops every live voice, so the next `play()` starts a fresh schedule from the
current position.

Each track gets its own channel: volume and pan from the song file, plus reverb and delay sends.
Every voice connects to that channel, never straight to the master chain, so the track's volume,
pan, and effects cover all of its notes.

## Patches and styles

A style is a set of patches plus the settings of the shared effects. A patch is either a synth
(oscillators, envelope, filter, vibrato, FM, and send levels) or a drum kit (kick, snare, hats,
cymbals, and toms). `src/audio/styles.ts` holds the five styles as data.

A track picks its patch in this order:

1. If the track header names an instrument with `inst=` and the current style has a patch with
   that name, the track uses it.
2. Otherwise it uses the patch for the track's `role`.

That is what makes remixes work. The score stores roles, not instruments, so switching the style
(by pressing a band button) re-reads the same notes with the new style's patches. The readout adds
`(remix)` when the style differs from the one named in the song file.

### Synthwave

| Role | Patch |
| --- | --- |
| lead | Saw lead |
| lead2 | Square lead |
| counter | Square lead |
| pad | Warm pad |
| chords | Poly stab |
| bass | Synth bass |
| arp | Pluck |
| drums | Gated kit |

### Chiptune

| Role | Patch |
| --- | --- |
| lead | Pulse lead |
| lead2 | Square |
| counter | Square |
| pad | Square pad |
| chords | Pulse chords |
| bass | Triangle bass |
| arp | Pulse arp |
| drums | Noise kit |

### Orchestral

| Role | Patch |
| --- | --- |
| lead | Strings |
| lead2 | Brass |
| counter | Woodwind |
| pad | String pad |
| chords | Harp |
| bass | Low strings |
| arp | Bells |
| drums | Timpani & cymbals |

### Techno

| Role | Patch |
| --- | --- |
| lead | Acid |
| lead2 | Square stab |
| counter | FM pluck |
| pad | Dark pad |
| chords | Chord stab |
| bass | Sub bass |
| arp | Acid arp |
| drums | 909 kit |

### Lo-fi

The Lo-fi style is mellow keys, a round bass, and a dusty swung kit. Its tape wobble comes from the
slow vibrato on its patches, and its vinyl bed is a looping crackle buffer whose level is the style's
`fx.crackle`.

## Master chain

All tracks meet at the mix bus and pass through:

mix -> crush crossfade -> lowpass -> compressor -> makeup gain -> limiter -> soft clip -> volume -> speakers

- **Crush** is a dry/wet crossfade with a bit-crush wave shaper. The wet level is applied after the
  shaper, so quiet music still uses enough of its steps not to buzz. Only Chiptune uses it.
- **Lowpass** is the style's ceiling for the whole mix.
- **Compressor** (threshold -20 dB, ratio 3) evens out loudness between songs, the **makeup gain**
  (×1.4) brings them up to normal music loudness, and the **limiter** (threshold -3 dB) catches peaks.
- **Soft clip** is a final safety net: it leaves the signal untouched below 0.85 and never lets the
  output exceed 0.95.
- **Volume** follows the volume slider: the slider's 0–100 is squared into a gain of 0 to 1, so
  it feels even to the ear, and mute sets it to 0. The default is 100.

The soft clip output also feeds two analysers, one per channel, which is where the VU meters get
their levels.

## Adding a patch or a style

- Add a synth patch with `synth({...})` or a drum kit with `drums({...})` in `src/audio/styles.ts`, then
  point a role at it in that style's `roles` map. A song can also reach an extra patch by name with
  `inst=` in its track header.
- Add a style by adding a `StyleDef` to `STYLE_DEFS`, a colour token block for
  `:root[data-style='<id>']` in `src/ui/style.css`, and the id to `STYLES` in `src/music/roles.ts`.
  `tests/styles.test.ts` checks that every style covers every role.
- Voice recipes live in `src/audio/voices.ts`. The scheduling and mix graph live in `src/audio/engine.ts`. Both
  stay free of the DOM so the rest of the app can be tested without Web Audio.
