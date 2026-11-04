# Jukebox: project brief

Start-here notes for a new Claude session. This is a sibling project to
[Drumline Studio](https://stansz.github.io/drumline-studio/) (repo `stansz/drumline-studio`, local clone
`C:\Users\sz\Documents\Code\drumline-studio`).

## The idea

Drumline Studio is a step sequencer. Its presets (Valkyries, carols, Canon...) are squeezed into the grid:

- 8 pitches per scale
- sixteenth-note steps
- at most 64 steps
- one note per cell
- 3/4 only through a 48-step trick

The jukebox drops those limits. It plays full songs that Claude composes and arranges, as real scores:

- any pitch
- note lengths
- chords
- any time signature
- tempo changes
- many instruments per style

It holds two kinds of songs:

- **Public-domain melodies**, arranged by Claude.
- **Original songs** composed by Claude. The user wants both.

It is a separate repo so it is not constrained by the sequencer's grid-shaped audio engine, which has
one voice per cell, fixed instrument slots, and loudness rules tuned for the grid.

## Status

- Name: **not decided yet**. Candidates: Pixel Jukebox, Drumline Radio, Chip Jukebox. Ask the user if
  they haven't said.
- The user is creating the GitHub repo under `stansz` (public, GitHub Pages). Clone it to
  `C:\Users\sz\Documents\Code\<repo>`. Never under `AppData\Local`, because the dsh sandbox can't
  reach it.

## How we work (user preferences)

- **Claude plans, composes, and verifies, and dsh writes the app code.** Use the `handoff` skill:
  1. Write `.handoff/plan.md`.
  2. Run `dsh --profile headless` in the background.
  3. Verify the result.
- Claude writes all song data. It is generated and checked by a script, then pasted verbatim by dsh.
  Afterwards, confirm the pasted data matches.
- **Verify** with typecheck, tests, and build. Then run a browser test in headless Edge over CDP from
  Node.
  - The Edge binary is `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`.
  - Launch it with `--headless=new --remote-debugging-port=<port> --user-data-dir=<scratch>`.
  - **Always add `--mute-audio`.** The VM's speakers are live and the user works on it.
  - Node 24 has a built-in `WebSocket`. Playwright and Puppeteer are not installed.
  - The app's built-in browser pane does not animate on this headless VM, so don't use it.
  - Example test scripts are in the drumline-studio session scratchpad. Patterns: `len48.mjs`,
    `peak.mjs`.
- On Windows, `npm test` and `npm run build` fail with `spawn EPERM` inside the dsh sandbox.
  - In plans, dsh runs `npm run test:sandbox` and Claude runs the `Verifier only:` commands.
  - Copy `vitest.sandbox.config.mjs` and the `test:sandbox` script from drumline-studio.
- Then commit with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, push to
  `main`, and watch the Pages deploy (`gh run watch <id> --exit-status`).
- The user likes concise answers, plain-language docs, and screenshots in the README.
- Before building, give options with a recommendation, then wait for "go".

## What to reuse from drumline-studio

Copy these, then let the two codebases diverge.

- **Setup:** Vite, TypeScript, Vitest, and no runtime dependencies.
  - Take the `package.json` scripts, `tsconfig`, `vitest.sandbox.config.mjs`, and
    `.github/workflows/deploy.yml` (GitHub Pages). Set the Vite `base` to the new repo name.
  - Copy `AGENTS.md` too, with `CLAUDE.md` importing it, and adapt the rules.
- **Sound** (`src/audio.ts` and `src/themes.ts`):
  - Take the synth voice recipes: pulse/chip leads, FM-ish bells, noise drums, kick/snare/hat synthesis,
    and soft clip and bit-crush curves.
  - Take the effects: delay, reverb, filter, and crush (`src/fx.ts`, `src/mix.ts`).
  - Take the theme sound settings as starting points for styles.
- **Look:** take the pixel-art LCD style and the fonts. That covers Silkscreen and VT323 in
  `src/fonts/`, which are under the SIL Open Font License; keep the license files. Also take
  `src/pixel.ts`, `src/style.css`, and the info/Menu modal look, so it feels like a sibling app.

## Planned design (agreed in principle)

### Engine

- Notes are scheduled ahead of time on the `AudioContext` clock, not step by step.
- Each instrument is a patch: oscillators, envelope, filter, and per-patch effects. There is no limit on
  simultaneous notes, but voices are cleaned up as they finish.
- Each track has its own volume and pan. A master compressor and limiter keep songs at a similar
  loudness.
- Keep the music logic (song parsing, timing math, scheduling plan) free of the DOM and audio, so Vitest
  can test it. Vitest has no Web Audio.

### Styles

A style is a set of 6 to 10 instruments. Start with 4:

| Style | Instruments |
|---|---|
| Synthwave | lead, pad, bass, arp, gated drums |
| Chiptune | 2 pulse leads, triangle bass, noise drums |
| Orchestral | strings, brass, woodwind, timpani, harp/bells |
| Lo-fi or techno | (to decide) |

### Song format

- One text file per song. It is compact enough for Claude to write by hand.
- The header holds: title, composer (or "original"), year or "traditional", style, tempo, time
  signature, and key.
- Then one block per track. Each block names an instrument and lists notes as pitch, length, and
  optional velocity, with rests and chords, for example `E5/8 D#5/8 [C4 E4 G4]/2 r/4`.
- A parser plus a checker runs in the tests. It checks that every bar adds up to the time signature,
  that pitches are in each instrument's range, and that tracks are the same length.

### Player UI

- A song list, grouped into public domain and originals.
- Now playing, with title, composer, and style.
- Play/pause, a progress bar, and next/previous.
- A pixel visualizer.
- Maybe a "remix" button that plays the song with another style's instruments. The user loved hearing
  the Valkyries on Drumline's Techno theme.

### First release

- The player plus 4 styles.
- 6 songs:
  - 3 public domain: the **full Ride of the Valkyries in real 9/8**, **Greensleeves** (didn't fit the
    sequencer, which needed 9 pitches), and one more.
  - 3 Claude originals, in three different styles.

## Rules

- Public-domain melodies only (composer long dead, published before 1930; traditional is fine). Never
  copyrighted songs. Originals are Claude's own compositions.
- Credit every public-domain piece in the README, as drumline-studio does.
- Docs describe only what the code does now.
