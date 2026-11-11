import { describe, expect, it } from 'vitest';
import { DEFAULT_CLAP, DEFAULT_TOMS, drums, env, kitClap, kitToms, synth, VOWELS } from '../src/audio/patches';
import type { DrumKit } from '../src/audio/patches';

describe('vowel formants', () => {
  const vowels = Object.entries(VOWELS);

  it('has the four vowels', () => {
    expect(vowels.map(([name]) => name).sort()).toEqual(['ah', 'ee', 'oh', 'oo']);
  });

  it('has exactly three formants per vowel, ascending in frequency', () => {
    for (const [name, formants] of vowels) {
      expect(formants, name).toHaveLength(3);
      for (let index = 1; index < formants.length; index += 1) {
        expect(formants[index].hz, `${name} formant ${index}`).toBeGreaterThan(
          formants[index - 1].hz,
        );
      }
    }
  });

  it('keeps every q above zero and every gain in (0, 1]', () => {
    for (const [name, formants] of vowels) {
      for (const formant of formants) {
        expect(formant.q, `${name} formant q`).toBeGreaterThan(0);
        expect(formant.gain, `${name} formant gain`).toBeGreaterThan(0);
        expect(formant.gain, `${name} formant gain`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives the first formant of each vowel a gain of 1', () => {
    for (const [name, formants] of vowels) expect(formants[0].gain, name).toBe(1);
  });
});

// A kit with only the required fields, for the optional-settings tests.
function testKit(extra: Partial<Pick<DrumKit, 'toms' | 'clap'>> = {}): DrumKit {
  return drums({
    name: 'Test kit',
    kick: { wave: 'sine', hz: 55, sweep: 2, sweepTime: 0.05, decay: 0.3, click: 0 },
    snare: { noise: 'white', filter: 'bandpass', hz: 1500, toneHz: 0, decay: 0.15 },
    hat: { noise: 'white', hz: 6000, decay: 0.04 },
    crashDecay: 1,
    gain: 1,
    ...extra,
  });
}

describe('chorus', () => {
  it('is off unless a patch opts in, and keeps explicit settings', () => {
    const plain = synth({
      name: 'Plain',
      oscs: [],
      env: env(0.01, 0.1, 0.8, 0.1),
      gain: 1,
    });
    expect(plain.chorus).toBeUndefined();

    const wide = synth({
      name: 'Wide',
      oscs: [],
      env: env(0.01, 0.1, 0.8, 0.1),
      gain: 1,
      chorus: { rate: 0.4, depth: 3, mix: 0.3 },
    });
    expect(wide.chorus).toEqual({ rate: 0.4, depth: 3, mix: 0.3 });
  });
});

describe('drum kit defaults', () => {
  it('has the old toms as defaults', () => {
    expect(DEFAULT_TOMS).toEqual({
      hz: [90, 130, 180],
      sweep: 1.6,
      sweepTime: 0.06,
      decay: 0.35,
      wave: 'sine',
    });
  });

  it('gives a kit without toms the defaults', () => {
    expect(kitToms(testKit())).toEqual(DEFAULT_TOMS);
  });

  it('fills a missing tom wave with sine', () => {
    const kit = testKit({
      toms: { hz: [100, 140, 200], sweep: 1.4, sweepTime: 0.05, decay: 0.3 },
    });
    expect(kitToms(kit)).toEqual({
      hz: [100, 140, 200],
      sweep: 1.4,
      sweepTime: 0.05,
      decay: 0.3,
      wave: 'sine',
    });
  });

  it('gives a kit without clap the defaults', () => {
    expect(kitClap(testKit())).toEqual({ hz: 1100, q: 1.2, decay: 0.18 });
    expect(DEFAULT_CLAP).toEqual({ hz: 1100, q: 1.2, decay: 0.18 });
  });
});
