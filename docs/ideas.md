# Ideas

Ideas that were discussed but not built. Nothing here describes the app as it is now. When one is
built, move what it does into the right doc and delete it from here.

## Jukebox: a 90s dive-bar theme

The Jukebox view currently takes the colours of the style that's playing. It could have its own
fixed look instead: a 90s CD jukebox in a dive bar. Keep it generic and don't copy any real brand's
cabinet.

- **Cabinet:** dark wood and black, a chrome rim, and a neon tube round the edge that slowly
  shifts colour. It stays the same whatever's playing.
- **LED display:** a red and amber dot display across the top: `NOW PLAYING B2 SAVE POINT`,
  `FREE PLAY`, and the selection as it's keyed in.
- **Title strips:** cream paper cards behind glass, each with a coloured code tab for its style,
  like printed jukebox title cards. The song now playing lights up yellow.
- **Pages:** two pages of strips side by side with big ◀ ▶ flip buttons instead of scrolling; one
  page at a time with a swipe on phones.
- **Keypad:** letter, number, PLAY (B, 2, PLAY). Tapping a strip still plays it too.

The cabinet, display and strips are CSS only, so they're a cheap first step. The pages and the
keypad are new code in `src/ui/jukebox.ts`.

## A mixer and composing GUI (a "Studio" or "Pro" tab)

A separate tab where the listener shapes a song themselves, instead of asking Claude to change
instruments and levels in the song files. A first version:

- **Per-track instrument:** pick any bank instrument for any track, from the same list as the
  instrument page, and hear it straight away.
- **Per-track volume** (and maybe pan and mute or solo), with the meters showing each track.
- **Save:** keep the changes as the listener's own version of the song.

Later, it could grow into writing tracks too: editing notes, adding tracks, and building a song from
scratch, turning the app into a small DAW.

What it can build on: song files already set each track's instrument and volume (`inst=` and
`vol=` on the track line), the bank lists every instrument, the engine has a channel per track,
and `npm run balance` measures the levels a mixer would show.

Open questions:

- Where a saved version lives: on the device only, as a share link, or exported as `.song` text
  that can be committed as the song's new mix.
- Whether a saved version replaces the original in Radio and Jukebox or sits beside it.
- How it relates to Drumline Studio, the sibling step-sequencer app, which is already a grid
  editor.

## A DJ mode

The songs are scores, not audio files, so some DJ tricks come almost free. Save as WAV already
exports any song in any style for a normal DJ setup; a DJ mode inside the app would add:

- **Tempo:** a tempo control and a BPM display. Changing tempo just plays the notes faster, so there
  is no pitch shift or time-stretch warble.
- **Stems:** mute and solo per track. Every track already has its own channel in the engine.
- **Loops:** hold a section (a drum intro, a breakdown) while mixing the next song in.
- **Live remix:** style changes already work mid-song, so a set can fade a track from Techno into
  Ambient in a breakdown.
- **Two decks and a crossfader:** the biggest piece: two engines playing at once, beat-matched.

The first three are small; the two decks are a real project.

## Fix the mixes `npm run balance` flags

A run of `npm run balance` over all 56 songs (November 2026) passed 21 and flagged 35. Listen to
each flagged song before changing it: a flag is either a real mix problem (fix the track's
`vol=`, in its generator too if the song is generated) or a deliberate choice (explain it with a
`# balance-ok` line), and a few may be a track named for the wrong role.

- **The bass rules (29 songs):** bass louder than the lead, or its low end over the kick. The
  check flagged these before the playing-loudness rules too. Some suggestions look wrong (Can-Can:
  turn the bass down 27 dB), so check the bass rule itself before changing songs for it. Flagged:
  Can-Can, Canon in D, Cartographer, Eine Kleine Nachtmusik, Exit Sign, God Rest Ye, Good King
  Wenceslas, Hark the Herald, Ivory and Ash (both), Jingle Bells, Joy to the World, Korobeiniki,
  Lantern Ward, Midnight Underpass, Mountain King, Night Shift, Nocturne, O Christmas Tree, Ode
  to Joy, Porch Light, Save Point, Shortwave, Silent Night, Swan Lake, Third Rail, Underpass,
  Valkyries, When the Saints.
- **The playing-loudness rules (16 songs), parts buried under the lead:**
  - Ivory and Ash: strings, synth, cello, arp and piano under the guitar. The guitar is probably
    too loud.
  - The Silent Keep: the strings pad under the lead in 16 sections, the cello in 4.
  - Midnight Arcade: echo, in 6 sections. Shortwave: sample, in 4. Exit Sign: clean, in 3.
  - Eine Kleine Nachtmusik, God Rest Ye: harmony, in 1 section each.
- **The playing-loudness rules, parts louder than the lead:**
  - Valkyries: brass and winds over the strings.
  - O Christmas Tree: melody and arp over the harmony track. The lead role may be on the wrong
    track.
  - The Black Coach: flute and horns over the violins.
  - One section each: Confetti Cannon (pad), Hot Wire (vox), Midnight Underpass (hook), The
    Gilded Hour (musicbox), Third Rail (keys), Underpass (hook).

Start with The Silent Keep and Ivory and Ash, which have the most buried parts.

## Smaller ideas

- **Safe-notes helper for composers:** list the notes that fit each chord of a song's `# chords:`
  map, so model-written songs clash less.
- **Instrument page link:** link the instrument page (`instruments.html`) from the ⓘ panel.
