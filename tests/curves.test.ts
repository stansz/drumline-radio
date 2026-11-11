import { describe, expect, it } from 'vitest';
import {
  attackTime,
  audibleOsc,
  BEND_GLIDE,
  bendGlide,
  airSamples,
  crackleSamples,
  CRUSH_POINTS,
  crushCurve,
  driveCurve,
  driveMakeup,
  fmIndex,
  MIN_OSC_HZ,
  noteGain,
  pulseCoefficients,
  SOFT_CLIP_POINTS,
  softClipCurve,
  velocityGain,
  velocityFilterAmount,
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

describe('velocityFilterAmount', () => {
  it('leaves the envelope unchanged when velocity-to-filter is off', () => {
    expect(velocityFilterAmount(4, 0, 0)).toBe(4);
    expect(velocityFilterAmount(4, 127, 0)).toBe(4);
  });

  it('closes the filter sweep for soft notes as the depth rises', () => {
    expect(velocityFilterAmount(4, 0, 1)).toBe(1);
    expect(velocityFilterAmount(4, 127, 1)).toBe(4);
    expect(velocityFilterAmount(4, 64, 0.5)).toBeCloseTo(1 + 3 * (1 - 0.5 * (1 - 64 / 127)), 6);
  });

  it('clamps velocity and depth', () => {
    expect(velocityFilterAmount(4, -10, 1)).toBe(1);
    expect(velocityFilterAmount(4, 200, 1)).toBe(4);
    expect(velocityFilterAmount(4, 127, 3)).toBe(4);
    expect(velocityFilterAmount(4, 0, -1)).toBe(4);
  });
});

describe('fmIndex', () => {
  it('defaults to no velocity scaling and a floor of 5%', () => {
    const result = fmIndex({ index: 3 }, 64);
    expect(result.peak).toBeCloseTo(3, 6);
    expect(result.floor).toBeCloseTo(0.15, 6);
  });

  it('scales the peak by velocity and the floor by sustain', () => {
    const result = fmIndex({ index: 2, velocity: 1, sustain: 0.5 }, 127);
    expect(result.peak).toBeCloseTo(2, 6);
    expect(result.floor).toBeCloseTo(1, 6);
  });

  it('brings the peak to zero for a note at velocity zero', () => {
    expect(fmIndex({ index: 2, velocity: 1 }, 0).peak).toBe(0);
  });

  it('lowers the peak by half when velocity scaling is 0.5', () => {
    expect(fmIndex({ index: 4, velocity: 0.5 }, 0).peak).toBe(2);
  });

  it('clamps a velocity scaling above one', () => {
    expect(fmIndex({ index: 4, velocity: 3 }, 0).peak).toBe(0);
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

describe('audibleOsc', () => {
  it('skips an oscillator that would sound below the floor', () => {
    expect(audibleOsc(43.65, -1)).toBe(false);
    expect(audibleOsc(65.41, -1)).toBe(true);
    expect(audibleOsc(41.2, 0)).toBe(true);
    expect(audibleOsc(MIN_OSC_HZ, 0)).toBe(true);
    expect(audibleOsc(29.9, 0)).toBe(false);
  });
});

describe('bendGlide', () => {
  it('caps the glide, halves a short segment, and keeps a floor', () => {
    expect(BEND_GLIDE).toBe(0.1);
    expect(bendGlide(1)).toBe(0.1);
    expect(bendGlide(0.05)).toBeCloseTo(0.025, 6);
    expect(bendGlide(0)).toBe(0.005);
    expect(bendGlide(0.004)).toBe(0.005);
  });
});

describe('driveCurve', () => {
  it('is a normalised odd-symmetric tanh curve', () => {
    const curve = driveCurve(0.5);
    expect(curve.length).toBe(1024);
    expect(curve[0]).toBe(-1);
    expect(curve[curve.length - 1]).toBe(1);
    expect(Math.abs(curve[511])).toBeLessThan(0.02);
    for (let i = 0; i < curve.length; i += 1) {
      expect(curve[i]).toBeCloseTo(-curve[curve.length - 1 - i], 6);
    }
  });

  it('takes a sample count and clamps the amount', () => {
    expect(driveCurve(0.5, 17).length).toBe(17);
    expect(Array.from(driveCurve(-1))).toEqual(Array.from(driveCurve(0)));
    expect(Array.from(driveCurve(2))).toEqual(Array.from(driveCurve(1)));
  });
});

describe('crackleSamples', () => {
  it('builds a full second of clamped hiss and clicks', () => {
    let state = 12345;
    const seeded = (): number => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
    const samples = crackleSamples(48000, 48000, seeded);
    expect(samples.length).toBe(48000);
    let loudest = 0;
    for (const value of samples) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
      loudest = Math.max(loudest, Math.abs(value));
    }
    expect(loudest).toBeGreaterThan(0.2);
  });
});

describe('driveMakeup', () => {
  it('undoes the drive curve slope at zero, so quiet input keeps its level', () => {
    for (const amount of [0, 0.05, 0.3, 1]) {
      const curve = driveCurve(amount, 4097);
      const slope = (curve[2049] - curve[2047]) / (4 / 4096);
      expect(slope * driveMakeup(amount)).toBeCloseTo(1, 2);
    }
  });
});

describe('airSamples', () => {
  it('builds a soft, bounded, never-silent bed of air', () => {
    let state = 999;
    const seeded = (): number => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
    const samples = airSamples(48000 * 8, 48000, seeded);
    expect(samples.length).toBe(48000 * 8);
    let sum = 0;
    for (const value of samples) {
      expect(Math.abs(value)).toBeLessThan(0.5);
      sum += value * value;
    }
    const rmsDb = 20 * Math.log10(Math.sqrt(sum / samples.length));
    expect(rmsDb).toBeGreaterThan(-45);
    expect(rmsDb).toBeLessThan(-15);
  });
});
