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
    expect(total).toBe(55);
    expect(Object.keys(INSTRUMENTS).length).toBe(total);
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
});
