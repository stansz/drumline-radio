// The instrument bank: every instrument once, under a unique id, grouped by family.
// A style picks instruments from it in styles.ts.

import { drums, env, osc, synth, VOWELS } from './patches';
import type { Patch } from './patches';

export const LEADS: Record<string, Patch> = {
  // Synthwave lead: two detuned saws through a swept low-pass, with vibrato.
  'saw-lead': synth({
    name: 'Saw lead',
    oscs: [osc('sawtooth', 0, -8, 0.5), osc('sawtooth', 0, 8, 0.5)],
    env: env(0.01, 0.3, 0.7, 0.25),
    filter: { type: 'lowpass', hz: 2400, q: 2, envAmount: 2.5, envDecay: 0.25 },
    vibrato: { rate: 5.5, cents: 12, delay: 0.25 },
    gain: 0.32,
    sends: { reverb: 1, delay: 1 },
  }),
  // A square lead with an octave layer, for Synthwave's second lead and counter-lines.
  'square-lead': synth({
    name: 'Square lead',
    oscs: [osc('square', 0, 0, 0.6), osc('square', 1, 4, 0.2)],
    env: env(0.01, 0.2, 0.6, 0.2),
    filter: { type: 'lowpass', hz: 3000, q: 1, envAmount: 1.5, envDecay: 0.2 },
    gain: 0.26,
  }),
  // Chiptune lead: a thin 12.5% pulse with delayed vibrato, like an 8-bit melody channel.
  'pulse-lead': synth({
    name: 'Pulse lead',
    oscs: [osc('pulse12', 0, 0, 1)],
    env: env(0.002, 0.1, 0.8, 0.06),
    vibrato: { rate: 6, cents: 10, delay: 0.3 },
    gain: 0.22,
  }),
  // Chiptune second voice: a plain square for harmonies and counter-melodies.
  'chip-square': synth({
    name: 'Square',
    oscs: [osc('square', 0, 0, 1)],
    env: env(0.002, 0.1, 0.7, 0.05),
    gain: 0.16,
  }),
  // Orchestral counter-line: a soft, flute-like triangle and sine with vibrato.
  woodwind: synth({
    name: 'Woodwind',
    oscs: [osc('triangle', 0, 0, 0.8), osc('sine', 1, 0, 0.2)],
    env: env(0.05, 0.2, 0.8, 0.15),
    vibrato: { rate: 5.5, cents: 16, delay: 0.2 },
    gain: 0.3,
  }),
  // Techno lead: a resonant, squelchy acid line.
  acid: synth({
    name: 'Acid',
    oscs: [osc('sawtooth', 0, 0, 1)],
    env: env(0.003, 0.18, 0.3, 0.06),
    filter: { type: 'lowpass', hz: 380, q: 14, envAmount: 7, envDecay: 0.14 },
    gain: 0.24,
    sends: { reverb: 0.6, delay: 1 },
  }),
  // Lo-fi lead: a mellow, filtered voice with tape-like wobble.
  'soft-lead': synth({ name: 'Soft lead', oscs: [osc('triangle', 0, 0, 0.8), osc('sine', 1, 0, 0.2)],
    env: env(0.02, 0.4, 0.6, 0.4), filter: { type: 'lowpass', hz: 1800, q: 0.5, envAmount: 1.2, envDecay: 0.3 },
    vibrato: { rate: 0.7, cents: 9, delay: 0 }, gain: 0.3, sends: { reverb: 1, delay: 0.8 } }),
  // Lo-fi counter-line: a breathy, flute-like near-sine.
  'soft-flute': synth({ name: 'Soft flute', oscs: [osc('sine', 0, 0, 0.7), osc('triangle', 0, 3, 0.3)],
    env: env(0.05, 0.3, 0.7, 0.3), filter: { type: 'lowpass', hz: 2000, q: 0.5, envAmount: 1, envDecay: 0.2 },
    vibrato: { rate: 0.7, cents: 10, delay: 0 }, gain: 0.22 }),
  // A lead through a small radio speaker: saw and a narrow pulse, plucked so it decays instead of
  // holding, driven hard, and band-passed wide around the speaker's mids. No vibrato: a held,
  // smooth, wobbling tone in this register reads as a flute.
  'radio-lead': synth({ name: 'Radio lead', oscs: [osc('sawtooth', 0, 0, 0.6), osc('pulse12', 0, 7, 0.4)],
    env: env(0.003, 0.35, 0.3, 0.15), filter: { type: 'bandpass', hz: 1800, q: 0.6, envAmount: 1.5, envDecay: 0.15 },
    drive: 0.75, gain: 0.45, sends: { reverb: 0.5, delay: 0.6 } }),
  // Lo-fi extra: a detuned, driven saw and triangle, like a chopped-record lead.
  'dusty-sample': synth({ name: 'Dusty sample', oscs: [osc('sawtooth', 0, -5, 0.55), osc('triangle', 0, 5, 0.45)],
    env: env(0.004, 0.32, 0.14, 0.16), filter: { type: 'lowpass', hz: 1150, q: 1.4, envAmount: 2.4, envDecay: 0.13 },
    drive: 0.35, gain: 0.3, sends: { reverb: 0.2, delay: 0.1 } }),
  // Cinematic lead: an overdriven electric lead guitar.
  guitar: synth({ name: 'Lead guitar', oscs: [osc('sawtooth', 0, 0, 0.6), osc('square', 0, 4, 0.25), osc('sine', -1, 0, 0.15)],
    env: env(0.008, 0.8, 0.7, 0.6), filter: { type: 'lowpass', hz: 2600, q: 1.2, envAmount: 1.6, envDecay: 0.25 },
    vibrato: { rate: 5.2, cents: 22, delay: 0.45 }, drive: 0.6, gain: 0.2, sends: { reverb: 1, delay: 1.5 } }),
  // Alt rock: a fuzz guitar lead, driven hard, that holds and sings.
  'fuzz-lead': synth({ name: 'Fuzz guitar', oscs: [osc('sawtooth', 0, 0, 0.6), osc('square', 0, 6, 0.3), osc('sawtooth', -1, 0, 0.1)],
    env: env(0.005, 0.6, 0.75, 0.3), filter: { type: 'lowpass', hz: 2800, q: 1, envAmount: 1.4, envDecay: 0.2 },
    vibrato: { rate: 5.5, cents: 15, delay: 0.5 }, drive: 0.85, gain: 0.2, sends: { reverb: 0.7, delay: 0.6 } }),
  // A bright brass lead: FM with an index attack swell, so the tone opens up like a horn.
  'fm-brass': synth({ name: 'FM brass', oscs: [osc('sine', 0, 0, 1)],
    fm: { ratio: 1, index: 3.5, attack: 0.07, decay: 0.5, sustain: 0.45, velocity: 0.7 },
    env: env(0.06, 0.4, 0.8, 0.2), filter: { type: 'lowpass', hz: 3000, q: 0.7, envAmount: 1, envDecay: 0.2 },
    vibrato: { rate: 5, cents: 8, delay: 0.35 }, gain: 0.15 }),
  // A wordless vocal lead: a bright saw and pulse through wide, soprano-placed "ah" bands, with a
  // singer's vibrato. The bands are wide on purpose: narrow vowel bands pass only one or two harmonics
  // of a note above C5, which sounds like a flute.
  'vox-lead': synth({ name: 'Vox lead', oscs: [osc('sawtooth', 0, 0, 0.7), osc('pulse25', 0, 4, 0.3)],
    formants: [{ hz: 900, q: 3, gain: 1 }, { hz: 1300, q: 3.5, gain: 0.8 }, { hz: 2900, q: 4, gain: 0.5 },
      { hz: 3800, q: 5, gain: 0.25 }],
    env: env(0.06, 0.3, 0.9, 0.3),
    vibrato: { rate: 5.5, cents: 18, delay: 0.25 }, gain: 0.42, sends: { reverb: 1, delay: 0.6 } }),
  // An oboe: a square and saw through two broad formant bands, for a nasal double-reed body.
  'oboe': synth({ name: 'Oboe', oscs: [osc('square', 0, 0, 0.6), osc('sawtooth', 0, 3, 0.3)],
    formants: [{ hz: 1200, q: 3, gain: 1 }, { hz: 2700, q: 5, gain: 0.35 }],
    env: env(0.04, 0.2, 0.85, 0.15), vibrato: { rate: 5, cents: 8, delay: 0.35 }, gain: 0.88 }),
};

