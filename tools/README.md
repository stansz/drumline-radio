# Tools

Dev scripts for making songs and checking the app. None of this ships in the site.

| Folder | What it does |
|---|---|
| `arranger/` | Builds full `.song` files from a melody plus chords |
| `midi/` | Converts a score's MIDI file into song bars (`midi2song.mjs`) |
| `check/` | Parses every song and reports note clashes |
| `analysis/` | Reports one song's density, register, dynamics and energy; reads a reference MIDI's groove |
| `browser/` | Checks the running app in headless Edge: layout, loudness, per-track levels, patch levels, patch timbre, late notes, offline, screenshots |
| `icons/` | Draws the app icon and renders its PNG sizes |

## Arranger

`arranger/arranger.mjs` turns a short recipe into a whole song. The recipe holds:

- the melody, one string per bar;
- the chords, one string per bar;
- the style, tempo, and time signature;
- how many passes, and whether the last one goes up a key;
- the intro type, the bass line, and the drum groove.

It writes seven tracks (melody, harmony, arp, pad, bass, drums, cymbals) with an intro, 2–4 passes
that get fuller each time, and a held ending.

- **Intros:**
  - `tease`: the arp previews chosen bars of the tune;
  - `pad`: the pad swells alone;
  - `drums`: the drums play alone;
  - `bassriff`: the bass plays, then the drums join;
  - `vamp`: pad, bass, and drums together;
  - `none`.
- **Bass lines:** `octave8`, `root5`, `offbeat8`, `pulse16`, `oompah`, `walk`, `gallop`, `syncop`,
  `waltz`, `lofi`, `held`.
- **Drum grooves:** `gated`, `chip`, `orch`, `four`, `march`, `polka`, `shuffle`, `halftime`,
  `disco`, `break`, `waltz`, `ballad`, `canon`, `lofi`. Each groove has a lighter version for the
  first pass and a busier one after.
- **Chords:** major, `m`, `7`, `m7`, `maj7`, and `dim`, for example `C`, `Am`, `G7`, `Bbmaj7`.

The simple `arrange()` covers most carols and classics. `arranger/songs.mjs` holds the recipes for
the 16 arranged carols and classics, and `arranger/about.mjs` holds the story for each public-domain
song.

```bash
node tools/arranger/songs.mjs tmp/songs
```

```bash
node tools/arranger/songs.mjs tmp/songs jingle-bells
```

```bash
CHECK_DIR=tmp/songs npm run check:songs
```

The first command builds all 15 songs into `tmp/songs`, the second builds just one, and the third
checks the output. To keep the output, copy it over the file in `src/songs/`. The script's output
matches the files in `src/songs/`, so re-running it is safe.

`tests/drift.test.ts` runs every generator into a temp folder and fails if a generated song differs
from its copy in `src/songs/`. It runs in `npm test` but not in `npm run test:sandbox`, because the
sandbox blocks the child processes it starts. Regenerate after a recipe change instead of editing a
generated song by hand.

`writeSong()` in `arranger.mjs` writes every arranged song; `arrange()` and `arrangeForm()` share
it. A recipe with `hidden: true` gets a `hidden: true` header, which keeps its song out of the
library while it is still parsed and checked.

Ride of the Valkyries and Midnight Arcade are hand-written. Edit their `.song` files directly.

### Form-based recipes (more shape)

`arrangeForm()` is for songs that need more than "the tune N times". A recipe names its
**sections**, such as verse, chorus, and bridge, each with its own melody and chords. The **form**
then lists the order to play them in, with a level for each:

| Level | What plays |
|---|---|
| 0 | breakdown: pad and melody only |
| 1 | light: pad, bass, and the light groove |
| 2 | full: adds the arp and the busier groove |
| 3 | biggest: adds the harmony part and a crash |

Each form entry can also set:

- `shift`: a key change, in semitones;
- `melody: false`: an instrumental pass;
- `dyn: 'build'` or `'drop'`: velocity rising or falling through the section;
- `last`: a different last melody bar;
- `fill`: whether to play a drum fill on the last bar. Fills happen anyway before a louder section,
  breakdowns included.

