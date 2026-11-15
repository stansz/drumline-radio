import { describe, expect, it } from 'vitest';
import { gatedLoudness } from '../tools/browser/gated-loudness.mjs';

const RATE = 22050;

// 1 kHz sine of amplitude 0.1: mean square is A^2 / 2 = 0.005, so -0.691 + 10 log10(0.005).
const TONE = -0.691 + 10 * Math.log10(0.005);

function sine(seconds, amp = 0.1) {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = amp * Math.sin((2 * Math.PI * 1000 * i) / RATE);
  return out;
}

function plainLoudness(data, from, to) {
  let sq = 0;
  for (let i = from; i < to; i += 1) sq += data[i] * data[i];
  return sq > 0 ? -0.691 + 10 * Math.log10(sq / (to - from)) : -120;
}

describe('gatedLoudness', () => {
  it('reads a steady tone at its loudness', () => {
    const data = sine(4);
    expect(gatedLoudness(data, 0, data.length, RATE)).toBeCloseTo(-23.7, 1);
  });

  it('is not pulled down by silence after the tone', () => {
    const data = new Float32Array(4 * RATE);
    data.set(sine(1));
    const gated = gatedLoudness(data, 0, data.length, RATE);
    expect(Math.abs(gated - -23.7)).toBeLessThanOrEqual(0.75);
    const plain = plainLoudness(data, 0, data.length);
    expect(plain).toBeLessThanOrEqual(gated - 5);
  });

  it('returns -120 for silence', () => {
    expect(gatedLoudness(new Float32Array(4 * RATE), 0, 4 * RATE, RATE)).toBe(-120);
  });

  it('uses the whole range when it is shorter than one 400 ms block', () => {
    const data = sine(0.2);
    expect(gatedLoudness(data, 0, data.length, RATE)).toBeCloseTo(-23.7, 1);
  });

  it('measures only the selected range', () => {
    const data = new Float32Array(4 * RATE);
    data.set(sine(2, 0.01));
    const second = sine(2, 0.1);
    data.set(second, 2 * RATE);
    expect(gatedLoudness(data, 2 * RATE, 4 * RATE, RATE)).toBeCloseTo(-23.7, 1);
  });
});
