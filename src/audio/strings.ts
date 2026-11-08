// Plucked-string (Karplus-Strong) synthesis. Pure: no DOM, no audio.

export interface StringSpec {
  decay: number;
  brightness: number;
  pick: number;
}

/** How long every plucked string is rendered; the voices reuse each pitch's buffer. */
export const STRING_SECONDS = 2.5;

const SEED = 11;

// Fixed seed, so a string's excitation is the same every time. Copied from voices.ts.
function seededNoise(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * One plucked string at `freq`: a burst of fixed-seed noise shaped by the pick position circulates
 * in a delay line one period long, losing its top end on each pass, so it rings and decays.
 */
export function pluckSamples(
  sampleRate: number,
  freq: number,
  spec: StringSpec,
  seconds = STRING_SECONDS,
): Float32Array<ArrayBuffer> {
  const period = sampleRate / freq;
  const s = 0.5 + 0.45 * clamp(spec.brightness, 0, 1);
  const delayTotal = period - (1 - s);
  const delayLength = Math.max(2, Math.floor(delayTotal - 0.5));
  const frac = delayTotal - delayLength;
  const apCoefficient = (1 - frac) / (1 + frac);
  const decay = Math.max(0.05, spec.decay);
  const loopGain = 10 ** (-3 / (decay * freq));

  // Excitation: noise shaped by the pick position, with the mean removed and the peak at 1.
  const random = seededNoise(SEED);
  const noise = new Float32Array(delayLength);
  for (let i = 0; i < delayLength; i += 1) noise[i] = random() * 2 - 1;
  const pickSamples = Math.max(1, Math.round(clamp(spec.pick, 0.05, 0.5) * delayLength));
  const excitation = new Float32Array(delayLength);
  let sum = 0;
  for (let i = 0; i < delayLength; i += 1) {
    excitation[i] = noise[i] - (i >= pickSamples ? noise[i - pickSamples] : 0);
    sum += excitation[i];
  }
  const mean = sum / delayLength;
  let excitationPeak = 0;
  for (let i = 0; i < delayLength; i += 1) {
    excitation[i] -= mean;
    excitationPeak = Math.max(excitationPeak, Math.abs(excitation[i]));
  }
  if (excitationPeak > 0) {
    for (let i = 0; i < delayLength; i += 1) excitation[i] /= excitationPeak;
  }

  // The delay line starts filled with the excitation. Each sample reads the line, then writes back
  // the loop-filtered and all-passed value, so the burst circulates and decays.
  const line = new Float32Array(excitation);
  const output = new Float32Array(Math.ceil(seconds * sampleRate));
  let previousRead = 0;
  let previousFilter = 0;
  let previousAllpass = 0;
  let cursor = 0;
  for (let n = 0; n < output.length; n += 1) {
    const read = line[cursor];
    output[n] = read;
    const filtered = s * read + (1 - s) * previousRead;
    const allpass = apCoefficient * filtered + previousFilter - apCoefficient * previousAllpass;
    line[cursor] = loopGain * allpass;
    previousRead = read;
    previousFilter = filtered;
    previousAllpass = allpass;
    cursor = (cursor + 1) % delayLength;
  }

  let outputPeak = 0;
  for (let n = 0; n < output.length; n += 1) {
    outputPeak = Math.max(outputPeak, Math.abs(output[n]));
  }
  if (outputPeak > 0) {
    for (let n = 0; n < output.length; n += 1) output[n] /= outputPeak;
  }
  return output;
}