Song-wide options:

- `harm`: `counter` (default; a counter-line of long chord tones under the melody), `octave` (the
  melody doubled up an octave), or `off`.
- `arp`: `updown`, `up`, `broken`, or `off`.
- `pad`: `hold`, `stabs`, or `offbeat`.

The full worked example is `arranger/examples/form-demo.mjs`: verse, chorus, a bridge breakdown,
and a last chorus up a step.

```bash
node tools/arranger/examples/form-demo.mjs tmp/demo
```

Last Stop has its own script, `arranger/last-stop.mjs`: one four-bar loop written out by hand
(chopped keys, a straight kick and rim, and an upright bass playing short phrases). Like the other
scripts, it writes to `src/songs` by default and takes an output folder:

```bash
node tools/arranger/last-stop.mjs tmp/orig
```

Ivory and Ash has its own script, `arranger/ivory-and-ash.mjs`: its piano and guitar melodies are
written out by hand (with bends), and the script fills in the arpeggios, strings, bass, and drums
from each section's chords.

```bash
node tools/arranger/ivory-and-ash.mjs tmp/cine
```

The Nocturne (Chopin) is built by `arranger/nocturne.mjs`: the melody is written out bar by bar
in 12/8, and the script adds the harp and cello left hand, pad, flute counter-line, and bells.

```bash
node tools/arranger/nocturne.mjs tmp/noc
```

Für Elise, Greensleeves, Mountain King, and Swan Lake are built the same way from real scores, each
by its own script in `arranger/` (`fur-elise.mjs`, `greensleeves.mjs`, `mountain-king.mjs`,
`swan-lake.mjs`). Swan Lake's melody was read from the oboe part of an IMSLP edition. Für Elise and
Mountain King come from Mutopia Project MIDI files, converted with `midi/midi2song.mjs`; Greensleeves
from the four voices of a Mutopia hymn setting. Each script holds the converted bars, the fixes (grace
notes dropped, octaves moved into range), and the form, with repeats unfolded.

```bash
node tools/midi/midi2song.mjs score.mid --time 3/8 --pickup 480 --grid 40 --json bars.json
```

`midi2song.mjs` splits each MIDI track into voices, snaps notes to the grid (`--grid 40` fits 32nds
and triplets), and prints each voice's range and how many notes moved. For a famous public-domain
piece, start from a score like this rather than from memory.

For piano pieces, a conversion script can import `readMidi`, `quantise`, `splitVoices`, and
`writeBars` from `midi2song.mjs` and route the notes itself (Moonlight's triplets apart from its
melody, the left hand's low notes doubled by a bass). `arranger/piano-piece.mjs` then writes the parts
as a song; `moonlight.mjs` and `clair-de-lune.mjs` hold the converted bars and use it.

The club tracks have their own script too, `arranger/club.mjs`: Underpass (Synthwave, in the manner
of a synth film score: octave-pulse bass, step sequencer, brass chords, a heroic theme) and Ivory and
Ash (128 Mix), which reuses the Ivory and Ash melodies with every note doubled in length so the tune
keeps its pace at 128 BPM. Night Shift has its own, `arranger/night-shift.mjs`, laying its acid line
and hook out over two drops, and so does Save Point (`arranger/save-point.mjs`: its two themes, a
save-room interlude, an adventure section, all again up a step).

```bash
node tools/arranger/club.mjs tmp/club
```

Riverfront and Fathom have their own scripts too. `arranger/riverfront.mjs` lays its counter-line,
stabs, pad and rolling sub out over 136 bars. `arranger/fathom.mjs` builds Fathom, a dub techno track
that is one G minor chord voiced eight ways: every bar is laid on a sixteenth grid, so a pattern is a
list of slots, and the stab patterns are echo trails whose repeats land later and softer each time.
Sections are 16 bars, and each one adds or drops a layer.

```bash
node tools/arranger/fathom.mjs tmp/dub
```

Exit Sign has its own script, `arranger/exit-sign.mjs`: hand-composed vocal-style melodies over a
single harmonic map, palm-muted eighths, held chorus guitars, kick-locked bass, and separate
backbeat and cymbal tracks. Its twelve-bar chorus is shared by every reprise, with clean-guitar
answers added in the final double chorus. The bridge drops bass and drums for two bars before
returning in half time.

```bash
node tools/arranger/exit-sign.mjs tmp/rock
```

The Silent Keep has its own script, `arranger/the-silent-keep.mjs`: a clean-guitar and cello intro,
a ballad verse, a Phrygian gallop, a 6/8 twin-guitar middle, a 48-bar solo with bends and sextuplet
runs, a twin-guitar reprise, and a clean outro, all following one harmonic map.

```bash
node tools/arranger/the-silent-keep.mjs tmp/epic
```

### Always room to change

The arranger is a starting point, not a rule. A good first draft comes from picking the form,
grooves, and textures to suit the song's genre and mood. From there:

- **Change the recipe** when an arranged song needs a different feel.
- **Hand-write or hand-edit** a song when the arranger can't express it.
- **Rewrite with `arrangeForm()`** when a simple arrangement feels flat, or write a song's own
  script when the arranger's shapes get in the way (Last Stop went from `arrangeForm()` to a
  hand-written loop to sound less jazzy).
