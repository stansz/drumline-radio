import { describe, expect, it } from 'vitest';
import { FAMILIES, INSTRUMENTS, KITS } from '../src/audio/instruments';

describe('the instrument bank', () => {
  it('has unique ids across families, and the merge holds every one', () => {
    const ids = Object.values(FAMILIES).flatMap((family) => Object.keys(family));
    expect(new Set(ids).size).toBe(ids.length);
    const total = Object.values(FAMILIES).reduce(
      (sum, family) => sum + Object.keys(family).length,
      0,
    );
    expect(total).toBe(72);
    expect(Object.keys(INSTRUMENTS).length).toBe(total);
  });

  it('gives the flute a breath layer and retires the old soft flute', () => {
    const flute = INSTRUMENTS.woodwind;
    expect(flute.kind).toBe('synth');
    if (flute.kind !== 'synth') return;
    expect(flute.breath).toBeDefined();
    expect(flute.breath?.level).toBeGreaterThan(0);
    expect(INSTRUMENTS['soft-flute']).toBeUndefined();
  });

  it('has drums only in the kits family', () => {
    for (const patch of Object.values(KITS)) expect(patch.kind).toBe('drums');
    for (const [name, family] of Object.entries(FAMILIES)) {
      if (name === 'kits') continue;
      for (const patch of Object.values(family)) expect(patch.kind).toBe('synth');
    }
  });

  it('names every bank id with lowercase letters, digits, and dashes', () => {
    for (const id of Object.keys(INSTRUMENTS)) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('keeps every chorus setting inside a usable range', () => {
    for (const [id, patch] of Object.entries(INSTRUMENTS)) {
      if (patch.kind !== 'synth' || !patch.chorus) continue;
      expect(patch.chorus.rate, id).toBeGreaterThan(0);
      expect(patch.chorus.depth, id).toBeGreaterThan(0);
      expect(patch.chorus.mix, id).toBeGreaterThan(0);
      expect(patch.chorus.mix, id).toBeLessThanOrEqual(1);
    }
  });

  it('gives choir-ooh a broad presence band over the oo vowel', () => {
    const patch = INSTRUMENTS['choir-ooh'];
    expect(patch.kind).toBe('synth');
    if (patch.kind !== 'synth') return;
    expect(
      patch.formants?.some((formant) => formant.hz >= 1200 && formant.hz <= 2500 && formant.q < 5),
    ).toBe(true);
  });
});
