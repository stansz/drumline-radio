export type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pulse12' | 'pulse25';

export interface Osc {
  /** The waveform: a pure sine, a rich sawtooth or square, a triangle, or a pulse at 12.5% or 25% duty. */
  wave: Wave;
  /** Octaves above (or below) the written note; 0 is unison, -1 an octave down. */
  octave: number;
  /** Fine tuning in cents (±50 is the next semitone); opposite signs thicken a pair. */
  detune: number;
  /** Mix level, 0 to 1; several oscillators sum, so levels near 0.5 each keep headroom. */
  level: number;
}

/** One formant: a band-pass peak at a fixed frequency, whatever note is played. */
export interface Formant {
  hz: number;   // centre frequency in Hz
  q: number;    // sharpness: centre frequency ÷ bandwidth
  gain: number; // level of this band, 0 to 1
}

/** Formants of sung vowels (an alto-like voice), loudest band first: use as `formants: VOWELS.ah`. */
export const VOWELS: Record<'ah' | 'oh' | 'oo' | 'ee', Formant[]> = {
  ah: [{ hz: 800, q: 10, gain: 1 }, { hz: 1150, q: 12.8, gain: 0.5 }, { hz: 2900, q: 24.2, gain: 0.25 }],
  oh: [{ hz: 450, q: 6.4, gain: 1 }, { hz: 800, q: 10, gain: 0.3 }, { hz: 2830, q: 28.3, gain: 0.15 }],
  oo: [{ hz: 325, q: 6.5, gain: 1 }, { hz: 700, q: 11.7, gain: 0.15 }, { hz: 2530, q: 14.9, gain: 0.08 }],
  ee: [{ hz: 270, q: 4.5, gain: 1 }, { hz: 2140, q: 23.8, gain: 0.3 }, { hz: 2950, q: 29.5, gain: 0.2 }],
};

export interface SynthPatch {
  /** Discriminates a synth patch from a drum kit. */
  kind: 'synth';
  /** The display name, shown in the readout. */
  name: string;
  /** The oscillators layered into the voice; an empty list leaves only the plucked string. */
  oscs: Osc[];
  /** The amplitude envelope. */
  env: {
    /** Seconds to rise from silence to the peak. */
    attack: number;
    /** Seconds to fall from the peak toward the sustain level. */
    decay: number;
    /** The held level, 0–1 of the peak. */
    sustain: number;
    /** Seconds to fade to silence after the note ends. */
    release: number;
  };
  filter?: {
    /** Which edge the filter shapes: lowpass, highpass, or bandpass. */
    type: 'lowpass' | 'highpass' | 'bandpass';
    /** The corner frequency in Hz the filter settles back to. */
    hz: number;
    /** Resonance in dB-ish units, 0 to about 20; higher is sharper and whistles. */
    q: number;
    /** How far the filter envelope opens above `hz`, as a multiple; 1 leaves it still. */
    envAmount: number;
    /** Seconds for the filter envelope to fall back to `hz`. */
    envDecay: number;
  };
  vibrato?: {
    /** LFO rate in Hz; around 5 is a singer's wobble, under 1 a slow drift. */
    rate: number;
    /** Peak pitch wobble in cents; 10–20 is a normal vibrato. */
    cents: number;
    /** Seconds the vibrato waits before fading in. */
    delay: number;
  };
  /** Two-operator FM: a sine modulator at note frequency × ratio wobbles the oscillators' pitch. */
  fm?: {
    ratio: number;     // modulator frequency ÷ note frequency; whole numbers are harmonic, others bell-like
    index: number;     // peak modulation depth (× note frequency); higher is brighter
    decay: number;     // seconds for the index to fall from its peak toward its floor
    attack?: number;   // seconds for the index to rise from its floor to its peak (a brass swell); default 0
    sustain?: number;  // the index floor as a fraction of the peak; default 0.05
    velocity?: number; // 0 to 1: how much a soft note lowers the peak (0 = velocity has no effect); default 0
    targets?: number[]; // indexes into `oscs` that the modulator drives; default every oscillator
  };
  /** A plucked string (Karplus-Strong) voiced with the oscillators. */
  string?: {
    octave: number;      // like Osc.octave: -1 sounds an octave below the written note
    level: number;       // like Osc.level
    decay: number;       // seconds for the string to fall 60 dB
    brightness: number;  // 0 (mellow, plain averaging) to 1 (bright, metallic)
    pick: number;        // pick position, 0.05 (near the bridge, thin) to 0.5 (middle, round)
  };
  /** Formant bands: the oscillators and string pass through these band-pass filters in parallel,
   *  summed, before drive, filter, and envelope. Fixed frequencies make a vowel or a reed body. */
  formants?: Formant[];
  /** Breath: band-passed noise mixed in with the oscillators and string, through the same
   *  formants, drive, filter, and envelope. A flute's air, a breathy pad. */
  breath?: {
    level: number; // mix level, 0 to 1, like Osc.level
    hz: number;    // centre of the noise band in Hz, fixed whatever note is played
    q: number;     // band sharpness: centre ÷ bandwidth; low is airy and wide
  };
  /** Distortion amount, 0 to 1. A wave shaper with this much tanh drive. */
  drive?: number;
  /** Output level, 0 to 1, before the track channel and mix. */
  gain: number;
  /** Reverb and delay send levels, 0 to 1. */
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
    /** A second fixed-pitch sine for the drum shell's thud, mixed under the swept body. */
    body?: { hz: number; decay: number; level: number };
  };
  snare: {
    noise: 'white' | 'chip';
    filter: 'bandpass' | 'highpass';
    hz: number;
    toneHz: number;
    decay: number;
    /** Tuned tones in Hz, one triangle each; when set it replaces `toneHz`. */
    tones?: number[];
    /** Seconds for the tones to fade; default `decay * 0.5`. */
    toneDecay?: number;
    /** Seconds the noise holds at full level before cutting to silence in 15 ms, instead of decaying. */
    gate?: number;
  };
  hat: { noise: 'white' | 'chip' | 'metal'; hz: number; decay: number };
  /** Low, mid, and high tom pitches (GM 41, 45, 50), with their shared sweep and decay. */
  toms?: {
    hz: [number, number, number];
    sweep: number;
    sweepTime: number;
    decay: number;
    wave?: 'sine' | 'triangle';
  };
  /** The hand-clap's noise band, sharpness, and decay. */
  clap?: { hz: number; q: number; decay: number };
  /** Distortion amount on every hit, 0 to 1: a tanh wave shaper. */
  drive?: number;
  /** A low-pass corner on every hit of the kit, in Hz. */
  lowpassHz?: number;
  crashDecay: number;
  gain: number;
  sends: { reverb: number; delay: number };
}

/** The toms a kit gets when it names none. */
export const DEFAULT_TOMS = {
  hz: [90, 130, 180] as [number, number, number],
  sweep: 1.6,
  sweepTime: 0.06,
  decay: 0.35,
  wave: 'sine' as const,
};

/** The clap a kit gets when it names none. */
export const DEFAULT_CLAP = { hz: 1100, q: 1.2, decay: 0.18 };

/** The kit's toms, or the defaults. */
export function kitToms(kit: DrumKit): Required<NonNullable<DrumKit['toms']>> {
  return kit.toms ? { ...kit.toms, wave: kit.toms.wave ?? 'sine' } : { ...DEFAULT_TOMS };
}

/** The kit's clap, or the defaults. */
export function kitClap(kit: DrumKit): NonNullable<DrumKit['clap']> {
  return kit.clap ?? DEFAULT_CLAP;
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