export const KEYS: Record<string, Patch> = {
  // Synthwave chords: short, bright detuned-saw stabs.
  'poly-stab': synth({
    name: 'Poly stab',
    oscs: [osc('sawtooth', 0, -6, 0.5), osc('sawtooth', 0, 6, 0.5)],
    env: env(0.005, 0.25, 0.3, 0.2),
    filter: { type: 'lowpass', hz: 1800, q: 3, envAmount: 3, envDecay: 0.15 },
    gain: 0.22,
  }),
  // Synthwave arp: a short plucked synth for fast arpeggios.
  pluck: synth({
    name: 'Pluck',
    oscs: [osc('square', 0, 0, 0.6), osc('sawtooth', 1, 5, 0.25)],
    env: env(0.002, 0.15, 0, 0.1),
    filter: { type: 'lowpass', hz: 2600, q: 2, envAmount: 2, envDecay: 0.1 },
    gain: 0.2,
    sends: { reverb: 1, delay: 1.5 },
  }),
  // Chiptune chords: pulse-wave chord hits.
  'pulse-chords': synth({
    name: 'Pulse chords',
    oscs: [osc('pulse25', 0, 0, 1)],
    env: env(0.002, 0.15, 0.4, 0.05),
    gain: 0.12,
  }),
  // Chiptune arp: fast pulse arpeggios.
  'pulse-arp': synth({
    name: 'Pulse arp',
    oscs: [osc('pulse12', 0, 0, 1)],
    env: env(0.001, 0.08, 0, 0.03),
    gain: 0.16,
  }),
  // Techno second lead: a short square stab.
  'square-stab': synth({
    name: 'Square stab',
    oscs: [osc('square', 0, 0, 0.7), osc('square', 0, 7, 0.3)],
    env: env(0.003, 0.12, 0.2, 0.08),
    filter: { type: 'lowpass', hz: 1600, q: 4, envAmount: 3, envDecay: 0.08 },
    gain: 0.18,
  }),
  // Techno counter-line: a short FM pluck.
  'fm-pluck': synth({
    name: 'FM pluck',
    oscs: [osc('sine', 0, 0, 1)],
    fm: { ratio: 2, index: 3, decay: 0.2 },
    env: env(0.002, 0.3, 0, 0.15),
    gain: 0.24,
  }),
  // Techno chords: a detuned-saw chord stab.
  stab: synth({
    name: 'Chord stab',
    oscs: [osc('sawtooth', 0, -8, 0.5), osc('sawtooth', 0, 8, 0.5)],
    env: env(0.002, 0.18, 0, 0.12),
    filter: { type: 'lowpass', hz: 1500, q: 5, envAmount: 4, envDecay: 0.1 },
    gain: 0.2,
    sends: { reverb: 1, delay: 1.3 },
  }),
  // Techno arp: a resonant acid sequence.
  'acid-arp': synth({
    name: 'Acid arp',
    oscs: [osc('sawtooth', 0, 0, 1)],
    env: env(0.002, 0.1, 0, 0.04),
    filter: { type: 'lowpass', hz: 900, q: 10, envAmount: 5, envDecay: 0.08 },
    gain: 0.18,
  }),
  // Lo-fi arp: a soft, muted pluck with a long delay send.
  'muted-pluck': synth({ name: 'Muted pluck', oscs: [osc('triangle', 0, 0, 1)],
    env: env(0.003, 0.25, 0, 0.2), filter: { type: 'lowpass', hz: 1600, q: 1, envAmount: 2, envDecay: 0.12 },
    vibrato: { rate: 0.6, cents: 8, delay: 0 }, gain: 0.18, sends: { reverb: 1, delay: 1.2 } }),
  // Cinematic chords and second lead: a synthesised grand piano.
  'grand-piano': synth({ name: 'Grand piano', oscs: [osc('triangle', 0, 0, 0.6), osc('sine', 1, 0, 0.25), osc('sawtooth', 0, 3, 0.15)],
    env: env(0.002, 2.6, 0, 0.45), filter: { type: 'lowpass', hz: 1500, q: 0.6, envAmount: 3.5, envDecay: 0.5 },
    gain: 0.32, sends: { reverb: 1.1, delay: 0.2 } }),
  // Cinematic arp: a warm analog-style synth.
  'analog-synth': synth({ name: 'Analog synth', oscs: [osc('sawtooth', 0, -6, 0.5), osc('pulse25', 0, 6, 0.5)],
    env: env(0.005, 0.35, 0.2, 0.3), filter: { type: 'lowpass', hz: 1400, q: 3, envAmount: 3, envDecay: 0.18 },
    gain: 0.16, sends: { reverb: 1, delay: 1.2 } }),
  // Alt rock: a clean, jangly guitar for arpeggios and counter-lines, built on a plucked string
  // (Karplus-Strong) so each note is picked, rings, and fades. It sounds an octave below the written
  // note, like a real guitar.
  'clean-guitar': synth({ name: 'Clean guitar', oscs: [],
    string: { octave: -1, level: 1, decay: 1.8, brightness: 0.35, pick: 0.28 },
    env: env(0.003, 1.2, 0.25, 0.35), filter: { type: 'lowpass', hz: 2600, q: 0.8, envAmount: 1.3, envDecay: 0.2 },
    gain: 0.5, sends: { reverb: 1, delay: 0.9 } }),
  // Alt rock: a shimmering clean guitar for echoing indie arpeggios: a warm, darkly filtered plucked
  // string with a deep, slow chorus wobble and moderate reverb and delay sends. It stays at the
  // written pitch, so its arpeggios sit above a low lead and stay clear of the bass.
  'shimmer-guitar': synth({ name: 'Shimmer guitar', oscs: [],
    string: { octave: 0, level: 1, decay: 2.4, brightness: 0.22, pick: 0.35 },
    env: env(0.003, 1.8, 0.3, 0.6), filter: { type: 'lowpass', hz: 2000, q: 0.6, envAmount: 1.1, envDecay: 0.2 },
    vibrato: { rate: 0.9, cents: 8, delay: 0 }, gain: 0.82, sends: { reverb: 1, delay: 1.8 } }),
  // Alt rock: palm-muted power-chord chugs, short and crunchy.
  'power-chords': synth({ name: 'Power chords', oscs: [osc('sawtooth', 0, -6, 0.45), osc('sawtooth', 0, 6, 0.4), osc('square', -1, 0, 0.15)],
    env: env(0.003, 0.22, 0.25, 0.1), filter: { type: 'lowpass', hz: 1900, q: 1.5, envAmount: 2.5, envDecay: 0.1 },
    drive: 0.7, gain: 0.16, sends: { reverb: 0.5, delay: 0 } }),
  // Alt rock: a plucked acoustic guitar: an open string with a soft pick attack (a 12 ms rise and a
  // gentle filter snap, so the strike isn't heavy), and a moderate ring that fades before the next
  // phrase.
  'acoustic-guitar': synth({ name: 'Acoustic guitar', oscs: [],
    string: { octave: -1, level: 1, decay: 1.6, brightness: 0.42, pick: 0.28 },
    env: env(0.012, 1.2, 0.2, 0.3), filter: { type: 'lowpass', hz: 4000, q: 0.6, envAmount: 1.05, envDecay: 0.2 },
    gain: 1, sends: { reverb: 0.9, delay: 0.3 } }),
  // Alt rock: an acoustic guitar through its pickup and an amp: a wide band-pass keeps the direct,
  // mid-forward piezo tone and drops the body boom, light drive squashes it like a compressor. It is
  // played like soft fingerpicking: a fingertip near the middle of the string, a 50 ms fade-in and
  // no filter snap, so nothing bites. It rings open into some reverb and echo.
  'plugged-acoustic': synth({ name: 'Plugged acoustic', oscs: [],
    string: { octave: -1, level: 1, decay: 2, brightness: 0.25, pick: 0.45 },
    env: env(0.05, 1.5, 0.35, 0.45), filter: { type: 'bandpass', hz: 1000, q: 0.3, envAmount: 1, envDecay: 0.25 },
    drive: 0.1, gain: 0.52, sends: { reverb: 0.9, delay: 1.4 } }),
  // Alt rock: a clean electric guitar, from the Cinematic lead guitar: no drive, a triangle in place
  // of its buzzy square, less saw, a softer and lower filter, a milder vibrato, a little less
  // sustain, and small reverb and delay sends. It sounds an octave below the
  // written note, like a real guitar.
  'clean-electric': synth({ name: 'Clean electric', oscs: [osc('sawtooth', -1, 0, 0.35), osc('triangle', -1, 4, 0.5), osc('sine', -2, 0, 0.15)],
    env: env(0.008, 0.8, 0.5, 0.5), filter: { type: 'lowpass', hz: 2000, q: 0.7, envAmount: 1.4, envDecay: 0.25 },
    vibrato: { rate: 5.2, cents: 10, delay: 0.45 }, gain: 0.5, sends: { reverb: 0.6, delay: 0.8 } }),
  // Alt rock: a driven plucked electric guitar for crunchy parts.
  'crunch-guitar': synth({ name: 'Crunch guitar', oscs: [],
    string: { octave: -1, level: 1, decay: 2, brightness: 0.7, pick: 0.12 },
    env: env(0.002, 1.2, 0.5, 0.25), filter: { type: 'lowpass', hz: 2600, q: 1, envAmount: 1.5, envDecay: 0.15 },
    drive: 0.6, gain: 0.3, sends: { reverb: 0.6, delay: 0.3 } }),
  // An electric piano: FM with velocity, so soft notes are mellow and hard ones bark, like a DX7.
  'fm-rhodes': synth({ name: 'FM Rhodes', oscs: [osc('sine', 0, 0, 1), osc('sine', 0, 7, 0.35)],
    fm: { ratio: 1, index: 2.2, decay: 1.2, sustain: 0.15, velocity: 0.8, targets: [0] },
    env: env(0.003, 2.5, 0.12, 0.6), gain: 0.25, sends: { reverb: 0.8, delay: 0.4 } }),
  // A bell: inharmonic FM (ratio 1.4) that rings long and decays.
  'fm-bells': synth({ name: 'FM bells', oscs: [osc('sine', 0, 0, 1)],
    fm: { ratio: 1.4, index: 4, decay: 2.5, sustain: 0.1, velocity: 0.5 },
    env: env(0.001, 3, 0, 2), gain: 0.22 }),
  // A glockenspiel: bright, high-ratio FM with a short metallic ring.
  'glockenspiel': synth({ name: 'Glockenspiel', oscs: [osc('sine', 1, 0, 1)],
    fm: { ratio: 3.5, index: 1.5, decay: 0.3, sustain: 0.02, velocity: 0.6 },
    env: env(0.001, 1.4, 0, 1), gain: 0.22 }),
  // A concert harp: a plucked string with a long ring and a mellow, resonant filter.
  'concert-harp': synth({ name: 'Concert harp', oscs: [],
    string: { octave: 0, level: 1, decay: 3.5, brightness: 0.25, pick: 0.35 },
    env: env(0.002, 4, 0.5, 0.8), filter: { type: 'lowpass', hz: 3500, q: 0.5, envAmount: 1.2, envDecay: 0.3 },
    gain: 0.54, sends: { reverb: 1, delay: 0.3 } }),
  // Pizzicato strings: a short plucked string with a quick, muted ring.
  'pizzicato': synth({ name: 'Pizzicato strings', oscs: [],
    string: { octave: 0, level: 1, decay: 0.45, brightness: 0.3, pick: 0.22 },
    env: env(0.003, 0.4, 0, 0.15), filter: { type: 'lowpass', hz: 2500, q: 0.6, envAmount: 1.2, envDecay: 0.1 },
    gain: 0.5 }),
  // A nylon-string guitar: a plucked string an octave below the written note, warm and soft.
  'nylon-guitar': synth({ name: 'Nylon guitar', oscs: [],
    string: { octave: -1, level: 1, decay: 2.2, brightness: 0.2, pick: 0.3 },
    env: env(0.006, 1.5, 0.3, 0.4), filter: { type: 'lowpass', hz: 2200, q: 0.6, envAmount: 1.2, envDecay: 0.2 },
    gain: 0.6, sends: { reverb: 0.9, delay: 0.3 } }),
};