- **Extend the arranger** with a new groove, bass line, texture, or option when it keeps falling
  short. Add new options as opt-in so existing recipes rebuild unchanged.

Listening wins over the script: if it sounds wrong, change it.

## Song check

```bash
npm run check:songs
```

It parses every song in `src/songs/`, or in `CHECK_DIR` if set, and fails on any parse error. Set
`SONG` to a song's name or path (for example `SONG=wayfarers-rest npm run check:songs`) to check
only that song. A bar-length parse error lists each token in that bar with the ticks it got. It
also lists each song's length and any long note in a pitched part (every track except the pad, bass,
and drums) a semitone away from the pad or bass under them. That count is a report, not a failure:
passing notes and a maj7 against its root are fine, but a new spike is worth a listen. Each clash
line names its track, and the summary breaks the count down by track. Set `CHECK_DETAIL=1` to list
every clash with its time, the track, note, and its length, and the pad or bass note under it. Songs
that declare their progression in `# chords:` comment lines (one symbol per bar, cycling;
`# chords @N:` changes from bar N, `-` is no chord) also get an off-chord count: long notes that
start on a beat with a pitch outside the bar's chord. The supported qualities are major, `m`,
`dim`, `aug`, `sus2`, `sus4`/`sus`, `7`, `maj7`, `m7`, `m7b5`, `dim7`, `6`, `m6`, `add9`, `madd9`,
`9`, `m9`, and `maj9`, with an optional `/` bass note. That count is a report too.

## Song report

```bash
SONG=src/songs/third-rail.song npm run report:song
SONG=out/draft.song VERBOSE=1 npm run report:song
```

It prints, per track, the note count, events per bar, the share of bars it plays in, its register,
mean velocity and spread, and how many bars are unique (a low number means a loop). For the lead it
adds the interval mix — repeats, steps, leaps — and how often the line rests. An 8-bar energy map
shows where the song opens up and where it thins out. The flags at the end are heuristics (busy,
flat velocity, never rests, high register), not failures; they point at something to listen for.

## Reference MIDI

```bash
npm run analyze:midi -- reference.mid --time 4/4 --grid 120
npm run analyze:midi -- reference.mid --json out/stats.json
```

It reports the bar count, each MIDI track's register, velocity spread and how many bars are unique,
then the groove itself: the median position of off-16th notes (50% is straight, about 67% is a 2:1
swing), the share of main/accent/ghost velocities, and for percussion tracks a sixteenth-by-sixteenth
hit grid with a row per drum. Copy those numbers into a `.song` instead of guessing at the feel.

## Browser checks

These need a server running. Start one first:

```bash
npm run build && npx vite preview --port 4173
```

Or pass the live site's URL instead. Edge always runs muted.

```bash
node tools/browser/layout.mjs
```

```bash
node tools/browser/offline.mjs
```

```bash
node tools/browser/loudness.mjs http://localhost:4173/drumline-radio/ 3 lofi
```

