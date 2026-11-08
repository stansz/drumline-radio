# New-song prompt

A prompt to give another model when you want a new original song. Fill in the `<...>` parts in the
brief, then paste everything from "Write a new original song" down. The rules part stays the same
for every song.

Before filling it in, list the originals that are already in the style, so the brief can steer
away from them:

```bash
grep -l "^category: originals" src/songs/*.song | xargs grep -E "^(title|style|key|tempo):"
```

## The prompt

```text
Write a new original song for Drumline Radio (this repo) in the <Style> style.

Read first: AGENTS.md, docs/composing.md (including its checks before committing),
docs/song-format.md, and docs/sound.md (the <Style> section and the instrument bank).

Brief:
- <Genre and feel in one line, with one or two reference artists, e.g. "melodic Detroit-style
  deep techno, not acid">.
- <Instruments and texture: what carries the song, what sits under it>.
- <Tempo> BPM, in <key>, about <length>.
- <Existing songs in this style> already exist. Make this one sound clearly different from
  them: <what to avoid, e.g. "less squelch, more chords and space">.
- <Form, e.g. "intro, verse, chorus, verse, chorus, bridge, last chorus, outro" or "DJ form
  with a breakdown and drops">. Change something every 8 or 16 bars.
- Make it feel human: small microtiming offsets (+N/-N ticks) on <which parts>, uneven
  velocities, and <swing or feel notes, if any>.
- Keep registers apart so parts don't fight: <bass low, chords mid, lead above, or the
  song's own plan>. The lead sits on top; the bass sits under the kick, never louder than it;
  chords and pads must be audible, not buried 10 dB under the lead.
- Use the <Style> style's roles and instruments; reach for other bank instruments only with
  inst= when a part really needs it. The whole bank, including instruments in no style (choirs,
  a vocal lead, oboe, pizzicato, and more), is in src/audio/instruments.ts with a comment on each.

Rules:
- Original melody only, nothing copyrighted.
- Credit yourself by your own model name in the composer field, the file's first comment,
  and the README entry (for example "<your name> & SZ"). If you are not sure of your exact
  model name, say so instead of guessing.
- Add the song to README.md and update the song counts in tests/library.test.ts. If a script
  in tools/arranger/ generates the song, add it to tests/drift.test.ts.
- Don't change shared code (styles, instruments, engine, arranger). If you add a test for
  this song, it must check only this song's own notes, form, and header.
- Run npm test and npm run check:songs; both must pass. Aim for 0 clashes; explain any that
  remain as deliberate (a passing note, a suspension, a jazz voicing). Check the balance with
  tools/browser/tracks.mjs at a quiet point and a busy one, as docs/composing.md describes,
  including the low-band column for the bass against the kick.
- Start your own dev or preview server for browser checks, and stop it (with its child
  processes) when you're done.
```

## Example brief

The brief that produced Riverfront (Techno, MiMo v2.6 Pro & SZ):

- Melodic, Detroit-style deep techno, not acid: warm chord stabs, a dark evolving pad, a hypnotic
  counter-line, and a rolling sub bass under a four-on-the-floor kit.
- 124 BPM, in F minor or A minor, about 4:00 to 4:30.
- Night Shift (130 BPM, D minor, acid-led) already exists: less squelch, more chords and space.
- Long DJ-style form: intro, groove, a breakdown where the kick drops and the pad and chords
  carry, a build, the full drop, and an outro.
