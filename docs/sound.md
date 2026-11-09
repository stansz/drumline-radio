# Sound

Drumline Radio plays every song with a small Web Audio synth. There are no samples and no runtime
dependencies: oscillators, noise buffers, filters, and effects are built from the browser's audio
nodes.

## Scheduling

The audio clock is the master clock. `src/audio/engine.ts` turns the parsed score into a timeline of
seconds (`buildTimeline` in `src/music/timing.ts`), then every 25 ms it looks 0.5 s ahead and schedules
the notes that start in that window on the `AudioContext` clock. The long window rides out the timer
delays browsers add to windows that aren't focused (Safari on macOS). If a tick still comes late, a
missed note that is at most 0.3 s late plays at once (too little to hear); notes missed by more,
after a real freeze, are skipped so they don't all start together in a burst. The Web Audio engine
plays scheduled notes at the exact time they were given. Changing style cancels the notes booked
but not yet started and books them again with the new style's patches, so a switch is instant. Pausing, seeking, or
loading another song stops every live voice, so the next `play()` starts a fresh schedule from the
current position. A stopped voice fades out over 30 ms (drums too, through a per-hit gain), a voice
booked but not yet started never sounds, and the old song's channels stay connected for 200 ms so
those fades finish. Each fresh schedule starts 50 ms ahead of the clock, so its first notes are
booked in the future and keep their attack instead of starting late with a click.

Each track gets its own channel: volume and pan from the song file, plus reverb and delay sends.
Every voice connects to that channel, never straight to the master chain, so the track's volume,
pan, and effects cover all of its notes.

## Patches and styles

A style is a set of patches plus the settings of the shared effects. A patch is either a synth
(oscillators, a plucked string, formants, envelope, filter,
vibrato, FM, drive, and send levels) or a drum kit
(kick, snare, hats, cymbals, and toms). `src/audio/instruments.ts` is the instrument bank: every
patch, once, under a unique id, grouped into leads, keys, pads, basses, and kits.
`src/audio/styles.ts` holds the eight styles as recipes: each picks the bank instruments it uses,
under its own local names, and sets its role map and effects.

A track picks its patch in this order:

1. `inst=bank:<id>` names a bank instrument: the track uses it in every style.
2. `inst=<name>` and the current style has an instrument with that local name: the track uses it.
3. Otherwise the patch for the track's `role`.

That is what makes remixes work. The score stores roles, not instruments, so switching the style
(by pressing a band button) re-reads the same notes with the new style's patches. The readout adds
`(remix)` when the style differs from the one named in the song file.

A track with `inst=bank:` keeps its sound in every remix, so use it only when that sound is the
point of the part. Plain `inst=` and roles let each style supply its own sound, which keeps styles
distinct.

The tables below use each style's local names. Three of them differ from the bank id, because two
styles had different patches under one name: Chiptune's `square-lead` is `chip-square` in the bank,
Techno's `sub-bass` is `techno-sub`, and Cinematic's `strings` is `string-section`.

A synth patch can set `drive` from 0 to 1. That puts a tanh wave shaper between the oscillators and
the filter, so the patch distorts; the Cinematic lead guitar and the Lo-fi dusty sample and radio
lead use it.

A synth patch can also set `string` to add a plucked string (Karplus-Strong): a burst of fixed-seed
noise, shaped by the pick position, circulates in a delay line one period long and is softened on
each pass, so it rings and decays like a string. `decay`, `brightness`, and `pick` shape it, `octave`
and `level` work as for an oscillator, and it goes through the patch's drive, filter, and envelope.
Each pitch is rendered once (2.5 s, `src/audio/strings.ts`) and reused. Guitar patches set
`octave: -1`, because guitar music is written an octave above where it sounds.

An oscillator that would sound below 30 Hz is not created: that low it is felt as rumble rather than
heard, and it only eats headroom, so a sub-octave layer drops out under very low notes.

A bent note in the score (`^`, see [song-format.md](song-format.md)) automates each oscillator's
detune, and the FM modulator's when the patch has FM. The pitch glides to each bend target over
`BEND_GLIDE` (0.1 s), or less when the next bend is close. The vibrato LFO stays connected and adds
on top.

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

Synthwave also has an extra clean `sub-bass` patch, a sine sub with a little triangle at the octave,
that no role maps to. Midnight Arcade's `sub` track reaches it with `inst=sub-bass`.

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
| lead2 | FM brass |
| counter | Woodwind |
| pad | String pad |
| chords | Concert harp |
| bass | Low strings |
| arp | Glockenspiel |
| drums | Timpani & cymbals |

Songs can also reach `inst=tubular-bells` (FM bells that ring long), `inst=pizzicato` (short
plucked strings), and `inst=oboe` (a formant oboe, more cutting than the flute-like woodwind).

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