```bash
node tools/browser/loudness.mjs "" 3 "" "underpass|night shift"
```

```bash
node tools/browser/shot.mjs http://localhost:4173/drumline-radio/ 412 760 tmp/phone.png
```

- **layout:** checks that the page fits phone sizes and desktop without scrolling, and saves
  screenshots to `tmp/layout/`.
- **offline:** checks that the app can be installed, that it is cached, and that it plays with the
  network off.
- **loudness:** measures every song, here remixed into Lo-fi. Healthy songs sit around −10 to −16 dB
  RMS. A full run takes several minutes, so after changing one song pass a title filter (a
  case-insensitive regex; `""` keeps the default URL and each song's own style) and a reference song,
  as in the second command.
- **shot:** takes a screenshot, for example for the README.
- **late:** seeks and changes stations while playing and checks that every note is booked ahead of
  time (`late` 0, `min` above 0). A note booked for the past starts without its attack and clicks:
  `node tools/browser/late.mjs`.
- **stall:** blocks the main thread for 1.5 s while a song plays and counts sounds booked in the past
  afterwards. Only notes up to 0.3 s late may play late; the rest of the gap is skipped, so there is
  no burst: `node tools/browser/stall.mjs`.
- **balance:** the standard balance check. `npm run balance -- wayfarers-rest` (a song name or
  path, then optionally a style and the bars per section, default 8) starts its own Vite server on a
  free port, renders the whole song offline in headless Edge through the real engine with each
  track tapped separately, prints every track's RMS / peak per section (and the level below 150 Hz
  for bass and drums), flags a pad or chords part more than 10 dB under the lead, an arp peaking
  more than 8 dB under the lead, a bass louder than the lead, and a bass low end louder than the kick's, then stops the server and browser.
  About 10 seconds for a 3-minute song; no seeking, so held notes are measured too.
- **tracks:** plays one song live from a point (0–1 of the way through) and prints each track's level,
  to find a part that is buried or too loud: `node tools/browser/tracks.mjs "Underpass" 0.4
  lead,harmony,hook,sequencer,ostinato,brass,bass,drums` (track names in the song file's order).
  Each line also shows the track's level below 150 Hz; the bass's low level should sit under the
  drums' low level (the kick). It also prints each track's peak: for a sparse part (a stab every
  few beats) RMS reads low because most of the 4 s window is silence, so compare peaks there. A note
  that started before the seek point isn't heard, so seek to just before a long held note to
  measure it. Add a style id at the end to remix the song into it first.
- **levels:** renders the same four-note phrase on each bank patch offline and prints its RMS and
  peak, to level-match a new patch to the one it replaces before a style swaps it in. Match RMS
  within about 1 dB; for a plucked or struck patch that rings out, split the difference with the
  peak. It also prints the energy split (low under 300 Hz, high above 3 kHz, and the mid between):
  a patch can match by RMS and still be masked if more of its energy sits under 300 Hz than the one
  it replaces, so compare that too. Like timbre, it needs `npm run dev`:
  `node tools/browser/levels.mjs woodwind:67,oboe:67` (bank ids, each with a MIDI note).
- **timbre:** renders one note per patch offline and counts its strong harmonics, to catch a lead
  that will sound like a flute (one to three harmonics is a near-sine). It needs `npm run dev`
  instead of the preview server, because it imports the audio code from `src/`:
  `node tools/browser/timbre.mjs lofi soft-flute,radio-lead` (style, patches, optional MIDI note).

`browser/cdp.mjs` is the shared helper. It launches headless Edge, or on Linux and macOS the first
Chromium or Chrome it finds (set `EDGE_PATH` to pick another), and talks to it over the DevTools
protocol with the built-in WebSocket of Node 22 or later. Scripts that use
its default page (the preview server on port 4173) can be pointed at another server with
`RADIO_URL`, for example `RADIO_URL=http://localhost:5173/drumline-radio/`.

## Icons

```bash
node tools/icons/make-icons.mjs
```

It writes `public/favicon.svg` and `public/icons/*.png`. To change the icon, change the colours or
shapes in the script and rerun it.
