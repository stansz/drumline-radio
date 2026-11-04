# Tools

Dev scripts for making songs and checking the app. None of this ships in the site.

| Folder | What it does |
|---|---|
| `arranger/` | Builds full `.song` files from a melody plus chords |
| `check/` | Parses every song and reports note clashes |
| `browser/` | Checks the running app in headless Edge: layout, loudness, offline, screenshots |
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

`arranger/songs.mjs` holds the recipes for the 16 arranged carols and classics. `arranger/about.mjs`
holds the story line for each public-domain song.

```bash
node tools/arranger/songs.mjs tmp/songs
```

```bash
node tools/arranger/songs.mjs tmp/songs jingle-bells
```

```bash
CHECK_DIR=tmp/songs npm run check:songs
```

The first command builds all 16 songs into `tmp/songs`, the second builds just one, and the third
checks the output. To keep the output, copy it over the file in `src/songs/`. The script's output
matches the files in `src/songs/`, so re-running it is safe.

Für Elise, Ride of the Valkyries, Greensleeves, Mountain King, and the four originals are
hand-written. Edit their `.song` files directly.

## Song check

```bash
npm run check:songs
```

It parses every song in `src/songs/`, or in `CHECK_DIR` if set, and fails on any parse error. It
also lists each song's length and any long melody notes a semitone away from the pad or bass under
them. That count is a report, not a failure: passing notes and a maj7 against its root are fine,
but a new spike is worth a listen.

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
node tools/browser/shot.mjs http://localhost:4173/drumline-radio/ 412 760 tmp/phone.png
```

- **layout:** checks that the page fits phone sizes and desktop without scrolling, and saves
  screenshots to `tmp/layout/`.
- **offline:** checks that the app can be installed, that it is cached, and that it plays with the
  network off.
- **loudness:** measures every song, here remixed into Lo-fi. Healthy songs sit around −10 to −16 dB
  RMS.
- **shot:** takes a screenshot, for example for the README.

`browser/cdp.mjs` is the shared helper. It launches headless Edge (set `EDGE_PATH` to use another
Chromium) and talks to it over the DevTools protocol with Node's built-in WebSocket.

## Icons

```bash
node tools/icons/make-icons.mjs
```

It writes `public/favicon.svg` and `public/icons/*.png`. To change the icon, change the colours or
shapes in the script and rerun it.
