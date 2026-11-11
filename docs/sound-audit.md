# Instrument bank audit

A measured look at the sounds in the bank: what is already healthy, what measures muddy or dark,
and which changes are most likely to improve them. This is an audit and a proposal, not a
description of current behaviour; nothing here has been built unless it says so. The bank itself is
in [instruments.ts](../src/audio/instruments.ts), and the patch format is explained in
[sound.md](sound.md).

Measured on 2026-11-10 with `tools/browser/timbre.mjs` and `tools/browser/levels.mjs`. `timbre.mjs`
samples half a second after the attack, so it describes the settled tone rather than a pluck's
transient. `levels.mjs` prints the energy below 300 Hz and above 3 kHz; its bands overlap on very low
notes, so use the split for relative comparison, not as exact percentages.

## Summary

| Patch | Measurement | Read |
| --- | --- | --- |
| `saw-lead` | 8 harmonics, 1081 Hz centroid at G4; 8/78/14 low/mid/high at A4, 4/79/17 at C5 | Bright enough to lead; don't brighten blindly. |
| `strings` | 18 harmonics, 1999 Hz centroid at G4; 4/54/42 low/mid/high at G4 | Bow-noise breath added; still cuts without hiss. |
| `string-pad` | 6 harmonics, 902 Hz centroid at G4; 45/51/4 low/mid/high at C4 | Balanced ensemble pad. |
| `warm-pad` | 6 harmonics, 942 Hz centroid at G4; 16/82/2 low/mid/high at G4, 69/29/2 at C4, 33/65/2 at E4 | Re-voiced: less sub, more mid; no longer masks the bass. |
| `choir-ooh` | 12 harmonics, 1185 Hz centroid at C4; 81/15/4 low/mid/high at A3 | Presence band added; no longer turns to mud under a verse. |
| `poly-stab` | 55/40/5 low/mid/high at G3, 60/35/5 at C3, 43/51/6 at C4 | High-passed at 320 Hz; clears the low-mid build-up. |
| `fm-pluck` | 2 harmonics half a second in at G4; 82/12 mid/high at C5, 54/46 at C6 | The FM character is in the attack; the tail is nearly a sine. |
| `fm-pluck-bright` | 3 harmonics, 648 Hz centroid at G4; 5/84/11 at C5 | Brighter FM variant; Afterglow's arp uses it. |
| `synth-bass` | 10 harmonics, 309 Hz centroid at E2; sine sub + light drive | Fuller low end; level-matched to the old bass. |

## What is healthy

- **Strings.** The three detuned saws, three formants, bow-like 3 kHz edge, and delayed vibrato give
  15 harmonics and 40% of the energy above 3 kHz. This is already a cutting string lead; the
  Sound on Sound bowed-string recipe uses the same broad ideas (filter, formant body, delayed
  vibrato). Leave it alone unless an A/B proves otherwise.
- **`string-pad`.** The four-saw ensemble plus broad formants measures balanced and is not buried.
- **`saw-lead`.** Eight harmonics with a centroid near 1 kHz puts it in the "cuts through" range
  without being harsh. The saw-pluck and square-lead already cover brighter variants.
- **`synth-bass`.** Ten harmonics at a 310 Hz centroid is a present, filtered bass. The songs that
  need more sub already add the separate `sub-bass` track.
- **Kits.** The gated snare's 0.25 s gate is inside the 20–700 ms range used in 80s-style gated
  reverb, and the 909 kick's 48 Hz fundamental sits in the 40–60 Hz pocket used by 909-style kicks.
  They are already clearly different from each other.

## The real gaps

### 1. Chorus/ensemble (built)

`voices.ts` used to sum every oscillator into one mono target; stereo width came only from the track
pan, reverb, and delay. The Juno-style chorus is one of the defining synthwave ingredients:
MusicRadar's Juno pad tutorial ends with chorus as the step that "fattens things up", and
Futureproof's synthwave guide lists subtle chorus and detune under "analog warmth &
imperfection".

**Built:** `SynthPatch` now has an optional `chorus` (rate, depth, mix). It is two 18 ms delay lines
modulated in opposite directions, panned left and right, under a dry centre. `warm-pad`,
`choir-aah`, and `choir-ooh` opt in; everything else is unchanged. The lead patches stay dry for now:
adding chorus to `saw-lead` and `vox-lead` pushed them over the balance thresholds in Midnight
Arcade, Sunliner, and Starlight Drive, so the width lives on the pads and choirs until a per-song
level pass is worth doing. See [sound.md](sound.md). Both P1 re-voices are now built below.

### 2. `warm-pad` is bottom-heavy (built)

The old patch was two saws at ±12 cents plus a triangle at `octave: -1`, a 1400 Hz low-pass, and no
high-pass. At A3 the low band was 93% of the energy, and at E4 it was still 67%. Pad-mixing guides
consistently recommend a high-pass around 200–400 Hz to stop a pad masking the bass and low mids.

**Built:** the sub-octave triangle is gone, replaced by a triangle at the written pitch and a quiet
`+1` octave saw. The low-pass moved from 1400 to 1700 Hz, and the gain was re-matched to 0.24. At G4
the patch moved from 3 harmonics / 530 Hz to 6 / 942 Hz; at C4 the split moved from 84/15/1 to
69/29/2, and at E4 from 67/32/1 to 33/65/2. Afterglow Avenue, Midnight Arcade, and Sunliner still
balance with no flags. The new high-pass field is used on `poly-stab` below.

### 3. `choir-ooh` is extremely dark (built)

The "oo" vowel formants sit at 325, 700, and 2530 Hz and are narrow. At A3, 94% of the measured energy
is below 300 Hz, against 7% for `choir-aah`. It is a useful dark colour, but under a verse it can
become indistinguishable from the pad.