export const PADS: Record<string, Patch> = {
  // Synthwave pad: wide detuned saws with a slow attack.
  'warm-pad': synth({
    name: 'Warm pad',
    oscs: [
      osc('sawtooth', 0, -12, 0.35),
      osc('sawtooth', 0, 12, 0.35),
      osc('triangle', -1, 0, 0.3),
    ],
    env: env(0.6, 1, 0.8, 1.2),
    filter: { type: 'lowpass', hz: 1400, q: 0.7, envAmount: 1, envDecay: 1 },
    gain: 0.22,
    sends: { reverb: 1.4, delay: 0.5 },
  }),
  // Chiptune pad: held square-wave chords.
  'square-pad': synth({
    name: 'Square pad',
    oscs: [osc('pulse25', 0, 0, 1)],
    env: env(0.02, 0.3, 0.6, 0.2),
    gain: 0.1,
  }),
  // Orchestral lead: a bowed violin section. Formant bands give it a light body, a presence lift, and
  // the bright 3 kHz edge of a bow, with an expressive vibrato, so it cuts as a lead.
  strings: synth({ name: 'Strings',
    oscs: [osc('sawtooth', 0, -6, 0.34), osc('sawtooth', 0, 0, 0.33), osc('sawtooth', 0, 6, 0.33)],
    formants: [{ hz: 450, q: 2, gain: 0.2 }, { hz: 1500, q: 1, gain: 0.6 }, { hz: 3000, q: 0.7, gain: 1 }],
    env: env(0.08, 0.4, 0.85, 0.5), filter: { type: 'lowpass', hz: 7000, q: 0.5, envAmount: 1, envDecay: 0.3 },
    vibrato: { rate: 5.5, cents: 16, delay: 0.25 }, gain: 0.24, sends: { reverb: 1.2, delay: 0 } }),
  // Orchestral pad: a soft string ensemble. Four widely detuned saws, warm and still, with no vibrato:
  // in a big section the players' vibratos blur into a chorus.
  'string-pad': synth({ name: 'String pad',
    oscs: [osc('sawtooth', 0, -13, 0.25), osc('sawtooth', 0, -5, 0.25), osc('sawtooth', 0, 5, 0.25), osc('sawtooth', 0, 13, 0.25)],
    env: env(0.6, 1, 0.85, 1.2), filter: { type: 'lowpass', hz: 2400, q: 0.4, envAmount: 1, envDecay: 1 },
    formants: [{ hz: 1200, q: 0.8, gain: 1 }, { hz: 300, q: 1, gain: 0.5 }],
    gain: 0.35, sends: { reverb: 1.3, delay: 0 } }),
  // Techno pad: a dark, evolving bed.
  'dark-pad': synth({
    name: 'Dark pad',
    oscs: [osc('sawtooth', 0, -10, 0.5), osc('sawtooth', 0, 10, 0.5)],
    env: env(1, 1.5, 0.8, 1.5),
    filter: { type: 'lowpass', hz: 700, q: 2, envAmount: 1.5, envDecay: 1.5 },
    gain: 0.2,
    sends: { reverb: 1.5, delay: 0.5 },
  }),
  // Lo-fi pad: a warm pad with tape wobble.
  'tape-pad': synth({ name: 'Tape pad', oscs: [osc('sawtooth', 0, -10, 0.3), osc('sawtooth', 0, 10, 0.3), osc('triangle', -1, 0, 0.4)],
    env: env(0.8, 1.2, 0.8, 1.5), filter: { type: 'lowpass', hz: 900, q: 0.5, envAmount: 1, envDecay: 1 },
    vibrato: { rate: 0.5, cents: 8, delay: 0 }, gain: 0.18, sends: { reverb: 1.4, delay: 0.3 } }),
  // Cinematic pad: a big string section. The wide ensemble plus a quiet octave-down layer for weight,
  // with a body resonance and some bow brightness.
  'string-section': synth({ name: 'String section',
    oscs: [osc('sawtooth', 0, -14, 0.22), osc('sawtooth', 0, -6, 0.22), osc('sawtooth', 0, 6, 0.22), osc('sawtooth', 0, 14, 0.22),
      osc('sawtooth', -1, 0, 0.2)],
    formants: [{ hz: 400, q: 1, gain: 0.6 }, { hz: 2200, q: 0.8, gain: 0.8 }],
    env: env(0.6, 1, 0.85, 1.4), filter: { type: 'lowpass', hz: 3800, q: 0.5, envAmount: 1, envDecay: 1 },
    vibrato: { rate: 4.5, cents: 8, delay: 0.4 }, gain: 0.32, sends: { reverb: 1.4, delay: 0 } }),
  // Cinematic counter-line: a solo cello. One player (two barely detuned saws), a dark wooden body from
  // formant bands, and a slow, wide vibrato.
  cello: synth({ name: 'Solo strings',
    oscs: [osc('sawtooth', 0, 0, 0.6), osc('sawtooth', 0, -3, 0.4)],
    formants: [{ hz: 220, q: 1.5, gain: 0.8 }, { hz: 600, q: 1.5, gain: 0.6 }, { hz: 1600, q: 2, gain: 0.4 }],
    env: env(0.15, 0.5, 0.85, 0.6), filter: { type: 'lowpass', hz: 3000, q: 0.6, envAmount: 1, envDecay: 0.3 },
    vibrato: { rate: 5, cents: 18, delay: 0.35 }, gain: 0.39, sends: { reverb: 1.2, delay: 0 } }),
  // A slow analog pad: detuned saws with a long swell, for Studio.
  'synth-pad': synth({ name: 'Analog pad', oscs: [osc('sawtooth', 0, -12, 0.5), osc('sawtooth', 0, 12, 0.5)],
    env: env(1.2, 1.5, 0.8, 2), filter: { type: 'lowpass', hz: 1100, q: 1, envAmount: 1.5, envDecay: 2 },
    vibrato: { rate: 0.4, cents: 6, delay: 0 }, gain: 0.16, sends: { reverb: 1.5, delay: 0.4 } }),
  // Alt rock: a held wall of distorted rhythm guitar for the chorus.
  'guitar-wall': synth({ name: 'Guitar wall', oscs: [osc('sawtooth', 0, -10, 0.4), osc('sawtooth', 0, 10, 0.4), osc('square', -1, 0, 0.2)],
    env: env(0.01, 0.5, 0.8, 0.25), filter: { type: 'lowpass', hz: 2200, q: 0.8, envAmount: 1, envDecay: 0.3 },
    drive: 0.75, gain: 0.13, sends: { reverb: 0.8, delay: 0 } }),
  // A wordless choir singing "aah": detuned saws through the "ah" formants, with a slow swell.
  'choir-aah': synth({ name: 'Choir aah',
    oscs: [osc('sawtooth', 0, -9, 0.4), osc('sawtooth', 0, 9, 0.4), osc('sawtooth', 0, 0, 0.3)],
    formants: VOWELS.ah, env: env(0.35, 1, 0.85, 0.9),
    filter: { type: 'lowpass', hz: 4000, q: 0.5, envAmount: 1, envDecay: 0.1 },
    vibrato: { rate: 5, cents: 10, delay: 0.4 }, gain: 0.8, sends: { reverb: 1, delay: 0.3 } }),
  // A wordless choir singing "ooh": detuned saws through the "oo" formants, darker and rounder.
  'choir-ooh': synth({ name: 'Choir ooh',
    oscs: [osc('sawtooth', 0, -9, 0.4), osc('sawtooth', 0, 9, 0.4), osc('sawtooth', 0, 0, 0.3)],
    formants: VOWELS.oo, env: env(0.4, 1, 0.85, 1),
    filter: { type: 'lowpass', hz: 3000, q: 0.5, envAmount: 1, envDecay: 0.1 },
    vibrato: { rate: 5, cents: 10, delay: 0.4 }, gain: 0.53, sends: { reverb: 1, delay: 0.3 } }),
};

