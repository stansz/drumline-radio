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

## Smaller ideas

- **Safe-notes helper for composers:** list the notes that fit each chord of a song's `# chords:`
  map, so model-written songs clash less.
- **Stabs and basses:** re-voice the near-duplicate stab and bass patches, as was done for pads,
  strings, winds and drum kits.
- **Older songs' mixes:** `npm run balance` still flags Midnight Arcade, Ivory and Ash, Exit Sign,
  Save Point, The Silent Keep, Night Shift and Shortwave's pluck.
- **Instrument page link:** link the instrument page (`instruments.html`) from the ⓘ panel.
