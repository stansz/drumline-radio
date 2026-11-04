# Drumline Radio

A browser jukebox for full songs written as text scores: public-domain melodies arranged by
Claude, and Claude's own originals. It is the sibling of
[Drumline Studio](https://stansz.github.io/drumline-studio/).

**Play it:** https://stansz.github.io/drumline-radio/

![Neon Test Pattern playing in the Synthwave style](docs/images/synthwave.png)

It looks like a hi-fi radio tuner and plays the songs with a Web Audio synth:

- A tuner dial of stations, one per song, with a fixed needle that snaps to the nearest one.
- A living score that scrolls each track's notes past a playhead.
- VU meters and a glowing readout.
- Four styles (Synthwave, Chiptune, Orchestral, Techno) with remix by band button: switch the band
  and the same notes play with that style's instruments.
- Keyboard shortcuts: Space play/pause, ←/→ previous/next station, 1–4 styles.

| Orchestral | Phone |
|---|---|
| ![Ninefold in the Orchestral style](docs/images/orchestral.png) | <img src="docs/images/phone.png" alt="Pixel Postcard in the Chiptune style on a phone" width="260"> |

The sound engine, and how to add a patch or a style, are described in
[docs/sound.md](docs/sound.md).

## Songs

Public-domain melodies, arranged by Claude:

- **Greensleeves**, traditional English ballad (16th century). Orchestral.
- **In the Hall of the Mountain King**, from Edvard Grieg's *Peer Gynt* (1875). Chiptune. It speeds
  up from start to finish.
- **Ride of the Valkyries**, from Richard Wagner's *Die Walküre* (1856). Orchestral, in real 9/8.

Claude originals:

- **Midnight Arcade** (Synthwave), **Night Shift** (Techno), **Save Point** (Chiptune)
- Short test pieces, one per style: **Acid Test** (Techno), **Neon Test Pattern** (Synthwave),
  **Ninefold** (Orchestral), **Pixel Postcard** (Chiptune)

## Song format

Each song is one plain-text file. See [docs/song-format.md](docs/song-format.md).

## Commands

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