The Lo-fi style is mellow keys (an FM electric piano whose soft notes are mellower), a round bass, and a dusty swung kit. Its tape wobble comes from the
slow vibrato on its patches, and its vinyl bed is a looping crackle buffer whose level is the style's
`fx.crackle`. Songs can reach the extra `Dusty sample` patch with `inst=dusty-sample`: a detuned saw
and triangle through drive and a short low-passed envelope, with no vibrato, for a chopped-record
lead. Last Stop uses one more extra, `inst=upright-bass`: a plucked string bass (a Karplus-Strong string
with a sine under it, a quick filter thump) that sounds an octave below the written note, so
a lead track can play the melody on it. Shortwave's melody uses `inst=radio-lead`: a saw and a narrow
pulse, plucked so it decays instead of holding, driven hard, and band-passed wide around 1.8 kHz,
like a lead through a small radio speaker. It has no vibrato on purpose: in a lead's register, a
smooth held tone with slow wobble and few harmonics is what a flute sounds like, and the Lo-fi
master filter already takes off the top. No role maps to these three.

### Cinematic

The Cinematic style is a grand piano, an overdriven lead guitar, a solo cello, a warm bass, a string
section, an analog synth, and an organic studio kit. The guitar's `drive` gives it the distortion,
and its long delay send and the style's 3.2 s reverb give it a big hall. Songs can reach the extra
`Glass pad` patch with `inst=synth-pad` (FM sines that swell into a soft, bell-like shimmer); no
role maps to it.

### Alt rock

The Alt rock style is guitar-band rock: punk, pop punk, and indie. Its twelve instruments are all new
in the bank.

| Role | Patch |
| --- | --- |
| lead | Fuzz guitar |
| lead2 | Clean guitar |
| counter | Clean guitar |
| pad | Guitar wall |
| chords | Power chords |
| bass | Pick bass |
| arp | Clean guitar |
| drums | Rock kit |

The fuzz lead and both rhythm guitars use heavy `drive`; Power chords is short and palm-muted for
chugging, and Guitar wall holds for a chorus. Clean guitar is a jangly plucked string for arpeggios
and counter-lines, an octave below the written note. Pick bass has a little drive for driving eighth notes. The style has a small
room (1.4 s reverb), little delay, and no crush.

Alt rock has six extras that no role maps to. `inst=indie-lead` is an old name that now plays the
shimmer guitar (a warm, darkly filtered plucked string with a slow chorus). `inst=acoustic-guitar`
is a plucked acoustic, open, with a soft pick attack and a moderate ring, `inst=plugged-acoustic` is the same kind of string
heard through a pickup and an amp: a wide band-pass for the direct, mid-forward piezo tone, light
drive for compression, a soft fingerpicked attack that fades in over 50 ms, and an open ring into
some reverb and echo, and `inst=crunch-guitar` is a driven
plucked electric for crunchy parts. `inst=shimmer-guitar` is a shimmering clean guitar for
indie arpeggios: a warm, darkly filtered plucked string at the written pitch, with a deep, slow
chorus wobble and a moderate reverb and delay send that makes its notes echo on the style's
dotted-eighth delay. `inst=clean-electric` is the Cinematic lead guitar made
clean: no drive, a triangle in place of its buzzy square, less saw, a softer and lower filter, a
milder vibrato, less sustain, and small reverb and delay sends, an octave
below the written note. Porch Light uses `clean-electric` and `shimmer-guitar`.

### Studio

The Studio style is the open one: it lists every bank instrument under its bank id, so a song whose
home style is Studio can pick any instrument with plain `inst=` (`inst=radio-lead`, `inst=909-kit`).
A new instrument in the bank appears in Studio by itself. Its effects are clean and neutral: a 2 s
reverb, a light delay, no crush, no crackle, and no high cut. Tracks without `inst=` use neutral
defaults: Saw lead (lead), Grand piano (lead2 and chords), Woodwind (counter), Warm pad (pad), Warm
bass (bass), Pluck (arp), and Studio kit (drums). A Studio song remixed into another style falls back
to that style's patch for each role, so give every track a fitting role.

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

## Building a patch

Start from the closest bank patch in `src/audio/instruments.ts` and change one thing at a time. Every
bank patch has a one-line comment saying what it is for, and every `SynthPatch` field is commented in
`src/audio/patches.ts` with what it does and its unit (seconds, Hz, cents, 0–1, octaves).

| Sound | Technique | Start from |
| --- | --- | --- |
| Leads, pads, synth basses | oscillators + filter | `saw-lead`, `warm-pad`, `synth-bass` |
| Electric piano, bells, glockenspiel | FM | `fm-rhodes`, `fm-bells`, `glockenspiel` |
| Brass | FM with an index swell | `fm-brass` |
| Slap and DX bass | FM | `dx-bass` |
| Guitars, harp, pizzicato, upright bass | plucked string | `clean-guitar`, `nylon-guitar`, `concert-harp`, `pizzicato`, `string-bass` |
| Choir, wordless vocals, reeds | formants | `choir-aah`, `choir-ooh`, `vox-lead`, `oboe` |

### FM

