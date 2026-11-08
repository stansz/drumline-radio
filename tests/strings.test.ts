import { describe, expect, it } from 'vitest';
import { pluckSamples, STRING_SECONDS } from '../src/audio/strings';

const SAMPLE_RATE = 48000;
const SPEC = { decay: 2, brightness: 0.5, pick: 0.2 };

function peak(samples: Float32Array): number {
  let loudest = 0;
  for (const value of samples) loudest = Math.max(loudest, Math.abs(value));
  return loudest;
}

function rms(samples: Float32Array, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (end - start));
}

// The autocorrelation peak, refined by parabolic interpolation, gives the period in samples.
function periodAt(samples: Float32Array, freq: number): number {
  const start = 2400;
  const end = 7200;
  const minLag = Math.floor((0.5 * SAMPLE_RATE) / freq);
  const maxLag = Math.ceil((1.5 * SAMPLE_RATE) / freq);
  const correlations: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = start; i < end; i += 1) sum += samples[i] * samples[i + lag];
    correlations.push(sum);
  }
  let best = 0;
  for (let index = 1; index < correlations.length; index += 1) {
    if (correlations[index] > correlations[best]) best = index;
  }
  const left = correlations[best - 1] ?? correlations[best];
  const center = correlations[best];
  const right = correlations[best + 1] ?? correlations[best];
  const denominator = left - 2 * center + right;
  const offset = denominator === 0 ? 0 : (0.5 * (left - right)) / denominator;
  return minLag + best + offset;
}

describe('pluckSamples', () => {
  it('renders a normalised string of the requested length', () => {
    expect(STRING_SECONDS).toBe(2.5);
    const samples = pluckSamples(SAMPLE_RATE, 220, SPEC);
    expect(samples.length).toBe(Math.ceil(2.5 * SAMPLE_RATE));
    expect(peak(samples)).toBeCloseTo(1, 6);
    let allFinite = true;
    for (const value of samples) if (!Number.isFinite(value)) allFinite = false;
    expect(allFinite).toBe(true);

    const oneSecond = pluckSamples(SAMPLE_RATE, 220, SPEC, 1);
    expect(oneSecond.length).toBe(Math.ceil(1 * SAMPLE_RATE));
  });

  it('is deterministic', () => {
    const first = pluckSamples(SAMPLE_RATE, 220, SPEC);
    const second = pluckSamples(SAMPLE_RATE, 220, SPEC);
    expect(first).toEqual(second);
  });

  it('tunes to the requested frequency', () => {
    for (const freq of [110, 220, 440, 659.25]) {
      const samples = pluckSamples(SAMPLE_RATE, freq, SPEC);
      const measured = SAMPLE_RATE / periodAt(samples, freq);
      expect(Math.abs(measured - freq) / freq).toBeLessThan(0.01);
    }
  });

  it('decays by the requested amount', () => {
    const samples = pluckSamples(SAMPLE_RATE, 220, { ...SPEC, decay: 1 });
    const early = rms(samples, 0, Math.round(0.1 * SAMPLE_RATE));
    const late = rms(samples, Math.round(0.9 * SAMPLE_RATE), SAMPLE_RATE);
    expect(20 * Math.log10(early / late)).toBeGreaterThanOrEqual(20);
  });

  it('gets brighter as brightness rises', () => {
    const edge = (brightness: number): number => {
      const samples = pluckSamples(SAMPLE_RATE, 220, { ...SPEC, brightness });
      let sum = 0;
      for (let i = 1; i < 4800; i += 1) sum += Math.abs(samples[i] - samples[i - 1]);
      return sum / 4799;
    };
    expect(edge(1)).toBeGreaterThan(edge(0));
  });
});
