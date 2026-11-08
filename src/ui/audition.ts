// The instrument page's data: every bank instrument with its family, technique, the styles that use
// it, and a short phrase to audition it. Pure: no DOM, no audio.

import { FAMILIES } from '../audio/instruments';
import type { Patch } from '../audio/patches';
import { STYLE_DEFS } from '../audio/styles';
import { STYLES, type Role, type StyleId } from '../music/roles';

export type Family = keyof typeof FAMILIES;

export interface StyleUse {
  style: StyleId;
  /** The style's local name for the instrument (what `inst=` takes in that style). */
  local: string;
  /** The roles that play it in that style, if any. */
  roles: Role[];
}

export interface Audition {
  id: string;
  name: string;
  family: Family;
  /** How the sound is made, for the tags on the page. */
  techniques: string[];
  uses: StyleUse[];
}

/** The role, and a two-bar phrase in that role's range, each family is auditioned with. */
const PHRASES: Record<Family, { role: Role; bars: string }> = {
  leads: {
    role: 'lead',
    bars: '| v=96 C5/8 D5/8 E5/8 G5/8 A5/4 G5/8 E5/8 | D5/4. E5/8 C5/2 |',
  },
  keys: {
    role: 'chords',
    bars: '| v=92 C4/8 E4/8 G4/8 C5/8 v=70 E5/8 C5/8 G4/8 E4/8 | v=100 [C4 E4 G4]/2 [F4 A4 C5]/2 |',
  },
  pads: { role: 'pad', bars: '| v=90 [C4 E4 G4]/1 | [A3 C4 E4]/1 |' },
  basses: { role: 'bass', bars: '| v=100 C2/4. C2/8 G2/4 C3/4 | F2/4. F2/8 G2/2 |' },
  kits: {
    role: 'drums',
    bars: '| v=100 [k h]/8 h/8 [s h]/8 h/8 [k h]/8 [k h]/8 [s h]/8 oh/8 | [k cr]/4 tm/8 tm/8 tl/8 tl/8 s/4 |',
  },
};

function techniques(patch: Patch): string[] {
  if (patch.kind === 'drums') return ['drum kit'];
  const tags: string[] = [];
  if (patch.oscs.length > 0) tags.push('oscillators');
  if (patch.string) tags.push('plucked string');
  if (patch.fm) tags.push('FM');
  if (patch.filter) tags.push(`${patch.filter.type} filter`);
  if (patch.drive) tags.push('drive');
  return tags;
}

function usesOf(patch: Patch): StyleUse[] {
  const uses: StyleUse[] = [];
  for (const style of STYLES) {
    const def = STYLE_DEFS[style];
    for (const [local, candidate] of Object.entries(def.patches)) {
      if (candidate !== patch) continue;
      const roles = (Object.entries(def.roles) as [Role, string][])
        .filter(([, name]) => name === local)
        .map(([role]) => role);
      uses.push({ style, local, roles });
    }
  }
  return uses;
}

/** Every bank instrument, family by family, in bank order. */
export function auditions(): Audition[] {
  const list: Audition[] = [];
  for (const [family, patches] of Object.entries(FAMILIES) as [Family, Record<string, Patch>][]) {
    for (const [id, patch] of Object.entries(patches)) {
      list.push({ id, name: patch.name, family, techniques: techniques(patch), uses: usesOf(patch) });
    }
  }
  return list;
}

/** The style an instrument is heard in by default: the first style that plays it in a role, else
 * the first that lists it, else Synthwave. */
export function defaultStyle(audition: Audition): StyleId {
  return (audition.uses.find((use) => use.roles.length > 0) ?? audition.uses[0])?.style ?? 'synthwave';
}

/** A one-track song that plays the instrument's audition phrase twice, in the given style. */
export function auditionSongText(audition: Audition, style: StyleId): string {
  const phrase = PHRASES[audition.family];
  return [
    `title: ${audition.name}`,
    'composer: Drumline Radio',
    'year: 2026',
    'source: original',
    'category: originals',
    'hidden: true',
    `style: ${style}`,
    'key: C major',
    'tempo: 100',
    'time: 4/4',
    '',
    `track audition role=${phrase.role} inst=bank:${audition.id}`,
    phrase.bars,
    phrase.bars,
    '',
  ].join('\n');
}
