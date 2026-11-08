# Model notes

A record of the originals written by other AI models from the prompt in
[song-prompt.md](song-prompt.md): what each model cost, how well it followed the brief, what had
to be fixed afterwards, and which tool or doc improvements came out of it. The styles differ, so
this isn't a fair contest; it tracks how good each song sounded and how well each model followed
instructions.

Add an entry when a new model-written song lands. Leave a field as "—" when it isn't known rather
than guessing.

## Summary

| Song | Style | Model | Price in / out (per 1M) | Song cost | Fixes after |
| --- | --- | --- | --- | --- | --- |
| Dusk Over Dunmere | Chiptune | MiMo v2.6 Pro | — | — | Mix: bass 10 dB over lead |
| Wayfarer's Rest | Chiptune | Gemini 3.8 Flash | $0.75 / $3.75 | $1.25 | Mix: arp buried, bass too loud |
| Fathom | Techno | Qwen3.8 Flash | — | — | Mix: stabs buried |
| The Silent Keep | Cinematic | DeepSeek V4 Flash | — | — | Mix: strings buried |
| Riverfront | Techno | MiMo v2.6 Pro | $0.3263 / $0.6525 | $0.35 | Mix, deeper bass, new intro |
| Exit Sign | Alt rock | GPT-6.1 | — | about $3 | Clean guitar too loud |
| Porch Light | Alt rock | Grok | — | about $5 | Reworked by Claude (guitars, tempo, feel) |
| The Cartographer | Orchestral | Kimi | — | about $3 | — |
| Lantern Ward | Orchestral | Tencent HY 4 (with Claude) | — | — | — |
| Shortwave | Lo-fi | GLM (with Claude) | — | — | — |
| Third Rail | Lo-fi | DeepSeek | — | — | — |

Claude's own originals (Midnight Arcade, Night Shift, Save Point, Underpass, Ivory and Ash, Last
Stop) aren't listed.

## Entries

### Dusk Over Dunmere — MiMo v2.6 Pro (2026-11-08)

- **Brief:** slow wistful fantasy RPG theme, Chiptune, 88 BPM, 3/4, D minor with Dorian B naturals
  (the same brief as Wayfarer's Rest, written fresh without opening that file).
- **Cost:** —.
- **Followed well:** the form (arp intro, A, A with the counter, B lifting to F with a light march
  snare, a quiet arp-and-bass bridge ending on a dominant B, the E minor statement, a stepped
  ritardando outro to the lone arp); registers held apart (lead mostly octave 5, counter B4–F#5
  never crossing the lead, arp and pad octave 4, bass octaves 2–3); both early and late
  microtiming on the lead and counter; per-note uneven arp velocities; 0 clashes.
- **Missed:** the triangle bass sat 9–11 dB over the lead until `npm run balance` caught it. Six
  early (−N) microtiming offsets pulled notes under the *previous* bar's held pad tone (an F under
  an E, a B under a Bb) and were turned late to clear the clash check.
- **Fixed after:** bass volume 0.35 → 0.1, lead, arp, and pad up slightly, counter and drums
  trimmed so the lead stays on top.
- **Tool changes from it:** — (ideas left for later: a parse error that says a whole-bar shortcut
  merged with a neighbour when a line has no `|`; a note in composing.md that early offsets can
  overlap the ending pad of the bar before; a balance flag for an arp buried under the lead, which
  the docs care about but the tool doesn't check).

### Wayfarer's Rest — Gemini 3.8 Flash (2026-11-08)

- **Brief:** slow fantasy RPG theme, Chiptune, 88 BPM, D minor/Dorian.
- **Cost:** $1.25, run in pi with the repo cloned.
- **Followed well:** chose 3/4; kept the tempo, key, and the exact form (arp intro, A, A with
  counter, B in F, quiet bridge, E minor climax, ritardando outro); a B7 that sets up the E minor
  lift; credits, README, and test counts right; 0 clashes.
- **Missed:** the balance. The arp that drives the song sat about 23 dB under the lead (12 dB at
  its peaks), and the triangle bass was the loudest track, so it didn't run the balance check or
  ignored it. Microtiming was a uniform late push (+8 to +14 ticks) on phrase starts rather than
  varied. It changed shared code (`tools/browser/cdp.mjs`), against the prompt.
- **Fixed after:** arp velocities ×1.5 and volume 1, bass 0.38 → 0.16, pad 0.72 → 1.
- **Tool changes from it:** `npm run balance` (Gemini asked for a one-shot offline balance check,
  since `tracks.mjs` needs a server, a browser, and well-timed seek points: the likely reason its
  mix went unchecked); bar-length parse errors that list each token's ticks (it lost time to a
  sticky-duration slip); `SONG=` for checking one song; and the `RADIO_URL` override it added to
  `cdp.mjs`, kept and documented. Its idea of a per-bar pitch-class report was left for later.

### Fathom — Qwen3.8 Flash (2026-11-08)

- **Brief:** dub techno.
- **Fixed after:** chord-stab velocities ×1.25, echo up, sub and drums down.
- **Tool changes from it:** Qwen pointed out that RMS reads sparse parts low, so
  `tools/browser/tracks.mjs` now prints each track's peak too. It also flagged that seeking into a
  held note gives silence (documented) and that there are only 6 lane colours for 7+ tracks.

### The Silent Keep — DeepSeek V4 Flash (2026-11-07)

- **Brief:** cinematic metal epic.
- **Fixed after:** string velocities ×1.6 and volume 1, piano and bass down.

### Riverfront — MiMo v2.6 Pro (2026-11-07)

- **Brief:** melodic Detroit-style deep techno (the example brief in song-prompt.md).
- **Cost:** $0.35.
- **Fixed after:** stab velocities up, pad up, melody and bass down, low roots an octave lower for
  a deeper bass, and a new intro so it doesn't open like Night Shift.
- **Tool changes from it:** MiMo's feedback led to the wider clash check (every pitched part against
  the pad and bass, with a per-track breakdown) and the low-band column in `tracks.mjs`.

### Exit Sign — GPT-6.1 (2026-11-07)

- **Cost:** about $3.
- **Fixed after:** the clean guitar was too loud and was brought down.

### Porch Light — Grok (2026-11-07)

- **Cost:** about $5.
- **Fixed after:** reworked with Claude over many rounds into a slow, Ben Folds-style song: new
  guitar tones (the plucked-string guitar voice came from this), 72 BPM, piano, a simpler bass.
  Claude was added to the credits.

### The Cartographer — Kimi (2026-11-06)

- **Cost:** about $3.
- **Later changes:** counter-melody moved to the oboe; violins brought forward.