**Built:** `choir-ooh` keeps the three `oo` bands and adds a broad 1.8 kHz presence band. At A3 the
split moved from 94/6/0 to 81/15/4, its centroid is now 1185 Hz, and Sunliner still balances cleanly.
The upper three bands and the 3000 Hz low-pass are otherwise unchanged.

### 4. `poly-stab` builds up low-mid (built)

The old patch measured 77% of its energy below 300 Hz at G3 and 99% at C3. It is two detuned saws at
the written pitch with a 1800 Hz low-pass; the low weight came from the chord voicings themselves.

**Built:** `SynthPatch` now has an optional `highpass { hz, q }` before the main filter, and
`poly-stab` uses 320 Hz. The split moved from 77/18/5 to 55/40/5 at G3, from 99/0/3 to 60/35/5 at C3,
and from 49/45/6 to 43/51/6 at C4. Afterglow Avenue and Sunliner balance with no flags; Starlight
Drive keeps only its localized arp breakdown flag. The stabs' peak rose a few dB because the
high-pass exposes the transient; the mix still leaves them under the lead.

### 5. `fm-pluck` is attack-only (built)

The FM index decays in 0.2 s, so half a second in the tone is nearly a sine. FM pluck references
suggest 1:3 or 1:4 modulator ratios with a fast index decay for a more metallic or marimba-like
attack. The current 1:2 ratio is the soft, harmonic option.

**Built:** `fm-pluck-bright` is a new bank patch with ratio 3, index 4, a 0.1 s index decay and a
quiet clean triangle for body. Afterglow Avenue's arp uses it; Techno keeps the original `fm-pluck`
as its counter-line. At G4 it measures 3 harmonics and a 648 Hz centroid, against 2 / 561 Hz for the
old patch; the difference is mostly in the attack, which is the point.

### 6. Velocity only changes gain (built)

The only velocity-aware parameter was the FM block's `velocity`; otherwise a soft note was just a
quieter version of a hard one. Synth-pluck and stab references use velocity-to-filter-envelope
amount for natural dynamics: soft notes darker, hard notes brighter.

**Built:** `SynthPatch` has an optional `velFilter` (0–1), applied to the filter envelope amount in
`playSynth`. The pure helper is `velocityFilterAmount` in `curves.ts`. `pluck` uses 0.6, `poly-stab`
0.65, and `synth-bass` 0.5; every other patch keeps its exact old sound. A related optional
`filterAttack` would let pads and strings open more slowly, but is still unbuilt.

### 7. `synth-bass` could use a pure sine sub and a little drive (built)

The patch was a saw plus a square an octave down through a 500 Hz low-pass with a strong filter
envelope. It was punchy, but had no clean sine sub layer, and synthwave bass guides commonly layer
saw/square with a sine sub and light saturation.

**Built:** `synth-bass` now layers a clean sine an octave down (level 0.25) under the saw and square,
with `drive: 0.07`. The gain came down to 0.24 to keep the mix level. Sunliner and Starlight Drive
keep their bass under the lead; Afterglow and Midnight Arcade balance with no flags.

### 8. Strings: optional bow noise (built)

The strings already used formants and delayed vibrato. A very quiet `breath` band around 3�5 kHz
could add bow rosin, but it risks hiss and the existing 3 kHz formant already supplies the bow edge.

**Built:** `strings` has a quiet `breath` band at 5 kHz (level 0.12, q 1.2). It moved the patch from
15 to 18 harmonics and the centroid from 1961 to 1999 Hz without changing its level. The orchestral
balance reports other, pre-existing parts, not the violins.

## Suggested order

1. **P1:** chorus/ensemble width (built); re-voice `warm-pad` (built); add presence to `choir-ooh`
   (built).
2. **P2:** `poly-stab` high-pass (built); velocity-to-filter (built); `synth-bass` sine sub and
   light drive (built); an FM pluck variant (built).
3. **P3:** bow noise (built); filter attack remains unbuilt.

## How to make the changes safely

Shared patches affect every song. Prefer new bank patches or opt-in fields whose defaults preserve
the old sound, as the bank has done for other added fields. For every change:

- Run `npm test` and `npm run check:songs`.
- Run `npm run balance -- <song>` for each affected song, and `all` for a style-wide change.
- Level-match with `node tools/browser/levels.mjs old-id:60,new-id:60`: keep RMS within about 1 dB
  and compare the low/mid/high split, not just the RMS.
- Re-run `timbre.mjs` on the changed patch. Remember that its half-second window describes the
  settled tone, not a pluck's attack.

## Sources

- [MusicRadar: How to create an '80s Juno-style pad sound](https://www.musicradar.com/how-to/how-to-create-an-80s-juno-style-pad-sound)
- [Futureproof Music School: How to Make Synthwave Music](https://futureproofmusicschool.com/blog/dive-into-synthwave-create-your-own-sound-today)
- [Syntorial: How To Make A Synthwave Bass](https://www.syntorial.com/tutorials/synthwave-bass/)
- [Orpheus Audio Academy: How To Make An 80s Synthwave Snare Sound](https://www.orpheusaudioacademy.com/synthwave-snare/)
- [Armon: Pluck design](https://armonai.app/en/lessons/pluck-design)
- [Sound on Sound: Practical Bowed-string Synthesis](https://www.soundonsound.com/techniques/practical-bowed-string-synthesis)
- [Ace Studio: Synth Pads Explained](https://acestudio.ai/blog/synth-pads-explained/)
- [LANDR: What is a 909?](https://blog.landr.com/what-is-a-909/)
