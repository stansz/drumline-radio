import { describe, expect, it } from 'vitest';
import { ROLES, STYLES } from '../src/music/roles';
import { resolvePatch, STYLE_DEFS, trackVolume, trackVolumeAt, withBankInstruments } from '../src/audio/styles';
import type { Song } from '../src/music/song';
import type { StyleId } from '../src/music/roles';
import { INSTRUMENTS } from '../src/audio/instruments';

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
        expect(patch.oscs.length + (patch.string ? 1 : 0), `${id} ${key}`).toBeGreaterThanOrEqual(1);
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
    expect(resolvePatch(STYLE_DEFS.orchestral, { role: 'lead', inst: 'brass' }).name).toBe('FM brass');
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

  it('builds every style patch from the bank', () => {
    for (const id of STYLES) {
      for (const [local, patch] of Object.entries(STYLE_DEFS[id].patches)) {
        expect(Object.values(INSTRUMENTS), `${id} ${local}`).toContain(patch);
      }
    }
  });

  it('resolves inst=bank:<id> in any style', () => {
    expect(resolvePatch(STYLE_DEFS.techno, { role: 'lead', inst: 'bank:radio-lead' }).name).toBe(
      'Radio lead',
    );
    expect(resolvePatch(STYLE_DEFS.chiptune, { role: 'lead', inst: 'bank:square-lead' }).name).toBe(
      'Square lead',
    );
    expect(resolvePatch(STYLE_DEFS.techno, { role: 'lead', inst: 'bank:nope' }).name).toBe('Acid');
    expect(resolvePatch(STYLE_DEFS.techno, { role: 'lead', inst: 'radio-lead' }).name).toBe('Acid');
  });

  it('gives Studio every bank instrument under its bank id, and old names to their replacements', () => {
    for (const id of Object.keys(INSTRUMENTS)) expect(STYLE_DEFS.studio.patches[id]).toBe(INSTRUMENTS[id]);
    expect(STYLE_DEFS.studio.patches['tine-keys']).toBe(INSTRUMENTS['fm-rhodes']);
    expect(STYLE_DEFS.studio.patches.harp).toBe(INSTRUMENTS['concert-harp']);
    expect(STYLE_DEFS.studio.patches['soft-flute']).toBe(INSTRUMENTS.woodwind);
    expect(resolvePatch(STYLE_DEFS.studio, { role: 'lead', inst: 'radio-lead' }).name).toBe('Radio lead');
    expect(resolvePatch(STYLE_DEFS.studio, { role: 'bass', inst: 'techno-sub' })).toBe(INSTRUMENTS['techno-sub']);
  });

  it('keeps local names that differ from bank ids', () => {
    expect(STYLE_DEFS.chiptune.patches['square-lead'].name).toBe('Square');
    expect(STYLE_DEFS.techno.patches['sub-bass']).toBe(INSTRUMENTS['techno-sub']);
    expect(STYLE_DEFS.cinematic.patches.strings.name).toBe('String section');
  });
});

describe('withBankInstruments', () => {
  const track = (inst: string | null) => ({ id: 't', role: 'lead', inst }) as unknown as Song['tracks'][number];
  const song = (style: StyleId, ...insts: (string | null)[]) =>
    ({ meta: { style }, tracks: insts.map(track) }) as unknown as Song;

  it('plays a bank instrument the home style lacks', () => {
    const result = withBankInstruments(song('synthwave', 'vox-lead', 'choir-aah'));
    expect(result.tracks.map((t) => t.inst)).toEqual(['bank:vox-lead', 'bank:choir-aah']);
    expect(resolvePatch(STYLE_DEFS.chiptune, result.tracks[0]).name).toBe(INSTRUMENTS['vox-lead'].name);
  });

  it('plays the vox lead on the lead patch in alt rock, orchestral and cinematic', () => {
    const vox = track('bank:vox-lead');
    expect(resolvePatch(STYLE_DEFS.altrock, vox).name).toBe(STYLE_DEFS.altrock.patches['fuzz-lead'].name);
    expect(resolvePatch(STYLE_DEFS.orchestral, vox).name).toBe(STYLE_DEFS.orchestral.patches.strings.name);
    expect(resolvePatch(STYLE_DEFS.cinematic, vox).name).toBe(STYLE_DEFS.cinematic.patches.guitar.name);
    expect(resolvePatch(STYLE_DEFS.synthwave, vox)).toBe(INSTRUMENTS['vox-lead']);
  });

  it("leaves the home style's own names, bank: names, unknown names and no inst alone", () => {
    const input = song('synthwave', 'sub-bass', 'bank:oboe', 'nothing-here', null);
    expect(withBankInstruments(input)).toBe(input);
  });
});

describe('inst.<style>', () => {
  it('plays its instrument in that style only, from the style or the bank', () => {
    const track = { role: 'lead', inst: 'bank:vox-lead', styleInst: { techno: 'analog-synth', altrock: 'clean-guitar' } } as const;
    expect(resolvePatch(STYLE_DEFS.techno, track)).toBe(INSTRUMENTS['analog-synth']);
    expect(resolvePatch(STYLE_DEFS.altrock, track)).toBe(STYLE_DEFS.altrock.patches['clean-guitar']);
    expect(resolvePatch(STYLE_DEFS.synthwave, track)).toBe(INSTRUMENTS['vox-lead']);
  });
});

describe('trackVolume', () => {
  it("uses a track's per-style volume in that style and its vol= elsewhere", () => {
    const track = { vol: 0.5, styleVol: { altrock: 0.2 } };
    expect(trackVolume(track, 'altrock')).toBe(0.2);
    expect(trackVolume(track, 'synthwave')).toBe(0.5);
    expect(trackVolume({ vol: 0.7 }, 'altrock')).toBe(0.7);
  });

  it('applies volume steps from their bar onward', () => {
    const track = {
      vol: 0.5,
      styleVol: { altrock: 0.2 },
      volumeSteps: [
        { bar: 5, volume: 0.8 },
        { bar: 9, volume: 0 },
      ],
    };
    expect(trackVolumeAt(track, 'synthwave', 1)).toBe(0.5);
    expect(trackVolumeAt(track, 'synthwave', 4)).toBe(0.5);
    expect(trackVolumeAt(track, 'synthwave', 5)).toBe(0.8);
    expect(trackVolumeAt(track, 'synthwave', 8)).toBe(0.8);
    expect(trackVolumeAt(track, 'synthwave', 9)).toBe(0);
    expect(trackVolumeAt(track, 'altrock', 1)).toBe(0.2);
    expect(trackVolumeAt(track, 'altrock', 5)).toBe(0.8);
    expect(trackVolumeAt({ vol: 0.5 }, 'synthwave', 5)).toBe(0.5);
  });
});
