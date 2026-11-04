// Wave-shaping curves and gain helpers. Pure: no DOM, no audio.

export const SOFT_CLIP_KNEE = 0.85;
export const SOFT_CLIP_CEILING = 0.95;
export const SOFT_CLIP_POINTS = 4097;
export const CRUSH_STEPS = 24;
export const CRUSH_POINTS = 4097;

// Linear below the knee, then eases toward the ceiling. A WaveShaper holds the last curve value
// for any louder input, so this caps the output however much the limiter lets through.
export function softClipCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(SOFT_CLIP_POINTS);
  const headroom = SOFT_CLIP_CEILING - SOFT_CLIP_KNEE;
  for (let i = 0; i < curve.length; i += 1) {
    const input = (i / (curve.length - 1)) * 2 - 1;
    const level = Math.abs(input);
    const shaped =
      level <= SOFT_CLIP_KNEE
        ? level
        : SOFT_CLIP_KNEE + headroom * Math.tanh((level - SOFT_CLIP_KNEE) / headroom);
    curve[i] = Math.sign(input) * shaped;
  }
  return curve;
}

export function crushCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(CRUSH_POINTS);
  for (let i = 0; i < curve.length; i += 1) {
    const input = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.round(input * CRUSH_STEPS) / CRUSH_STEPS;
  }
  return curve;
}

/** Fourier coefficients of a pulse wave with the given duty cycle. */
export function pulseCoefficients(
  duty: number,
  harmonics: number,
): { real: Float32Array<ArrayBuffer>; imag: Float32Array<ArrayBuffer> } {
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n += 1) {
    imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  }
  return { real, imag };
}

export function velocityGain(velocity: number): number {
  return (velocity / 127) ** 1.6;
}

export function noteGain(patchGain: number, velocity: number, chordSize: number): number {
  return (patchGain * velocityGain(velocity)) / Math.sqrt(Math.max(1, chordSize));
}

export const MIN_ATTACK = 0.003;
export const MAX_LOW_ATTACK = 0.012;

// A fade-in much shorter than one wave cycle clicks, and low notes have long cycles. So the attack
// is at least half a cycle (3 ms to 12 ms), and a patch's own longer attack is kept.
export function attackTime(patchAttack: number, freq: number): number {
  const halfCycle = 0.5 / freq;
  return Math.max(patchAttack, Math.min(MAX_LOW_ATTACK, Math.max(MIN_ATTACK, halfCycle)));
}

/** A loopable vinyl bed: faint hiss plus sparse clicks of random size. */
export function crackleSamples(
  length: number,
  sampleRate: number,
  random: () => number,
): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i += 1) samples[i] = (random() * 2 - 1) * 0.015;

  const clickCount = Math.round((7 * length) / sampleRate);
  const burstLength = Math.round(sampleRate * 0.002);
  for (let click = 0; click < clickCount; click += 1) {
    const start = Math.floor(random() * length);
    const amplitude = 0.25 + random() * 0.75;
    const sign = random() < 0.5 ? -1 : 1;
    for (let offset = 0; offset < burstLength; offset += 1) {
      const index = start + offset;
      if (index >= length) break;
      samples[index] += sign * amplitude * (1 - offset / burstLength);
    }
  }

  for (let i = 0; i < length; i += 1) {
    samples[i] = Math.max(-1, Math.min(1, samples[i]));
  }
  return samples;
}
