import { describe, expect, it } from 'vitest';
import { ROLES, STYLES } from '../src/music/roles';
import { resolvePatch, STYLE_DEFS } from '../src/audio/styles';

describe('styles', () => {
  it('has a definition for every style', () => {
    for (const id of STYLES) {
      expect(STYLE_DEFS[id]).toBeDefined();
      expect(STYLE_DEFS[id].id).toBe(id);
    }
  });

  it('maps every role to an existing patch of the right kind', () => {
    for (const id of STYLES) {
      const style = STYLE_DEFS[id];
      for (const role of ROLES) {
        const key = style.roles[role];
        const patch = style.patches[key];
        expect(patch, `${id} ${role} -> ${key}`).toBeDefined();
        if (role === 'drums') expect(patch.kind).toBe('drums');
        else expect(patch.kind).toBe('synth');
      }
    }
  });

  it('has sane synth patches', () => {
    for (const id of STYLES) {
      for (const [key, patch] of Object.entries(STYLE_DEFS[id].patches)) {
        if (patch.kind !== 'synth') continue;
        expect(patch.oscs.length, `${id} ${key}`).toBeGreaterThanOrEqual(1);
        expect(patch.env.attack, `${id} ${key}`).toBeGreaterThan(0);
        expect(patch.gain, `${id} ${key}`).toBeGreaterThan(0);
        expect(patch.gain, `${id} ${key}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives every style six lanes', () => {
    for (const id of STYLES) expect(STYLE_DEFS[id].lanes.length).toBe(6);
  });

  it('resolves an inst before the role and falls back to the role', () => {
    expect(resolvePatch(STYLE_DEFS.orchestral, { role: 'lead', inst: 'brass' }).name).toBe('Brass');
    expect(resolvePatch(STYLE_DEFS.techno, { role: 'lead', inst: 'brass' }).name).toBe('Acid');
    expect(resolvePatch(STYLE_DEFS.techno, { role: 'lead', inst: null }).name).toBe('Acid');
  });

  it('drives the cinematic guitar and keeps every drive in range', () => {
    const guitar = STYLE_DEFS.cinematic.patches.guitar;
    expect(guitar.kind).toBe('synth');
    if (guitar.kind !== 'synth') return;
    expect(guitar.drive).toBe(0.6);
    for (const id of STYLES) {
      for (const patch of Object.values(STYLE_DEFS[id].patches)) {
        if (patch.kind !== 'synth' || patch.drive === undefined) continue;
        expect(patch.drive, `${id} ${patch.name}`).toBeGreaterThanOrEqual(0);
        expect(patch.drive, `${id} ${patch.name}`).toBeLessThanOrEqual(1);
      }
    }
  });
});
