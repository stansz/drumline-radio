# Drumline Radio

A browser jukebox for full songs written as text scores: public-domain melodies arranged by
SZ and AI, and their own originals. It is the sibling of
[Drumline Studio](https://stansz.github.io/drumline-studio/).

**Play it:** https://radio.ogsapps.cc/ (mirror: https://stansz.github.io/drumline-radio/)

![Midnight Arcade playing in the Synthwave style](docs/images/synthwave.png)

It looks like a hi-fi radio tuner and plays the songs with a Web Audio synth:

- A tuner dial of stations, one per song, with a fixed needle that snaps to the nearest one.
- Category presets (All, Classics, Originals, Carols) above the dial show just that group of stations (remembered between visits).
- Within each category the dial is grouped by home style, with a caption at the start of each style. The style button next to the presets (or G) cycles through the styles that category has, showing only that style's songs; the playlist's library list has the same button.
- A Playlist view (Radio | Playlist switch in the header): add any song in any of the 8 styles, the same song more than once, reorder or remove entries, and play the list in order, with a Loop toggle. The playlist is saved on this device.
- Share links: in the song card (tap the song title), "Share song" shares the song in the style you are hearing, and "Share from m:ss" adds the current time; the playlist view's Share button shares the whole list. Opening a link tunes the app, ready to play; a shared playlist asks before replacing or adding to yours. Uses the share sheet where the browser has one, otherwise copies the link. The song card also has "Save as WAV", which renders the song in the style you are hearing and downloads it (about 10 MB a minute; a few seconds to render on a phone).
- Installable and works offline: install it from the browser (or the Install button where offered; on iPhone, Share → Add to Home Screen). It checks for an update each time it opens or comes back to the front, and a new version takes over right away (if music is playing, the next time you switch away from it). The bottom of the ⓘ panel shows the build's commit and time, so you can check which version is running.
- A living score that scrolls each track's notes past a playhead. Drag it sideways to scrub through the song.
- VU meters, a glowing readout, and a volume slider with mute (remembered between visits).
- A repeat button that loops the current song (remembered between visits).
- Long titles scroll in the readout. Tap the readout for a song card: credits, key, tempo, length, and a short story for each public-domain song.
- An ⓘ panel with dim view and a black screensaver (auto-starts after 1 or 5 minutes without a touch) to save battery. The screen stays awake whenever music plays. Phones pause the live synth when the app is minimized, so keep it open.
- Eight styles (Synthwave, Chiptune, Orchestral, Techno, Lo-fi, Cinematic, Alt rock, Studio) with remix by band button: switch the band
  and the same notes play with that style's instruments. Studio is the open style: every instrument in the bank, through a clean mix. The selected style button lights up in its style's colour; at tablet width the buttons sit in two rows of four, and on a phone they fold into one style button next to the transport that opens them as a panel. On a phone the seek bar has its own full-width row above the transport.
- Each style has its own full-screen scene behind the player: a neon sunset and grid (Synthwave), an 8-bit night with pixel mountains (Chiptune), an evening concert hall with organ pipes, velvet drapes and drifting dust in the stage light (Orchestral), a warehouse with swaying lasers (Techno), a rainy window over city lights (Lo-fi), a widescreen sunrise over mountains with a lens flare (Cinematic), a brick-walled basement show under one spotlight (Alt rock), and a control room with acoustic panels and an on-air lamp (Studio). The lasers, rain and dust stop with reduced motion.
- Techno flashes the screen gently on the kick, within the WCAG flash limits (at most 3 a second, a soft fade). It is off with reduced motion, and the ⓘ panel has a switch to turn it off.
- Keyboard shortcuts: Space play/pause, ←/→ previous/next station, 1–8 styles, C category, G style filter, M mute, R repeat, S screensaver, P playlist view.

| Orchestral | Phone |
|---|---|
| ![Ride of the Valkyries in the Orchestral style](docs/images/orchestral.png) | <img src="docs/images/phone.png" alt="The player on a phone" width="260"> |

The sound engine, including the instrument bank and its plucked-string guitars, and how to add a
patch or a style, are described in [docs/sound.md](docs/sound.md). To ask another AI model for a new
song, fill in the prompt template in [docs/song-prompt.md](docs/song-prompt.md).

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
- **Canon in D** (Johann Pachelbel, around 1680). Orchestral.
- **Clair de Lune** (Claude Debussy, 1905). Cinematic.
- **Für Elise** (Ludwig van Beethoven, 1810). Synthwave.
- **Korobeiniki**, the Tetris tune (Russian folk song, 1861). Chiptune.
- **Moonlight Sonata**, first movement (Ludwig van Beethoven, 1801). Cinematic.
- **Nocturne in E-flat, Op. 9 No. 2** (Frédéric Chopin, 1832). Orchestral.
- **Swan Lake** (Pyotr Ilyich Tchaikovsky, 1876). Orchestral.

Hidden for now, to be redone later: Can-Can, Eine kleine Nachtmusik, Ode to Joy, When the Saints Go Marching In.

Originals by SZ (and AI):

- **Exit Sign** (Alt rock), by GPT-6.1-sol & SZ. A 2:57 guitar-band original: palm-muted verses, a twelve-bar vocal-style hook, a half-time bridge, and a final double chorus.
- **Porch Light** (Alt rock), by Grok, Claude & SZ. A 4:40 slow, emo indie original at 72 BPM: a laid-back clean electric guitar lead, shimmering arpeggios, a Ben Folds-style piano, a borrowed minor iv in the hook, and a half-time bridge in a new key before the last chorus finally gets loud.
- **Ivory and Ash** (Cinematic). A 128 BPM club mix, Ivory and Ash (128 Mix), is hidden for now.
- **The Silent Keep** (Cinematic), by DeepSeek V4 Flash & SZ. A 6:06 heavy-metal ballad-epic in E minor:
  a clean guitar and solo cello state the theme, the band kicks into a Phrygian gallop, twin guitars
  trade thirds and sixths, a 48-bar solo climbs through sixteenth and sextuplet runs to a held, bent
  high E, and the fire dies back to a lone cello.
- **Lantern Ward** (Orchestral). A nocturne in D minor whose recapitulation reassembles the theme as a hocket while the violins rest.
- **The Cartographer** (Orchestral). An A-major overture whose cello-led middle section stretches the theme between illuminated chord windows.
- **Last Stop** (Lo-fi)
- **Midnight Arcade** (Synthwave)
- **Night Shift** (Techno)
- **Riverfront** (Techno), by MiMo v2.6 Pro & SZ. A 4:23 deep techno original at 124 BPM in F minor:
  it opens with no kick (a pad, then a hypnotic FM counter-line) before the kick and a rolling sub
  bass drop in together; warm chord stabs, a breakdown where the kick drops and the hook surfaces
  over the pad and chords, and two drops.
- **Save Point** (Chiptune)
- **Shortwave** (Lo-fi)
- **Third Rail** (Lo-fi)
- **Underpass** (Synthwave)

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
npm run check:songs
```

Dev tools (the song arranger and browser checks) are described in [tools/README.md](tools/README.md).

## License

MIT. See [LICENSE](LICENSE).
