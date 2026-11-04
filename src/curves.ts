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
