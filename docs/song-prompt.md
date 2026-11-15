# New-song prompt

A prompt to give another model when you want a new original song. Fill in the `<...>` parts in the
brief, then paste everything from "Write a new original song" down. The rules part stays the same
for every song. When the song lands, add an entry to [model-notes.md](model-notes.md).

Before filling it in, list the originals that are already in the style, so the brief can steer
away from them:

```bash
SIBLINGS=<style> npm run check:songs
```

It lists the style's songs with their key, tempo, bars, length, kit, bass, lead instrument and
parts, so the brief can name a lineup, a form shape and a melodic motion that differ.

For a style with a block under [Style notes](#style-notes) below, paste that block after the
Rules. Those styles ask for melody, harmony and orchestration that models tend to fill with stock
choices; the block asks for a plan first and for numbers that show the song avoided them.

## The prompt

```text
Write a new original song for Drumline Radio (this repo) in the <Style> style.

Read first: AGENTS.md, docs/composing.md (including its checks before committing),
docs/song-format.md, and docs/sound.md (the <Style> section and the instrument bank).

Brief:
- <Genre and feel in one line, with one or two reference artists, e.g. "melodic Detroit-style
  deep techno, not acid">.
- <Lead instrument and lineup, chosen to differ from the existing songs in this style: run
  SIBLINGS=<style> npm run check:songs and name what they use>.
- <Tempo> BPM, in <key>, about <length>.
- <Existing songs in this style> already exist. Make this one sound clearly different from
  them: <what to avoid, e.g. "less squelch, more chords and space">.
- <Form, e.g. "intro, verse, chorus, verse, chorus, bridge, last chorus, outro" or "DJ form
  with a breakdown and drops">. Change something every 8 or 16 bars.
- <How the form builds, different from the existing songs in this style>.
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
- Build it the way docs/composing.md's "Pick how to build it" says: by default as its own
  script, tools/arranger/<song>.mjs, started from tools/arranger/lib.mjs (never from another
  song's script) and added to tests/drift.test.ts. Every musical choice goes in your script.
  Say which way you built it, and why if it is not a script. For a script, run
  npm run check:generators and fix every copy of lib.mjs plumbing it lists.
- Add the song to README.md.
- Don't change shared code (styles, instruments, engine, arranger). The one exception is
  tools/arranger/lib.mjs: a plumbing helper your script needs that another script already has
  moves there, never a musical choice. If you add a test for this song, it must check only this
  song's own notes, form, and header.
- Run npm test and npm run check:songs; both must pass. Aim for 0 clashes; explain any that
  remain as deliberate (a passing note, a suspension, a jazz voicing). Check the balance with
  npm run balance -- <song> (one command, the whole song, no server to manage) and fix every
  flag it prints, as docs/composing.md describes.
- Start your own dev or preview server for browser checks, and stop it (with its child
  processes) when you're done.
```

## Style notes

A block for each style where models' first drafts have come out generic. Paste the style's block
after the Rules. A style gets a block once a song in it has taught a lesson; each block says which.
Loop-based styles such as Techno and Synthwave don't need one so far.

### Orchestral

Written after The Gilded Hour, whose first version led with the style's default strings over the
same horns, harp, string pad, cellos, glockenspiel and timpani as every other Orchestral original,
with chord-tone themes that were two-thirds leaps.

```text
Style notes (Orchestral):
- Plan first. Before writing any notes, put in your report and in the song file's first
  comment: the lineup (each track, its role and its instrument), the motif (its notes and
  rhythm), and the form as bar ranges with what enters, leaves and develops in each. Then
  write the music to that plan.
- Lineup: SIBLINGS=orchestral npm run check:songs shows that most Orchestral songs lead with
  Strings over FM brass, concert harp, string pad, low strings, glockenspiel and timpani. Lead
  with something else, and take at least one other main part from outside that set, with inst=
  or inst=bank: (for example grand-piano, cello, string-section, string-bass, choir-aah,
  choir-ooh, pizzicato, nylon-guitar, music-box, fm-bells). Not every song needs timpani, harp
  or a glockenspiel.
- Melody: build the tune from a short motif (two to four beats) and develop it: repeat it,
  sequence it up or down, invert it, stretch its rhythm, answer it. Move mostly by step, and
  keep leaps for a phrase's high point and its turn. A tune built from chord tones comes out
  leap-heavy and sounds like every other one. npm run report:song should show steps at 50% or
  more on the melody line.
- Harmony: write phrases that go somewhere and end in cadences (a half cadence midway, a full
  cadence at the end), use secondary dominants or a borrowed chord where a phrase needs colour,
  and change key for a contrasting section. Don't loop four chords under everything.
- Texture: let parts rest. The pad and the bass should not play in every bar; a section with
  only two or three parts makes the full sections land. Give each section its own texture.
- Report back: the melody line from npm run report:song (steps and leaps), the song's row from
  SIBLINGS=orchestral npm run check:songs (lead and parts), and in which sections the pad and
  bass rest.
```

### Cinematic

Written after The Gilded Hour's lesson, for the same pull in Cinematic: both Cinematic originals
(Ivory and Ash, The Silent Keep) are slow minor-key pieces at 66-70 BPM led by the style's default
lead guitar over the grand piano, solo cello and string section, with melodies under half steps.

```text
Style notes (Cinematic):
- Plan first. Before writing any notes, put in your report and in the song file's first
  comment: the cue's story in one sentence (what happens from start to end), the lineup (each
  track, its role and its instrument), the main theme's motif (its notes and rhythm), and the
  form as bar ranges with what builds or breaks in each. Then write the music to that plan.
- Lineup: SIBLINGS=cinematic npm run check:songs shows the Cinematic originals lead with the
  overdriven lead guitar over grand piano, solo cello and string section. Lead with something
  else, and take at least one other main part from outside that set, with inst= or inst=bank:
  (for example vox-lead, choir-aah, fm-brass, synth-pad, music-box, nylon-guitar, fm-bells,
  pizzicato, dark-pad, or an analog synth ostinato). Use the kit as part of the drama (hits,
  rolls, silence), not as a steady beat throughout.
- Tempo and mood: not another slow minor ballad. Pick a cue type with its own pulse: a chase,
  a tension build, a sense of wonder or discovery, a march, a montage. Choose a tempo and key
  that fit it and differ from 66-70 BPM in C or E minor.
- Melody: one memorable theme built from a short motif, stated, developed and finally stated in
  full. Move mostly by step with leaps for the climaxes; npm run report:song should show steps
  at 50% or more on the melody line.
- Harmony and tension: use the film-scoring tools: an ostinato that drives, a pedal note under
  moving chords, a rising sequence, a chromatic or modal shift for a turn in the story, and a
  cadence or a deliberate non-resolution at the end. Don't loop four chords under everything.
- Shape: give it a real arc, with quiet sections where most parts rest so the big moments land,
  and a clear climax. The pad and the bass should not play in every bar.
- Report back: the melody line from npm run report:song (steps and leaps), the song's row from
  SIBLINGS=cinematic npm run check:songs (lead and parts), the climax bars, and where the pad
  and bass rest.
```

## Example brief

The brief that produced Riverfront (Techno, MiMo v2.6 Pro & SZ):

- Melodic, Detroit-style deep techno, not acid: warm chord stabs, a dark evolving pad, a hypnotic
  counter-line, and a rolling sub bass under a four-on-the-floor kit.
- 124 BPM, in F minor or A minor, about 4:00 to 4:30.
- Night Shift (130 BPM, D minor, acid-led) already exists: less squelch, more chords and space.
- Long DJ-style form: intro, groove, a breakdown where the kick drops and the pad and chords
  carry, a build, the full drop, and an outro.
