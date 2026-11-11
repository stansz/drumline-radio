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
| Afterglow Avenue | Synthwave | DeepSeek V4.1 Flash | — | — | Arp and home-style kit reworked after listening (FM pluck, 909 kit) |
| Starlight Drive | Synthwave | Ling 3.1 Flash | $0.045 / $0.135 | about $2 | None (it fixed its own mix with `npm run balance`) |
| Sunliner | Synthwave | Arena Agent | — | free | None (it fixed its own mix with `npm run balance`) |
| Signal Fire | Techno | MiniMax M3.1 Flash | — | about $0.40 | None (it fixed its own mix with `npm run balance`) |
| Dusk Over Dunmere | Chiptune | MiMo v2.6 Pro | $0.3263 / $0.6525 | about $0.20 | None (it caught its own loud bass with `npm run balance`) |
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

Claude's own originals (Night Shift, Save Point, Underpass, Ivory and Ash, Last
Stop) aren't listed, and neither is Midnight Arcade (Claude's first, reworked by MiMo v2.6 Pro).

## Entries

### Afterglow Avenue — DeepSeek V4.1 Flash (2026-11-10)

- **Brief:** a melody-first synthwave song, 3:30-4:30, clearly different from Midnight Arcade
  (98 BPM, E minor) and Sunliner (118 BPM, D major): a hummable saw-lead hook with a clear motif, a
  verse melody of its own, a chorus that lifts, and a last chorus up a key. Use the Synthwave roles,
  keep the registers apart, add microtiming, and fix every balance flag.
- **Followed well:** A minor at 108, between the two existing synthwave tempos; a 120-bar form
  (intro, verse, pre, chorus, verse, pre, chorus, bridge, build, last chorus, outro); the hook's
  rising fourth A-C-F-A and its descending answer; a separate verse melody; a 3+3+2 stab groove and
  a five-note syncopated FM-pluck arp and the 909 kit in the home mix, with remixes keeping their
  own style's kit; the square lead answers in the gaps and echoes the lead a bar late in the
  bridge; the last chorus up a whole step to B minor; 0 clashes and 0 off-chord.
- **Missed at first:** parse errors from a few bars with a quarter rest where an eighth was needed
  and from a ten-token half-time drum pattern; the balance check then flagged the arp 8-9 dB under
  the lead in the second half.
