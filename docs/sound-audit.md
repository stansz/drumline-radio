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
| `strings` | 15 harmonics, 1961 Hz centroid at G4; 2/57/41 low/mid/high at G4 | Cuts well; the string work paid off. |
| `string-pad` | 6 harmonics, 902 Hz centroid at G4; 45/51/4 low/mid/high at C4 | Balanced ensemble pad. |
| `warm-pad` | 3 harmonics, 530 Hz centroid at G4; **93/6/1 low/mid/high at A3**, 67/32/1 at E4 | Too much sub and low-mid; likely muddies the bass. |
| `choir-ooh` | **94/6/0 low/mid/high at A3** | Much darker than `choir-aah` (7/91/2); can turn to mud under a verse. |
| `poly-stab` | **77/18/5 low/mid/high at G3**, 99/0/3 at C3 | Low-mid build-up in the chord stabs. |
| `fm-pluck` | 2 harmonics half a second in at G4; 82/12 mid/high at C5, 54/46 at C6 | The FM character is in the attack; the tail is nearly a sine. |
| `synth-bass` | 10 harmonics, 310 Hz centroid at E2 | Punchy and present; no clean sine sub layer. |

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

### 1. No chorus, ensemble, or stereo spread

`voices.ts` sums every oscillator into one mono target; stereo width comes only from the track pan,
reverb, and delay. The Juno-style chorus is one of the defining synthwave ingredients: MusicRadar's
Juno pad tutorial ends with chorus as the step that "fattens things up", and Futureproof's synthwave
guide lists subtle chorus and detune under "analog warmth & imperfection". The current detuned
oscillator pairs beat in mono; they do not spread.

**Proposal:** add an optional chorus/ensemble stage to `SynthPatch` (rate, depth, mix) or a style
effect, and apply it in `playSynth`. A cheaper first version is per-oscillator pan for detuned pairs,
but a slow modulated delay is closer to the Juno sound. This is shared engine code and needs tests
and level checks.

**Impact:** high. **Effort:** medium.

### 2. `warm-pad` is bottom-heavy

Current patch: two saws at ±12 cents plus a triangle at `octave: -1`, a 1400 Hz low-pass, and no
high-pass. At A3 the low band is 93% of the energy, and at E4 it is still 67%. Pad-mixing guides
consistently recommend a high-pass around 200–400 Hz to stop a pad masking the bass and low mids.

**Proposal:** either re-voice the patch (drop or reduce the -1 triangle, add a quiet +1 octave layer,
raise the filter slightly) or add an optional high-pass field to the patch format. Patch-only is the
safer first experiment; the engine high-pass is reusable for `poly-stab` and other pads.

**Impact:** medium-high. **Effort:** low for a patch re-voice, medium for a new filter field.

### 3. `choir-ooh` is extremely dark

The "oo" vowel formants sit at 325, 700, and 2530 Hz and are narrow. At A3, 94% of the measured energy
is below 300 Hz, against 7% for `choir-aah`. It is a useful dark colour, but under a verse it can
become indistinguishable from the pad.

**Proposal:** add a presence band around 1.2–2.5 kHz (broad `q`, low gain), widen the upper bands, or
raise the patch's 3000 Hz low-pass. Compare the result with `choir-aah` and with the `vox-lead`
formants, which were widened for exactly this reason.

**Impact:** medium. **Effort:** low.

### 4. `poly-stab` builds up low-mid

At G3, 77% of the energy is below 300 Hz; at C3 it is 99%. The patch is two detuned saws at the
written pitch with a 1800 Hz low-pass; the low weight comes from the chord voicings themselves.

**Proposal:** add a high-pass around 200–300 Hz, or re-voice the stab with a brighter +1 octave layer
and less root weight. A high-pass is cleaner, but needs the new filter field. For a patch-only test,
try a band-pass around 1200–1600 Hz with a low `q` and compare the mix.

**Impact:** medium. **Effort:** low to medium.

### 5. `fm-pluck` is attack-only

The FM index decays in 0.2 s, so half a second in the tone is nearly a sine. FM pluck references
suggest 1:3 or 1:4 modulator ratios with a fast index decay for a more metallic or marimba-like
attack. The current 1:2 ratio is the soft, harmonic option.

**Proposal:** add a new bank patch rather than changing `fm-pluck` in place, because Techno uses it
as a counter-line. Try ratio 3 or 4, index around 2.5–3, a shorter index decay, and a quiet
triangle or saw layer for body. Use it with `inst=` where a brighter arp is wanted.

**Impact:** low to medium. **Effort:** low.

### 6. Velocity only changes gain

The only velocity-aware parameter is the FM block's `velocity`; otherwise a soft note is just a
quieter version of a hard one. Synth-pluck and stab references use velocity-to-filter-envelope
amount for natural dynamics: soft notes darker, hard notes brighter.

**Proposal:** add an optional `velFilter` (0–1) to `SynthPatch`, apply it to the filter envelope
amount in `playSynth`, and set it on `pluck`, `poly-stab`, and `synth-bass`. Default it to 0 so every
existing patch keeps its exact sound. A related optional `filterAttack` would let pads and strings
open more slowly, but is less urgent.

**Impact:** high for feel. **Effort:** medium.

### 7. `synth-bass` could use a pure sine sub and a little drive

The patch is a saw plus a square an octave down through a 500 Hz low-pass with a strong filter
envelope. It is punchy, but it has no clean sine sub layer, and synthwave bass guides commonly layer
saw/square with a sine sub and light saturation.

**Proposal:** try a quiet sine at `octave: -1` and `drive: 0.05–0.1`. Check the low-end balance
against the kick and against songs that already add `sub-bass`; the extra layer may make those songs
too heavy.

**Impact:** medium. **Effort:** low.

### 8. Strings: optional bow noise

The current strings already use formants and delayed vibrato. A very quiet `breath` band around
3–5 kHz could add bow rosin, but it risks hiss and the existing 3 kHz formant already supplies the
bow edge. Leave this until the P1 and P2 changes are judged.

**Impact:** low. **Effort:** low, but easy to overdo.

## Suggested order

1. **P1:** chorus/ensemble width; re-voice `warm-pad`; add presence to `choir-ooh`.
2. **P2:** velocity-to-filter; `synth-bass` sine sub and light drive; `poly-stab` high-pass; an
   FM pluck variant.
3. **P3:** optional bow noise; filter attack.

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
