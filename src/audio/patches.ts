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
  /** A plucked string (Karplus-Strong) voiced with the oscillators. */
  string?: {
    octave: number;      // like Osc.octave: -1 sounds an octave below the written note
    level: number;       // like Osc.level
    decay: number;       // seconds for the string to fall 60 dB
    brightness: number;  // 0 (mellow, plain averaging) to 1 (bright, metallic)
    pick: number;        // pick position, 0.05 (near the bridge, thin) to 0.5 (middle, round)
  };
  /** Distortion amount, 0 to 1. A wave shaper with this much tanh drive. */
  drive?: number;
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

const DEFAULT_SENDS = { reverb: 1, delay: 1 };

export function osc(wave: Wave, octave: number, detune: number, level: number): Osc {
  return { wave, octave, detune, level };
}

export function env(attack: number, decay: number, sustain: number, release: number) {
  return { attack, decay, sustain, release };
}

type SynthInput = Omit<SynthPatch, 'kind' | 'sends'> & {
  sends?: { reverb: number; delay: number };
};

export function synth(input: SynthInput): SynthPatch {
  return { kind: 'synth', ...input, sends: input.sends ?? DEFAULT_SENDS };
}

type DrumInput = Omit<DrumKit, 'kind' | 'sends'> & {
  sends?: { reverb: number; delay: number };
};

export function drums(input: DrumInput): DrumKit {
  return { kind: 'drums', ...input, sends: input.sends ?? DEFAULT_SENDS };
}