- **Fixed by itself before handing over:** corrected the bar lengths, named the colour tones in the
  chord map (G6, F6, A6, Dm7, Em7, G7, Am9, F#sus4), dropped the pad chord tone that clashed with
  a held lead note (the fifth of F6, the third of Am9), and raised the arp track and its velocities
  until `npm run balance` printed no flags. The square lead was raised so its answers read above the pad. The song is hand-written,
  so there is no generator and no drift entry.
- **Reworked after listening:** the first version shared Midnight Arcade's saw-pluck arp texture,
  so the arp moved to a brighter bank `fm-pluck-bright` and to a syncopated five-note eighth/rest
  figure (root, fifth, octave, third, ninth). The home-style drums moved from the gated kit to the 909 kit, set
  with `inst.synthwave=909-kit` so other styles keep their own kits. It no longer shares a patch or
  a rhythmic shape with another Synthwave arp; `check:songs` still reports 0 clashes and 0
  off-chord, and `balance` no flags.
- **Credit:** the harness reports `deepseek-flash`; its model list names that id "DeepSeek V4.1
  Flash", so that is the credit. The app shows the family, DeepSeek.

### Sunliner — Arena Agent (2026-11-09)

- **Brief:** the same italo-disco synthwave brief as Starlight Drive: 118 BPM, a major key, 3:45-4:15,
  a wordless vox-lead hook (mostly A3-A4, never above C5) as the star, choir-ooh under the verses and
  choir-aah lifting the choruses and the breakdown, an octave-bouncing eighth-note bass,
  four-on-the-floor gated kit with open hats on the off-beats and claps on 2 and 4, poly stabs, a
  pluck arp, and a saw lead answering between phrases. Sunny and danceable, not moody; clearly
  different from Midnight Arcade (98 BPM, E minor) and Underpass (124 BPM, F minor); pop-dance form
  with a kick-less breakdown and a last chorus up a whole step.
- **Followed well:** D major at 118 on the offbeat-stab side of the style rather than Starlight
  Drive's Bb shimmer; one chord map declared in `# chords:` lines, 0 clashes and 0 off-chord; an
  eleven-section 120-bar form (intro, verse, pre, chorus, verse, pre, chorus, breakdown, build, last
  chorus, outro) with something new every 8 or 16 bars; registers kept apart (bass in octaves 1-2,
  choirs and stabs in the middle, the hook A3-B4 with the saw answers D5-G5); the saw only plays the
  bars the hook rests in, never doubling it; microtiming on the hook, the stabs, the hats and the
  bass's off-beats, uneven hat and arp velocities.
- **Missed at first:** a lot. Three rounds of parse errors from short bars (the held two-bar hooks
  and the saw answers), then 12 off-chord notes where the hook's held colour tones sat over plain
  triads, then the mix: the choirs and pad about 11 dB under the hook, the arp 25 dB under it in the
  breakdown, and the bass a shade loud.
- **Fixed by itself before handing over:** declared the sevenths the hook implies (F#m7, G#m7, Bm7)
  in the chord map instead of flattening the melody, re-voiced the intro pickup and the verse answers
  onto them, raised the pad, both choirs and the arp and dropped the bass, and brought the arp back
  through the breakdown's second half; `npm run balance` then reported no flags.
- **Firsts:** the first song to declare seventh chords in its `# chords:` map (the m7 aliases in
  `src/music/chords.ts` were already there), and the first Synthwave original with a 120-bar form
  built from a bespoke generator under `tools/arranger/`, so it is in `tests/drift.test.ts`. Its own
  `tests/sunliner.test.ts` pins the header, the 120-bar form, the hook's A3-B4 ceiling, the whole-step
  final chorus, the saw's rests and the breakdown, and nothing outside the song. The credit is the
  harness's own name, Arena Agent (Arena's Agent Mode); the run does not disclose which model was
  behind it, so no model id is claimed and the price fields stay "—".

### Starlight Drive — Ling 3.1 Flash (2026-11-09)

- **Brief:** an upbeat italo-disco synthwave track in the spirit of Mitch Murder and early Giorgio
  Moroder: 118 BPM, Bb major, 3:45-4:15, a wordless vox-lead hook (mostly A3-A4) as the star,
  choir-ooh under the verses and choir-aah lifting the choruses and a kick-less breakdown,
  octave-bouncing eighth-note bass, four-on-the-floor gated kit with open hats and claps on 2 and 4,
  poly stabs, a pluck arp, and a saw lead answering between phrases. Pop-dance form with a last
  chorus up a whole step.
- **Followed well:** major-key disco groove, clearly different from Midnight Arcade (98 BPM, E minor,
  moody) and Underpass (124 BPM, F minor, heroic); one chord map declared in `# chords:` lines,
  0 off-chord, 0 clashes; registers kept apart (bass in octaves 1-2, choirs and stabs in the middle,
  the hook Bb3-A4 with the saw answers above it); microtiming on the hook (+14 late phrase starts,
  -4/-6 pushes inside the phrases), stabs (+10 to +24), and hats (-6), a push on the bass's off-beats,
  uneven hat/arp/clap velocities; the claps on their own track so they drag behind the beat while the
  kick stays on the grid; both chorus halves and the repeated choruses are exact copies, so the hook
  stays put.
- **Missed at first:** the mix. The first `npm run balance` had the choirs and pad 11 dB under the
  hook and the arp peaking 14 dB under it.
- **Fixed by itself before handing over:** choirs, pad, and arp up, claps down a touch; the balance
  then reported no flags.
- **Firsts:** the first song to use the bank's choir-aah and choir-ooh, and the first Synthwave
  original to reach bank instruments with `inst=bank:` (the vox lead and both choirs): no style maps
  a local name to them, so plain `inst=vox-lead` in Synthwave would fall back to the style's lead
  patch. The credit is the harness's own model report (PI_MODEL=inclusionai/ling-3.1-flash), written
  as Ling 3.1 Flash; Ling went onto MODEL_FAMILIES in `src/ui/view.ts`.
- **Cost:** about $2, the dearest run per token by far: at $0.045 / $0.135 per 1M it read about
  40M tokens over a very long run. By its own account it read whole files instead of searching
  them, wrote a 500-line generator for the score, threw it away and wrote it again, read the
  1,000-line result in eight chunks, and took two rounds each of test and balance fixes. It also
  dropped the Signal Fire heading from this file (restored).

### Signal Fire — MiniMax M3.1 Flash (2026-11-08)

- **Brief:** a peak-time dance anthem, Techno, 132 BPM, F# minor, 4:00-4:30: a chopped vocal hook
  on the bank `vox-lead`, a rolling off-beat sub, punchy stabs, a dark pad in the breakdowns, a
  909 kit, and a DJ form with two builds and two drops.
- **Cost:** about $0.40.
- **Followed well:** the form (16-bar intro, a groove that adds the stabs, a 16-bar breakdown, an
  8-bar build, a 16-bar drop, an 8-bar breakdown, an 8-bar build, a 32-bar final drop with the
  hook doubled an octave up, a 16-bar outro); one chord map (F#m - D - A - E) for all 136 bars, and
  every pitched part written from it; the hook in octaves 4-5 over a sub in octaves 1-2 and stabs
  and pad in octaves 3-4; 0 clashes; the mix fixed by `npm run balance` before handing over.
- **Missed at first:** the balance. The stabs sat 14 dB under the hook and the pad 12 dB under it,
  and the bass was 3 dB over the hook, so the first mix had the vocal buried under the drums.
- **Fixed by itself before handing over:** stabs and pad up (and the stabs made denser in the
  drops), the bass down to 0.3 so it sits under the kick, the drums down to 0.58, the hook up to
  full velocity; the claps moved to their own track so they can sit behind the beat while the kick
  stays dead on the grid; a test for the song's own notes, form and header.
- **Fixed after:** nothing by me. Later, at SZ's ask: the chord stabs up about 3 dB, and the
  `vox-lead` patch reworked (it sounded like a flute; see Tool changes).
- **Tool changes from it:** a chord-map check (`# chords:` comment lines, and an off-chord count in
  `npm run check:songs`; Signal Fire now declares `F#m D A E` and has 0 off-chord); `npm run
  balance` compares pads and chords on both RMS and peak, so sparse stabs stop reading as buried;
  a song-format line that a group's count is of passes, not bars. Its hook also showed that the
  narrow vowel formants sound like a flute above C5, so `vox-lead` now uses wide soprano bands.
  Left out: section renders or spectrograms (a model can't hear them), a kick-on-grid check, and a
  build-shape check.

### Dusk Over Dunmere — MiMo v2.6 Pro (2026-11-08)

- **Brief:** slow wistful fantasy RPG theme, Chiptune, 88 BPM, 3/4, D minor with Dorian B naturals
  (the same brief as Wayfarer's Rest, written fresh without opening that file).
- **Cost:** about $0.20.
- **Followed well:** the form (arp intro, A, A with the counter, B lifting to F with a light march
  snare, a quiet arp-and-bass bridge ending on a dominant B, the E minor statement, a stepped
  ritardando outro to the lone arp); registers held apart (lead mostly octave 5, counter B4–F#5
  never crossing the lead, arp and pad octave 4, bass octaves 2–3); both early and late
  microtiming on the lead and counter; per-note uneven arp velocities; 0 clashes.
- **Missed:** the triangle bass sat 9–11 dB over the lead until `npm run balance` caught it. Six
  early (−N) microtiming offsets pulled notes under the *previous* bar's held pad tone (an F under
  an E, a B under a Bb) and were turned late to clear the clash check.
- **Fixed by itself before handing over:** bass volume 0.35 → 0.1, lead, arp, and pad up slightly,
  counter and drums trimmed so the lead stays on top.
- **Fixed after:** nothing. The first model song to pass every check as delivered (0 clashes, no
  balance flags, no shared code touched).
- **Tool changes from it:** a parse error that explains a whole-bar shortcut sharing its bar (and a
  song-format line that a new line doesn't start a bar); composing.md notes on early offsets
  clashing with the previous bar's pad and on the open-fifths pad; and a balance flag for an arp
  peaking more than 8 dB under the lead. Its idea of a "safe notes" helper was left for later.

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