export const BASSES: Record<string, Patch> = {
  // Synthwave bass: a punchy filtered saw bass.
  'synth-bass': synth({
    name: 'Synth bass',
    oscs: [osc('sawtooth', 0, 0, 0.6), osc('square', -1, 0, 0.4)],
    env: env(0.005, 0.2, 0.6, 0.05),
    filter: { type: 'lowpass', hz: 500, q: 2, envAmount: 4, envDecay: 0.12 },
    gain: 0.4,
    sends: { reverb: 0.2, delay: 0 },
  }),
  // A deep sine sub bass with a little triangle on top.
  'sub-bass': synth({
    name: 'Sub bass',
    oscs: [osc('sine', 0, 0, 0.85), osc('triangle', 1, 0, 0.15)],
    env: env(0.003, 0.15, 0.8, 0.05),
    filter: { type: 'lowpass', hz: 400, q: 0.7, envAmount: 1, envDecay: 0.1 },
    gain: 0.45,
    sends: { reverb: 0, delay: 0 },
  }),
  // Chiptune bass: a triangle-wave bass, like an 8-bit bass channel.
  'triangle-bass': synth({
    name: 'Triangle bass',
    oscs: [osc('triangle', 0, 0, 1)],
    env: env(0.002, 0.05, 1, 0.04),
    gain: 0.5,
    sends: { reverb: 0.3, delay: 0 },
  }),
  // Orchestral bass: cellos and basses, with a low body resonance.
  'low-strings': synth({ name: 'Low strings',
    oscs: [osc('sawtooth', 0, -5, 0.5), osc('sawtooth', 0, 5, 0.5)],
    formants: [{ hz: 200, q: 1.2, gain: 0.9 }, { hz: 800, q: 1.5, gain: 0.5 }],
    env: env(0.08, 0.3, 0.85, 0.35), filter: { type: 'lowpass', hz: 1000, q: 0.7, envAmount: 1, envDecay: 0.3 },
    gain: 0.64, sends: { reverb: 0.8, delay: 0 } }),
  // Techno bass: a rolling sub bass that sits under the kick.
  'techno-sub': synth({
    name: 'Sub bass',
    oscs: [osc('sine', 0, 0, 0.85), osc('square', 1, 0, 0.15)],
    env: env(0.003, 0.15, 0.8, 0.05),
    filter: { type: 'lowpass', hz: 600, q: 1, envAmount: 1, envDecay: 0.1 },
    gain: 0.5,
    sends: { reverb: 0, delay: 0 },
  }),
  // Lo-fi bass: a round, soft bass.
  'round-bass': synth({ name: 'Round bass', oscs: [osc('sine', 0, 0, 0.75), osc('triangle', 0, 0, 0.25)],
    env: env(0.01, 0.3, 0.7, 0.12), filter: { type: 'lowpass', hz: 600, q: 0.7, envAmount: 1.5, envDecay: 0.1 },
    gain: 0.5, sends: { reverb: 0.1, delay: 0 } }),
  // Cinematic bass: a warm sine and saw bass.
  'warm-bass': synth({ name: 'Warm bass', oscs: [osc('sine', 0, 0, 0.6), osc('sawtooth', 0, 0, 0.4)],
    env: env(0.01, 0.4, 0.75, 0.2), filter: { type: 'lowpass', hz: 650, q: 0.8, envAmount: 1.8, envDecay: 0.12 },
    gain: 0.45, sends: { reverb: 0.15, delay: 0 } }),
  // Alt rock: a picked electric bass with a little grit, for driving eighth notes.
  'pick-bass': synth({ name: 'Pick bass', oscs: [osc('sawtooth', 0, 0, 0.5), osc('square', 0, 0, 0.2), osc('sine', -1, 0, 0.3)],
    env: env(0.003, 0.3, 0.6, 0.08), filter: { type: 'lowpass', hz: 950, q: 1.2, envAmount: 2.2, envDecay: 0.08 },
    drive: 0.3, gain: 0.42, sends: { reverb: 0.1, delay: 0 } }),
  // A DX-style synth bass: FM with a fast index decay, for a punchy, bright attack.
  'dx-bass': synth({ name: 'DX bass', oscs: [osc('sine', 0, 0, 1), osc('sine', -1, 0, 0.4)],
    fm: { ratio: 1, index: 5, decay: 0.15, sustain: 0.08, velocity: 0.8, targets: [0] },
    env: env(0.002, 0.5, 0.3, 0.1), gain: 0.4, sends: { reverb: 0.15, delay: 0 } }),
  // A double bass: a plucked string an octave down with a sine under it, for a rounded low end.
  'string-bass': synth({ name: 'String bass', oscs: [osc('sine', -1, 0, 0.5)],
    string: { octave: -1, level: 1, decay: 1.2, brightness: 0.15, pick: 0.22 },
    env: env(0.004, 1, 0.25, 0.15), filter: { type: 'lowpass', hz: 900, q: 0.8, envAmount: 2, envDecay: 0.08 },
    gain: 0.75, sends: { reverb: 0.4, delay: 0.1 } }),
};

