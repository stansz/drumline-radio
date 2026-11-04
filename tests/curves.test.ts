import { describe, expect, it } from 'vitest';
import {
  attackTime,
  CRUSH_POINTS,
  crushCurve,
  noteGain,
  pulseCoefficients,
  SOFT_CLIP_POINTS,
  softClipCurve,
  velocityGain,
} from '../src/audio/curves';

describe('softClipCurve', () => {
  it('is a long symmetric curve capped below one', () => {
    const curve = softClipCurve();
    expect(curve.length).toBe(SOFT_CLIP_POINTS);
    expect(curve[2048]).toBe(0);
    expect(Math.abs(curve[0])).toBeGreaterThan(0);
    expect(Math.abs(curve[0])).toBeLessThanOrEqual(0.95);
    expect(Math.abs(curve[curve.length - 1])).toBeLessThanOrEqual(0.95);
    expect(curve[0]).toBeCloseTo(-curve[curve.length - 1], 6);
  });

  it('is the identity below the knee', () => {
    const curve = softClipCurve();
    expect(curve[3072]).toBeCloseTo(0.5, 3);
  });
});

describe('crushCurve', () => {
  it('quantises into at most 49 steps', () => {
    const curve = crushCurve();
    expect(curve.length).toBe(CRUSH_POINTS);
    expect(new Set(curve).size).toBeLessThanOrEqual(49);
  });
});

describe('pulseCoefficients', () => {
  it('builds the Fourier series of a pulse wave', () => {
    const { real, imag } = pulseCoefficients(0.125, 32);
    expect(real.length).toBe(33);
    expect(imag.length).toBe(33);
    expect(imag[0]).toBe(0);
    expect(imag[1]).toBeCloseTo((2 / Math.PI) * Math.sin(Math.PI / 8), 6);
    for (const value of real) expect(value).toBe(0);
  });
});

describe('gain helpers', () => {
  it('maps velocity from 0 to 1', () => {
    expect(velocityGain(127)).toBeCloseTo(1, 6);
    expect(velocityGain(0)).toBe(0);
  });

  it('divides a chord across its pitches', () => {
    expect(noteGain(0.5, 127, 4)).toBeCloseTo(0.25, 6);
  });
});

describe('attackTime', () => {
  it('stretches short attacks on low notes to half a cycle', () => {
    expect(attackTime(0.002, 1000)).toBeCloseTo(0.003, 6);
    expect(attackTime(0.002, 100)).toBeCloseTo(0.005, 6);
    expect(attackTime(0.002, 30)).toBeCloseTo(0.012, 6);
  });

  it('keeps a patch attack that is already longer', () => {
    expect(attackTime(0.4, 55)).toBe(0.4);
  });
});
