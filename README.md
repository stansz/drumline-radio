# Drumline Radio

A browser jukebox for full songs written as text scores: public-domain melodies arranged by
Claude and SZ, and their own originals. It is the sibling of
[Drumline Studio](https://stansz.github.io/drumline-studio/).

**Play it:** https://radio.ogsapps.cc/ (mirror: https://stansz.github.io/drumline-radio/)

![Midnight Arcade playing in the Synthwave style](docs/images/synthwave.png)

It looks like a hi-fi radio tuner and plays the songs with a Web Audio synth:

- A tuner dial of stations, one per song, with a fixed needle that snaps to the nearest one.
- Category presets (All, Carols, Classics, Originals) above the dial show just that group of stations (remembered between visits).
- Installable and works offline: install it from the browser (or the Install button where offered; on iPhone, Share → Add to Home Screen). Updates download quietly and apply the next time it opens.
- A living score that scrolls each track's notes past a playhead. Drag it sideways to scrub through the song.
- VU meters, a glowing readout, and a volume slider with mute (remembered between visits).
- A repeat button that loops the current song (remembered between visits).
- Long titles scroll in the readout. Tap the readout for a song card: credits, key, tempo, length, and a short story for each public-domain song.
- An ⓘ panel with dim view and a black screensaver (auto-starts after 1 or 5 minutes without a touch) that keep the screen awake while music plays (also whenever auto-start is on, so the screensaver can start before the phone locks). Phones pause the live synth when the app is minimized, so keep it open.
- Five styles (Synthwave, Chiptune, Orchestral, Techno, Lo-fi) with remix by band button: switch the band
  and the same notes play with that style's instruments.
- Keyboard shortcuts: Space play/pause, ←/→ previous/next station, 1–5 styles, C category, M mute, R repeat, S screensaver.

| Orchestral | Phone |
|---|---|
| ![Ride of the Valkyries in the Orchestral style](docs/images/orchestral.png) | <img src="docs/images/phone.png" alt="The player on a phone" width="260"> |

The sound engine, and how to add a patch or a style, are described in
[docs/sound.md](docs/sound.md).

## Songs

Christmas carols, arranged by Claude and SZ:

- **Deck the Halls** (traditional Welsh). Synthwave.
- **God Rest Ye Merry Gentlemen** (traditional English). Techno.
- **Good King Wenceslas** (melody from *Piae Cantiones*, 1582). Chiptune.
- **Hark! The Herald Angels Sing** (Felix Mendelssohn, 1840). Orchestral.
- **Jingle Bells** (James Lord Pierpont, 1857). Chiptune.
- **Joy to the World** (arranged by Lowell Mason, 1839). Orchestral.
- **O Christmas Tree** (traditional German). Orchestral.
- **Silent Night** (Franz Xaver Gruber, 1818). Synthwave.
- **We Wish You a Merry Christmas** (traditional English). Synthwave.

Other public-domain melodies, arranged by Claude and SZ:

- **Greensleeves**, traditional English ballad (16th century). Orchestral.
- **In the Hall of the Mountain King**, from Edvard Grieg's *Peer Gynt* (1875). Chiptune. It speeds
  up from start to finish.
- **Ride of the Valkyries**, from Richard Wagner's *Die Walküre* (1856). Orchestral, in real 9/8.
- **Can-Can** (Jacques Offenbach, 1858). Chiptune.
- **Canon in D** (Johann Pachelbel, around 1680). Orchestral.
- **Eine kleine Nachtmusik** (Wolfgang Amadeus Mozart, 1787). Techno.
- **Für Elise** (Ludwig van Beethoven, 1810). Synthwave.
- **Korobeiniki**, the Tetris tune (Russian folk song, 1861). Chiptune.
- **Ode to Joy** (Ludwig van Beethoven, 1824). Orchestral.
- **Swan Lake** (Pyotr Ilyich Tchaikovsky, 1876). Orchestral.
- **When the Saints Go Marching In** (traditional). Synthwave.

Originals by Claude and SZ:

- **Late Bus Home** (Lo-fi)
- **Midnight Arcade** (Synthwave)
- **Night Shift** (Techno)
- **Save Point** (Chiptune)

## How it works

The one-page overview: [docs/how-it-works.md](docs/how-it-works.md).

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