export const KITS: Record<string, Patch> = {
  // Synthwave drums: an 80s electronic kit.
  'gated-kit': drums({
    name: 'Gated kit',
    kick: { wave: 'sine', hz: 55, sweep: 3, sweepTime: 0.12, decay: 0.45, click: 0.3 },
    snare: { noise: 'white', filter: 'bandpass', hz: 1800, toneHz: 180, decay: 0.25 },
    hat: { noise: 'white', hz: 7000, decay: 0.05 },
    crashDecay: 1.6,
    gain: 0.9,
    sends: { reverb: 1.3, delay: 0 },
  }),
  // Chiptune drums: crunchy noise-channel drums.
  'chip-kit': drums({
    name: 'Noise kit',
    kick: { wave: 'square', hz: 90, sweep: 5, sweepTime: 0.05, decay: 0.1, click: 0 },
    snare: { noise: 'chip', filter: 'highpass', hz: 1500, toneHz: 0, decay: 0.12 },
    hat: { noise: 'chip', hz: 3000, decay: 0.035 },
    crashDecay: 0.6,
    gain: 0.7,
    sends: { reverb: 0.3, delay: 0 },
  }),
  // Orchestral drums: timpani, a suspended-cymbal tap, and cymbals.
  'orchestra-kit': drums({
    name: 'Timpani & cymbals',
    kick: { wave: 'sine', hz: 70, sweep: 1.15, sweepTime: 0.08, decay: 1.1, click: 0 },
    snare: { noise: 'white', filter: 'bandpass', hz: 2500, toneHz: 200, decay: 0.18 },
    // A light tap on a suspended cymbal rather than a drum-kit hi-hat: metallic, lower, longer.
    hat: { noise: 'metal', hz: 5500, decay: 0.12 },
    crashDecay: 2.5,
    gain: 0.85,
    sends: { reverb: 1.2, delay: 0 },
  }),
  // Techno drums: a 909-style kit.
  '909-kit': drums({
    name: '909 kit',
    kick: { wave: 'sine', hz: 50, sweep: 4, sweepTime: 0.08, decay: 0.38, click: 0.5 },
    snare: { noise: 'white', filter: 'bandpass', hz: 2000, toneHz: 190, decay: 0.2 },
    hat: { noise: 'metal', hz: 8000, decay: 0.04 },
    crashDecay: 1.6,
    gain: 0.9,
    sends: { reverb: 0.4, delay: 0 },
  }),
  // Lo-fi drums: a dusty, swung kit.
  'dusty-kit': drums({ name: 'Dusty kit',
    kick: { wave: 'sine', hz: 50, sweep: 2, sweepTime: 0.08, decay: 0.35, click: 0.1 },
    snare: { noise: 'white', filter: 'bandpass', hz: 1400, toneHz: 0, decay: 0.18 },
    hat: { noise: 'white', hz: 6000, decay: 0.03 },
    crashDecay: 1.2, gain: 0.75, sends: { reverb: 0.6, delay: 0 } }),
  // Cinematic and Studio drums: an organic studio kit.
  'studio-kit': drums({ name: 'Studio kit',
    kick: { wave: 'sine', hz: 55, sweep: 2.2, sweepTime: 0.06, decay: 0.5, click: 0.25 },
    snare: { noise: 'white', filter: 'bandpass', hz: 1800, toneHz: 180, decay: 0.22 },
    hat: { noise: 'white', hz: 7000, decay: 0.05 },
    crashDecay: 2.4, gain: 0.8, sends: { reverb: 0.9, delay: 0 } }),
  // Alt rock: a punchy kit in a small room, with a big snare and a washy crash.
  'rock-kit': drums({ name: 'Rock kit',
    kick: { wave: 'sine', hz: 58, sweep: 2.6, sweepTime: 0.07, decay: 0.42, click: 0.4 },
    snare: { noise: 'white', filter: 'bandpass', hz: 1600, toneHz: 200, decay: 0.28 },
    hat: { noise: 'white', hz: 7500, decay: 0.07 },
    crashDecay: 1.8, gain: 0.9, sends: { reverb: 0.8, delay: 0 } }),
};

export const FAMILIES = { leads: LEADS, keys: KEYS, pads: PADS, basses: BASSES, kits: KITS };

function merge(families: Record<string, Record<string, Patch>>): Record<string, Patch> {
  const all: Record<string, Patch> = {};
  for (const family of Object.values(families)) {
    for (const [id, patch] of Object.entries(family)) {
      if (id in all) throw new Error(`instrument '${id}' is defined twice`);
      all[id] = patch;
    }
  }
  return all;
}

/** Every instrument, by bank id. Styles pick from this; `inst=bank:<id>` reaches it directly. */
export const INSTRUMENTS: Record<string, Patch> = merge(FAMILIES);