`fm` makes the patch two-operator FM: a sine modulator at the note frequency × `ratio` wobbles the
pitch of the oscillators, so it stays in tune with the note but grows sidebands. `ratio` sets the
character: whole numbers sound harmonic (an organ, a horn), and non-integer ratios such as 1.4 or 3.5
sound bell-like or metallic. `index` is the peak modulation depth, so it sets the brightness. `decay`
is how many seconds the index takes to fall toward its floor, and `sustain` is that floor as a
fraction of the peak, so the tone can settle instead of going silent. `velocity` (0 to 1) makes soft
notes mellower by lowering the peak with the note's velocity, the DX7 electric-piano trick: at 1 a
velocity-zero note gets no FM, at 0 velocity has no effect. `attack` adds seconds for the index to
swell from the floor to the peak, which is what makes `fm-brass` open up like a horn. `targets` names
which oscillators the modulator drives (indexes into `oscs`), so a patch can keep an oscillator
unmodulated as a clean layer under the FM, as `fm-rhodes` does with its second sine. The modulator
never drives the plucked string. The defaults keep older FM patches unchanged, so `fm-pluck` sounds
exactly as before.

### Plucked string

`string` renders a Karplus-Strong plucked string: a burst of fixed-seed noise shaped by the pick
position circulates in a delay line one period long and is softened on each pass, so it rings and
decays like a string. `decay` sets how long it rings, `brightness` how mellow or metallic it is, and
`pick` how thin or round the strike sounds; `octave` and `level` work as for an oscillator, and guitar
patches use `octave: -1` because guitar music is written an octave above where it sounds. Each pitch
is rendered once by `src/audio/strings.ts` and cached. The string goes through the patch's drive,
filter, and envelope, and it can sit under oscillators, as `string-bass` does with a sine. A patch
with an empty `oscs` list is a pure plucked string.

### Formants

`formants` is a list of band-pass bands at fixed frequencies that the oscillators and the plucked
string pass through in parallel (the bands are summed) before drive, filter, and envelope. The fixed
peaks are what make a vowel, so the vowel stays the same whatever note is played. `VOWELS` in
`src/audio/patches.ts` holds `ah`, `oh`, `oo`, and `ee` (use as `formants: VOWELS.ah`). A reed or a
body is one or two broad bands (low `q`, as in `oboe`). Start from a bright source (saws, a
square, a pulse), since a band-pass only takes away. Narrow bands remove most of the energy, so
formant patches need a higher `gain` than plain ones and should be level-matched with
`tools/browser/levels.mjs`. It sounds like a synth choir, not real singers. Keep bands wide for a high
part: a narrow band passes only the one harmonic that falls inside it, so above about C5 the
`VOWELS` bands leave one or two harmonics and the part sounds like a flute. `vox-lead` uses wide
(low `q`), soprano-placed bands for that reason; the narrow `VOWELS` suit pads and lower parts.

### Hearing and levelling a patch

The instrument page, `instruments.html` (`npm run dev`, then `/drumline-radio/instruments.html`;
the radio doesn't link it), lists every bank patch with its techniques and the styles that use it.
Clicking one plays a short phrase in its family's register through a style's effects and master
chain. Its data comes from `src/ui/audition.ts`, so a new bank patch shows up there by itself.

Before a style swaps a new patch in for an old one, level-match them with
`node tools/browser/levels.mjs old-id:60,new-id:60` (see `tools/README.md`) and set the new patch's
`gain` so its RMS is within about 1 dB, so the songs that use the style keep their mix.

## Saving a song

`renderSong` in `engine.ts` renders a song offline with an `OfflineAudioContext` at 44.1 kHz stereo,
through the same engine, voices, and master chain as live play, plus a 3 s tail for reverb and delay.
It books notes 2 s ahead in steps while rendering, so a long song never holds every voice at once.
`src/audio/wav.ts` encodes the result as 16-bit PCM WAV.

## Removed patches

When a patch is replaced by a better one, the old one leaves the bank and its name keeps working:
`REPLACED` in `src/audio/styles.ts` points it at the replacement in Studio (and the styles that used
the name point at it too). So far: `brass` → `fm-brass`, `harp` → `concert-harp`, `bells` →
`glockenspiel`, `tine-keys` → `fm-rhodes`, `upright-bass` → `string-bass`, and `indie-lead` →
`shimmer-guitar`.

## Adding a patch or a style

- Add a synth patch with `synth({...})` or a drum kit with `drums({...})` to its family in
  `src/audio/instruments.ts` under a new unique id, with a one-line `//` comment saying what it is
  for. A style uses it by adding `localName: 'bank-id'` to its `instruments` and pointing a role or
  `inst=` at the local name; any song can reach it with `inst=bank:<id>`.
- Add a style by adding a `StyleRecipe` to `RECIPES` in `src/audio/styles.ts` (pick instruments from
  the bank), a colour token block for `:root[data-style='<id>']` in `src/ui/style.css`, and the id to
  `STYLES` in `src/music/roles.ts`. `tests/styles.test.ts` checks that every style covers every role.
- Voice recipes live in `src/audio/voices.ts`. The scheduling and mix graph live in `src/audio/engine.ts`. Both
  stay free of the DOM so the rest of the app can be tested without Web Audio.
