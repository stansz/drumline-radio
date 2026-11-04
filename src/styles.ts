import type { Role, StyleId } from './roles';
import type { Track } from './song';

export type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pulse12' | 'pulse25';

export interface Osc {
  wave: Wave;
  octave: number;
  detune: number;
  level: number;
}

export interface SynthPatch {
  kind: 'synth';
  name: string;
  oscs: Osc[];
  env: { attack: number; decay: number; sustain: number; release: number };
  filter?: {
    type: 'lowpass' | 'highpass' | 'bandpass';
    hz: number;
    q: number;
    envAmount: number;
    envDecay: number;
  };
  vibrato?: { rate: number; cents: number; delay: number };
  fm?: { ratio: number; index: number; decay: number };
  gain: number;
  sends: { reverb: number; delay: number };
}

export interface DrumKit {
  kind: 'drums';
  name: string;
  kick: {
    wave: 'sine' | 'square' | 'triangle';
    hz: number;
    sweep: number;
    sweepTime: number;
    decay: number;
    click: number;
  };
  snare: {
    noise: 'white' | 'chip';
    filter: 'bandpass' | 'highpass';
    hz: number;
    toneHz: number;
    decay: number;
  };
  hat: { noise: 'white' | 'chip' | 'metal'; hz: number; decay: number };
  crashDecay: number;
  gain: number;
  sends: { reverb: number; delay: number };
}

export type Patch = SynthPatch | DrumKit;

export interface StyleDef {
  id: StyleId;
  name: string;
  blurb: string;
  roles: Record<Role, string>;
  patches: Record<string, Patch>;
  fx: {
    reverbSeconds: number;
    reverbSend: number;
    delayBeats: number;
    delaySend: number;
    delayFeedback: number;
    crush: number;
    lowpassHz: number;
  };
  lanes: string[];
}

const DEFAULT_SENDS = { reverb: 1, delay: 1 };

function osc(wave: Wave, octave: number, detune: number, level: number): Osc {
  return { wave, octave, detune, level };
}

function env(attack: number, decay: number, sustain: number, release: number) {
  return { attack, decay, sustain, release };
}

type SynthInput = Omit<SynthPatch, 'kind' | 'sends'> & {
  sends?: { reverb: number; delay: number };
};

function synth(input: SynthInput): SynthPatch {
  return { kind: 'synth', ...input, sends: input.sends ?? DEFAULT_SENDS };
}

type DrumInput = Omit<DrumKit, 'kind' | 'sends'> & {
  sends?: { reverb: number; delay: number };
};

function drums(input: DrumInput): DrumKit {
  return { kind: 'drums', ...input, sends: input.sends ?? DEFAULT_SENDS };
}

