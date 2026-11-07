# How Drumline Radio works

The short version. Details live in [song-format.md](song-format.md) and [sound.md](sound.md).

## The big idea

There are no recordings. Each song is a small text score, and the browser's built-in synthesizer
(Web Audio) plays it live. That's why the app is tiny and why any song can switch styles instantly.

```
.song text file ──► parser ──► timeline of notes ──► engine ──► synth voices ──► mixer ──► speakers
                                        │
                                        └──► score view, meters, dial (the screen)
```

## The pieces

| Folder | What's in it |
|---|---|
| `src/songs/` | One `.song` file per song. Plain text: header, then tracks of notes |
| `src/music/` | Reads songs and does the timing math. No sound, no screen, so it's easy to test |
| `src/audio/` | The synth: engine, instrument recipes, the seven styles |
| `src/ui/` | Everything on screen: the dial, the score view, meters, buttons, CSS |
| `src/pwa/` | Offline support: the service worker template and the build step that lists every file to cache |
| `tests/` | Vitest tests for the parts that don't need a browser |
| `tools/` | Dev scripts: the song arranger, the song checker, browser checks, the icon maker. See [tools/README.md](../tools/README.md) |
| `docs/` | This file, the song format, and the sound engine |

### `src/music/`: the score side

- `song.ts` parses a `.song` file into a `Song` and rejects mistakes (bars that don't add up,
  notes out of range, broken ties) with line numbers.
- `timing.ts` turns bars, tempos, and time signatures into seconds: `buildTimeline` lists every note
  with its start time and length.
- `pitch.ts` has note names and frequencies (`A4` = 440 Hz). `roles.ts` has the roles, styles, and
  drum names.
- `library.ts` loads every file in `src/songs/` automatically: drop a file in and it's on the dial.
  Songs are sorted by category, then home style (in the order of `STYLES`), then title.

### `src/audio/`: the sound side

- `engine.ts` is the player. It looks about 0.1 s ahead on the audio clock and books the notes due
  in that window, so timing is exact. It also runs the mixer: per-track volume and pan, reverb, delay,
  then a compressor, a limiter, and volume.
- `voices.ts` builds each note from scratch (oscillators, filters, envelopes, and noise for drums).
- `instruments.ts` is the instrument bank: every patch once, by id, in families; `patches.ts`
  has the patch types and the `synth()`/`drums()` helpers.
- `styles.ts` holds the seven styles as recipes. Each picks instruments from the bank and maps a
  **role** to one.
- `curves.ts` has small sound-shaping helpers (soft clip, bit-crush, velocity to loudness).

### `src/ui/`: the screen

- `ui.ts` is the player core: engine, tuning, styles, transport, keyboard, the frame loop.
- `settings.ts` is volume, mute, repeat, dim, flash, the screensaver timer, and the info panel.
- `playlist-view.ts` is the playlist view and the library list.
- `song-card.ts` is the song card.
- `links.ts` sends a link and reads a link from the address bar.
- `dom.ts` has the storage and element helpers.
- `saver.ts` is the dim and black screensaver overlays, and `wake.ts` keeps the screen awake while music plays.
- `dial.ts` is the tuner strip of stations. `score.ts` draws the scrolling notes. `meters.ts`
  draws the L/R meters. `marquee.ts` scrolls long readout text back and forth. `view.ts` has the
  screen math, kept pure so it can be tested. `playlist.ts` is the playlist logic (saved list,
  reorder, remove, what plays next), kept pure so it can be tested; `playlist-view.ts` draws the playlist view
  and plays its entries. `share.ts` builds and reads share links (`#song=…&style=…&t=…` and
  `#list=…`), kept pure so it can be tested.

## Roles: why remix works

A track never names a specific instrument. It names a role:

```
track melody role=lead
track bass   role=bass
```

Each style picks its own instrument for each role (lead = Saw lead in Synthwave, Strings in
Orchestral, Acid in Techno...). Pressing a style button swaps the whole set, and since notes are
booked only 0.1 s ahead, the change is almost instant.

## Writing a song (one-minute version)

```
title: Example
composer: Claude
year: 2026
source: original
category: originals
style: synthwave
key: C major
tempo: 120
time: 4/4

track lead role=lead
| C5/4 E5/4 G5/2 | [C4 E4 G4]/1 |
```

- `C5/4` is C in octave 5 for a quarter note. `/8` is an eighth, `/4.` a dotted quarter, `/8t` a
  triplet.
- `[C4 E4 G4]` is a chord. `r/4` is a rest. `~` ties a note into the next one.
- `|` separates bars, and every bar must add up to the time signature.
- Every track needs the same number of bars. Run `npm test` and the checker shows any mistakes.
- Before writing a real song, read [composing.md](composing.md): what to check, which patches to
  avoid, and how to keep a new song from copying an old one.

## Day to day

| Task | Command |
|---|---|
| Run it locally | `npm run dev` |
| Check everything | `npm test` and `npm run typecheck` |
| Check the songs | `npm run check:songs` |
| Publish | push to `main`. GitHub Pages and Cloudflare Pages both rebuild; a failing test blocks the GitHub deploy |

Every deploy changes the cache version, so installed copies update on their next launch.

Live sites: https://radio.ogsapps.cc/ (Cloudflare Pages, also at https://drumline-radio.pages.dev/) and
https://stansz.github.io/drumline-radio/

The build serves from `/drumline-radio/` for GitHub Pages and from `/` on Cloudflare Pages, which sets
`CF_PAGES`. Set `BASE_PATH` to override it for any other host.
