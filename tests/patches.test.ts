import { describe, expect, it } from 'vitest';
import { VOWELS } from '../src/audio/patches';

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