export const STYLE_DEFS: Record<StyleId, StyleDef> = {
  synthwave: {
    id: 'synthwave',
    name: 'Synthwave',
    blurb: 'Detuned saws, warm pads, and big gated drums under a neon sky.',
    roles: {
      lead: 'saw-lead',
      lead2: 'square-lead',
      counter: 'square-lead',
      pad: 'warm-pad',
      chords: 'poly-stab',
      bass: 'synth-bass',
      arp: 'pluck',
      drums: 'gated-kit',
    },
    patches: {
      'saw-lead': synth({
        name: 'Saw lead',
        oscs: [osc('sawtooth', 0, -8, 0.5), osc('sawtooth', 0, 8, 0.5)],
        env: env(0.01, 0.3, 0.7, 0.25),
        filter: { type: 'lowpass', hz: 2400, q: 2, envAmount: 2.5, envDecay: 0.25 },
        vibrato: { rate: 5.5, cents: 12, delay: 0.25 },
        gain: 0.32,
        sends: { reverb: 1, delay: 1 },
      }),
      'square-lead': synth({
        name: 'Square lead',
        oscs: [osc('square', 0, 0, 0.6), osc('square', 1, 4, 0.2)],
        env: env(0.01, 0.2, 0.6, 0.2),
        filter: { type: 'lowpass', hz: 3000, q: 1, envAmount: 1.5, envDecay: 0.2 },
        gain: 0.26,
      }),
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
      'poly-stab': synth({
        name: 'Poly stab',
        oscs: [osc('sawtooth', 0, -6, 0.5), osc('sawtooth', 0, 6, 0.5)],
        env: env(0.005, 0.25, 0.3, 0.2),
        filter: { type: 'lowpass', hz: 1800, q: 3, envAmount: 3, envDecay: 0.15 },
        gain: 0.22,
      }),
      'synth-bass': synth({
        name: 'Synth bass',
        oscs: [osc('sawtooth', 0, 0, 0.6), osc('square', -1, 0, 0.4)],
        env: env(0.005, 0.2, 0.6, 0.08),
        filter: { type: 'lowpass', hz: 500, q: 2, envAmount: 4, envDecay: 0.12 },
        gain: 0.4,
        sends: { reverb: 0.2, delay: 0 },
      }),
      pluck: synth({
        name: 'Pluck',
        oscs: [osc('square', 0, 0, 0.6), osc('sawtooth', 1, 5, 0.25)],
        env: env(0.002, 0.15, 0, 0.1),
        filter: { type: 'lowpass', hz: 2600, q: 2, envAmount: 2, envDecay: 0.1 },
        gain: 0.2,
        sends: { reverb: 1, delay: 1.5 },
      }),
      'gated-kit': drums({
        name: 'Gated kit',
        kick: { wave: 'sine', hz: 55, sweep: 3, sweepTime: 0.12, decay: 0.45, click: 0.3 },
        snare: { noise: 'white', filter: 'bandpass', hz: 1800, toneHz: 180, decay: 0.25 },
        hat: { noise: 'white', hz: 7000, decay: 0.05 },
        crashDecay: 1.6,
        gain: 0.9,
        sends: { reverb: 1.3, delay: 0 },
      }),
    },
    fx: {
      reverbSeconds: 2.8,
      reverbSend: 0.3,
      delayBeats: 0.75,
      delaySend: 0.2,
      delayFeedback: 0.35,
      crush: 0,
      lowpassHz: 18000,
    },
    lanes: ['#ff4fa3', '#2de2e6', '#ffb347', '#b967ff', '#f9f871', '#ff6b6b'],
  },

  chiptune: {
    id: 'chiptune',
    name: 'Chiptune',
    blurb: 'Pulse-wave leads, a triangle bass, and crunchy noise drums.',
    roles: {
      lead: 'pulse-lead',
      lead2: 'square-lead',
      counter: 'square-lead',
      pad: 'square-pad',
      chords: 'pulse-chords',
      bass: 'triangle-bass',
      arp: 'pulse-arp',
      drums: 'chip-kit',
    },
    patches: {
      'pulse-lead': synth({
        name: 'Pulse lead',
        oscs: [osc('pulse12', 0, 0, 1)],
        env: env(0.002, 0.1, 0.8, 0.06),
        vibrato: { rate: 6, cents: 10, delay: 0.3 },
        gain: 0.22,
      }),
      'square-lead': synth({
        name: 'Square',
        oscs: [osc('square', 0, 0, 1)],
        env: env(0.002, 0.1, 0.7, 0.05),
        gain: 0.16,
      }),
      'square-pad': synth({
        name: 'Square pad',
        oscs: [osc('pulse25', 0, 0, 1)],
        env: env(0.02, 0.3, 0.6, 0.2),
        gain: 0.1,
      }),
      'pulse-chords': synth({
        name: 'Pulse chords',
        oscs: [osc('pulse25', 0, 0, 1)],
        env: env(0.002, 0.15, 0.4, 0.05),
        gain: 0.12,
      }),
      'triangle-bass': synth({
        name: 'Triangle bass',
        oscs: [osc('triangle', 0, 0, 1)],
        env: env(0.002, 0.05, 1, 0.04),
        gain: 0.5,
        sends: { reverb: 0.3, delay: 0 },
      }),
      'pulse-arp': synth({
        name: 'Pulse arp',
        oscs: [osc('pulse12', 0, 0, 1)],
        env: env(0.001, 0.08, 0, 0.03),
        gain: 0.16,
      }),
      'chip-kit': drums({
        name: 'Noise kit',
        kick: { wave: 'square', hz: 90, sweep: 5, sweepTime: 0.05, decay: 0.1, click: 0 },
        snare: { noise: 'chip', filter: 'highpass', hz: 1500, toneHz: 0, decay: 0.12 },
        hat: { noise: 'chip', hz: 3000, decay: 0.035 },
        crashDecay: 0.6,
        gain: 0.7,
        sends: { reverb: 0.3, delay: 0 },
      }),
    },
    fx: {
      reverbSeconds: 0.8,
      reverbSend: 0.08,
      delayBeats: 0.5,
      delaySend: 0.12,
      delayFeedback: 0.25,
      crush: 0.2,
      lowpassHz: 12000,
    },
    lanes: ['#7cff4f', '#4fd1ff', '#ffd84f', '#ff6f91', '#c792ff', '#ffffff'],
  },

  orchestral: {
    id: 'orchestral',
    name: 'Orchestral',
    blurb: 'Strings, brass, woodwinds, harp, and timpani in a large hall.',
    roles: {
      lead: 'strings',
      lead2: 'brass',
      counter: 'woodwind',
      pad: 'string-pad',
      chords: 'harp',
      bass: 'low-strings',
      arp: 'bells',
      drums: 'orchestra-kit',
    },
    patches: {
      strings: synth({
        name: 'Strings',
        oscs: [
          osc('sawtooth', 0, -7, 0.34),
          osc('sawtooth', 0, 0, 0.33),
          osc('sawtooth', 0, 7, 0.33),
        ],
        env: env(0.12, 0.4, 0.85, 0.5),
        filter: { type: 'lowpass', hz: 2400, q: 0.5, envAmount: 1, envDecay: 0.3 },
        vibrato: { rate: 5, cents: 14, delay: 0.3 },
        gain: 0.24,
        sends: { reverb: 1.2, delay: 0 },
      }),
      brass: synth({
        name: 'Brass',
        oscs: [osc('sawtooth', 0, 0, 0.7), osc('sawtooth', 0, 5, 0.3)],
        env: env(0.06, 0.3, 0.8, 0.25),
        filter: { type: 'lowpass', hz: 1200, q: 1, envAmount: 3, envDecay: 0.25 },
        vibrato: { rate: 5, cents: 8, delay: 0.4 },
        gain: 0.26,
      }),
      woodwind: synth({
        name: 'Woodwind',
        oscs: [osc('triangle', 0, 0, 0.8), osc('sine', 1, 0, 0.2)],
        env: env(0.05, 0.2, 0.8, 0.15),
        vibrato: { rate: 5.5, cents: 16, delay: 0.2 },
        gain: 0.3,
      }),
      'string-pad': synth({
        name: 'String pad',
        oscs: [osc('sawtooth', 0, -9, 0.5), osc('sawtooth', 0, 9, 0.5)],
        env: env(0.5, 1, 0.85, 1.2),
        filter: { type: 'lowpass', hz: 1800, q: 0.5, envAmount: 1, envDecay: 1 },
        vibrato: { rate: 4.5, cents: 10, delay: 0.4 },
        gain: 0.2,
        sends: { reverb: 1.3, delay: 0 },
      }),
      harp: synth({
        name: 'Harp',
        oscs: [osc('triangle', 0, 0, 0.8), osc('sine', 1, 0, 0.2)],
        env: env(0.002, 1.2, 0, 0.6),
        gain: 0.3,
      }),
      'low-strings': synth({
        name: 'Low strings',
        oscs: [osc('sawtooth', 0, -5, 0.5), osc('sawtooth', 0, 5, 0.5)],
        env: env(0.08, 0.3, 0.85, 0.35),
        filter: { type: 'lowpass', hz: 900, q: 0.7, envAmount: 1, envDecay: 0.3 },
        gain: 0.36,
        sends: { reverb: 0.8, delay: 0 },
      }),
      bells: synth({
        name: 'Bells',
        oscs: [osc('sine', 0, 0, 1)],
        fm: { ratio: 3.5, index: 2, decay: 1.5 },
        env: env(0.002, 1.8, 0, 1),
        gain: 0.2,
      }),
      'orchestra-kit': drums({
        name: 'Timpani & cymbals',
        kick: { wave: 'sine', hz: 70, sweep: 1.15, sweepTime: 0.08, decay: 1.1, click: 0 },
        snare: { noise: 'white', filter: 'bandpass', hz: 2500, toneHz: 200, decay: 0.18 },
        hat: { noise: 'white', hz: 8000, decay: 0.06 },
        crashDecay: 2.5,
        gain: 0.85,
        sends: { reverb: 1.2, delay: 0 },
      }),
    },
    fx: {
      reverbSeconds: 3.5,
      reverbSend: 0.45,
      delayBeats: 0.75,
      delaySend: 0,
      delayFeedback: 0.2,
      crush: 0,
      lowpassHz: 14000,
    },
    lanes: ['#e8c27a', '#c97b4a', '#8fb8a8', '#d9d2c3', '#a77fb0', '#7f9fd1'],
  },

  techno: {
    id: 'techno',
    name: 'Techno',
    blurb: 'Squelchy acid lines, dark pads, and a pounding four-on-the-floor kit.',
    roles: {
      lead: 'acid',
      lead2: 'square-stab',
      counter: 'fm-pluck',
      pad: 'dark-pad',
      chords: 'stab',
      bass: 'sub-bass',
      arp: 'acid-arp',
      drums: '909-kit',
    },
    patches: {
      acid: synth({
        name: 'Acid',
        oscs: [osc('sawtooth', 0, 0, 1)],
        env: env(0.003, 0.18, 0.3, 0.06),
        filter: { type: 'lowpass', hz: 380, q: 14, envAmount: 7, envDecay: 0.14 },
        gain: 0.24,
        sends: { reverb: 0.6, delay: 1 },
      }),
      'square-stab': synth({
        name: 'Square stab',
        oscs: [osc('square', 0, 0, 0.7), osc('square', 0, 7, 0.3)],
        env: env(0.003, 0.12, 0.2, 0.08),
        filter: { type: 'lowpass', hz: 1600, q: 4, envAmount: 3, envDecay: 0.08 },
        gain: 0.18,
      }),
      'fm-pluck': synth({
        name: 'FM pluck',
        oscs: [osc('sine', 0, 0, 1)],
        fm: { ratio: 2, index: 3, decay: 0.2 },
        env: env(0.002, 0.3, 0, 0.15),
        gain: 0.24,
      }),
      'dark-pad': synth({
        name: 'Dark pad',
        oscs: [osc('sawtooth', 0, -10, 0.5), osc('sawtooth', 0, 10, 0.5)],
        env: env(1, 1.5, 0.8, 1.5),
        filter: { type: 'lowpass', hz: 700, q: 2, envAmount: 1.5, envDecay: 1.5 },
        gain: 0.2,
        sends: { reverb: 1.5, delay: 0.5 },
      }),
      stab: synth({
        name: 'Chord stab',
        oscs: [osc('sawtooth', 0, -8, 0.5), osc('sawtooth', 0, 8, 0.5)],
        env: env(0.002, 0.18, 0, 0.12),
        filter: { type: 'lowpass', hz: 1500, q: 5, envAmount: 4, envDecay: 0.1 },
        gain: 0.2,
        sends: { reverb: 1, delay: 1.3 },
      }),
      'sub-bass': synth({
        name: 'Sub bass',
        oscs: [osc('sine', 0, 0, 0.85), osc('square', 1, 0, 0.15)],
        env: env(0.003, 0.15, 0.8, 0.05),
        filter: { type: 'lowpass', hz: 600, q: 1, envAmount: 1, envDecay: 0.1 },
        gain: 0.5,
        sends: { reverb: 0, delay: 0 },
      }),
      'acid-arp': synth({
        name: 'Acid arp',
        oscs: [osc('sawtooth', 0, 0, 1)],
        env: env(0.002, 0.1, 0, 0.04),
        filter: { type: 'lowpass', hz: 900, q: 10, envAmount: 5, envDecay: 0.08 },
        gain: 0.18,
      }),
      '909-kit': drums({
        name: '909 kit',
        kick: { wave: 'sine', hz: 50, sweep: 4, sweepTime: 0.08, decay: 0.38, click: 0.5 },
        snare: { noise: 'white', filter: 'bandpass', hz: 2000, toneHz: 190, decay: 0.2 },
        hat: { noise: 'metal', hz: 8000, decay: 0.04 },
        crashDecay: 1.6,
        gain: 0.9,
        sends: { reverb: 0.4, delay: 0 },
      }),
    },
    fx: {
      reverbSeconds: 1.6,
      reverbSend: 0.15,
      delayBeats: 0.75,
      delaySend: 0.18,
      delayFeedback: 0.4,
      crush: 0,
      lowpassHz: 20000,
    },
    lanes: ['#c6ff00', '#ff2a2a', '#00e5ff', '#ff9100', '#f5f5f5', '#d500f9'],
  },
};

export function patchKey(style: StyleDef, track: Pick<Track, 'role' | 'inst'>): string {
  if (track.inst !== null && Object.prototype.hasOwnProperty.call(style.patches, track.inst)) {
    return track.inst;
  }
  return style.roles[track.role];
}

export function resolvePatch(style: StyleDef, track: Pick<Track, 'role' | 'inst'>): Patch {
  return style.patches[patchKey(style, track)];
}
