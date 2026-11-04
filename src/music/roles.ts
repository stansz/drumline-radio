export const STYLES = ['synthwave', 'chiptune', 'orchestral', 'techno', 'lofi', 'cinematic'] as const;
export type StyleId = (typeof STYLES)[number];

export const ROLES = ['lead', 'lead2', 'counter', 'pad', 'chords', 'bass', 'arp', 'drums'] as const;
export type Role = (typeof ROLES)[number];
export type PitchedRole = Exclude<Role, 'drums'>;

/** Inclusive MIDI note range allowed for each pitched role. */
export const ROLE_RANGES: Record<PitchedRole, readonly [number, number]> = {
  lead: [48, 96], lead2: [48, 96], counter: [41, 91], pad: [36, 84],
  chords: [36, 84], bass: [24, 60], arp: [36, 96],
};

/** Drum names used in `drums` tracks, mapped to General MIDI percussion numbers. */
export const DRUMS: Record<string, number> = {
  k: 36, rim: 37, s: 38, cl: 39, tl: 41, h: 42, tm: 45, oh: 46, cr: 49, th: 50, rd: 51,
};

export function isStyle(s: string): s is StyleId {
  return (STYLES as readonly string[]).includes(s);
}

export function isRole(s: string): s is Role {
  return (ROLES as readonly string[]).includes(s);
}
