import type { Role, StyleId } from '../music/roles';
import type { Track } from '../music/song';
import type { Patch } from './patches';
import { INSTRUMENTS } from './instruments';

export type { Wave, Osc, SynthPatch, DrumKit, Patch } from './patches';

export interface StyleDef {
  id: StyleId;
  name: string;
  blurb: string;
  roles: Record<Role, string>;
  patches: Record<string, Patch>;
  fx: {
    reverbSeconds: number;
    reverbSend: number;
    delayBeats: number;
    delaySend: number;
    delayFeedback: number;
    crush: number;
    lowpassHz: number;
    crackle: number;
  };
  lanes: string[];
}

/** A style as written: its instruments as local name -> bank id, everything else as in StyleDef. */
interface StyleRecipe extends Omit<StyleDef, 'patches'> {
  instruments: Record<string, string>;
}

function buildStyle(recipe: StyleRecipe): StyleDef {
  const { instruments, ...rest } = recipe;
  const patches: Record<string, Patch> = {};
  for (const [local, id] of Object.entries(instruments)) {
    const patch = INSTRUMENTS[id];
    if (!patch) throw new Error(`style '${recipe.id}' uses unknown instrument '${id}'`);
    patches[local] = patch;
  }
  return { ...rest, patches };
}

const RECIPES: StyleRecipe[] = [
  {
    id: 'synthwave',
    name: 'Synthwave',
    blurb: 'Detuned saws, warm pads, and big gated drums under a neon sky.',
    roles: {
      lead: 'saw-lead',
      lead2: 'square-lead',
      counter: 'square-lead',
      pad: 'warm-pad',
      chords: 'poly-stab',
      bass: 'synth-bass',
      arp: 'pluck',
      drums: 'gated-kit',
    },
    instruments: {
      'saw-lead': 'saw-lead',
      'square-lead': 'square-lead',
      'warm-pad': 'warm-pad',
      'poly-stab': 'poly-stab',
      'synth-bass': 'synth-bass',
      'sub-bass': 'sub-bass',
      pluck: 'pluck',
      'gated-kit': 'gated-kit',
    },
    fx: {
      reverbSeconds: 2.8,
      reverbSend: 0.3,
      delayBeats: 0.75,
      delaySend: 0.2,
      delayFeedback: 0.35,
      crush: 0,
      lowpassHz: 18000,
      crackle: 0,
    },
    lanes: ['#ff4fa3', '#2de2e6', '#ffb347', '#b967ff', '#f9f871', '#ff6b6b'],
  },

  {
    id: 'chiptune',
    name: 'Chiptune',
    blurb: 'Pulse-wave leads, a triangle bass, and crunchy noise drums.',
    roles: {
      lead: 'pulse-lead',
      lead2: 'square-lead',
      counter: 'square-lead',
      pad: 'square-pad',
      chords: 'pulse-chords',
      bass: 'triangle-bass',
      arp: 'pulse-arp',
      drums: 'chip-kit',
    },
    instruments: {
      'pulse-lead': 'pulse-lead',
      'square-lead': 'chip-square',
      'square-pad': 'square-pad',
      'pulse-chords': 'pulse-chords',
      'triangle-bass': 'triangle-bass',
      'pulse-arp': 'pulse-arp',
      'chip-kit': 'chip-kit',
    },
    fx: {
      reverbSeconds: 0.8,
      reverbSend: 0.08,
      delayBeats: 0.5,
      delaySend: 0.12,
      delayFeedback: 0.25,
      crush: 0.2,
      lowpassHz: 12000,
      crackle: 0,
    },
    lanes: ['#7cff4f', '#4fd1ff', '#ffd84f', '#ff6f91', '#c792ff', '#ffffff'],
  },

  {
    id: 'orchestral',
    name: 'Orchestral',
    blurb: 'Strings, brass, woodwinds, harp, and timpani in a large hall.',
    roles: {
      lead: 'strings',
      lead2: 'brass',
      counter: 'woodwind',
      pad: 'string-pad',
      chords: 'harp',
      bass: 'low-strings',
      arp: 'bells',
      drums: 'orchestra-kit',
    },
    instruments: {
      strings: 'strings',
      brass: 'brass',
      woodwind: 'woodwind',
      'string-pad': 'string-pad',
      harp: 'harp',
      'low-strings': 'low-strings',
      bells: 'bells',
      'orchestra-kit': 'orchestra-kit',
    },
    fx: {
      reverbSeconds: 3.5,
      reverbSend: 0.45,
      delayBeats: 0.75,
      delaySend: 0,
      delayFeedback: 0.2,
      crush: 0,
      lowpassHz: 14000,
      crackle: 0,
    },
    lanes: ['#e8c27a', '#c97b4a', '#8fb8a8', '#d9d2c3', '#a77fb0', '#7f9fd1'],
  },

  {
    id: 'techno',
    name: 'Techno',
    blurb: 'Squelchy acid lines, dark pads, and a pounding four-on-the-floor kit.',
    roles: {
      lead: 'acid',
      lead2: 'square-stab',
      counter: 'fm-pluck',
      pad: 'dark-pad',
      chords: 'stab',
      bass: 'sub-bass',
      arp: 'acid-arp',
      drums: '909-kit',
    },
    instruments: {
      acid: 'acid',
      'square-stab': 'square-stab',
      'fm-pluck': 'fm-pluck',
      'dark-pad': 'dark-pad',
      stab: 'stab',
      'sub-bass': 'techno-sub',
      'acid-arp': 'acid-arp',
      '909-kit': '909-kit',
    },
    fx: {
      reverbSeconds: 1.6,
      reverbSend: 0.15,
      delayBeats: 0.75,
      delaySend: 0.18,
      delayFeedback: 0.4,
      crush: 0,
      lowpassHz: 20000,
      crackle: 0,
    },
    lanes: ['#c6ff00', '#ff2a2a', '#00e5ff', '#ff9100', '#f5f5f5', '#d500f9'],
  },

  {
    id: 'lofi',
    name: 'Lo-fi',
    blurb: 'Mellow keys, a dusty swung kit, tape wobble, and vinyl crackle.',
    roles: { lead: 'soft-lead', lead2: 'tine-keys', counter: 'soft-flute', pad: 'tape-pad', chords: 'tine-keys', bass: 'round-bass', arp: 'muted-pluck', drums: 'dusty-kit' },
    instruments: {
      'soft-lead': 'soft-lead',
      'tine-keys': 'tine-keys',
      'soft-flute': 'soft-flute',
      'radio-lead': 'radio-lead',
      'tape-pad': 'tape-pad',
      'round-bass': 'round-bass',
      'muted-pluck': 'muted-pluck',
      'dusty-sample': 'dusty-sample',
      'upright-bass': 'upright-bass',
      'dusty-kit': 'dusty-kit',
    },
    fx: { reverbSeconds: 2.2, reverbSend: 0.25, delayBeats: 0.75, delaySend: 0.15, delayFeedback: 0.3, crush: 0.08, lowpassHz: 4200, crackle: 0.045 },
    lanes: ['#ffb37a', '#7fd1c7', '#e8a0bf', '#c3b1e1', '#f6d186', '#9ad0ec'],
  },

  {
    id: 'cinematic',
    name: 'Cinematic',
    blurb: 'Grand piano, a soaring overdriven guitar, strings, and a big hall.',
    roles: { lead: 'guitar', lead2: 'grand-piano', counter: 'cello', pad: 'strings', chords: 'grand-piano', bass: 'warm-bass', arp: 'analog-synth', drums: 'studio-kit' },
    instruments: {
      guitar: 'guitar',
      'grand-piano': 'grand-piano',
      cello: 'cello',
      strings: 'string-section',
      'warm-bass': 'warm-bass',
      'analog-synth': 'analog-synth',
      'synth-pad': 'synth-pad',
      'studio-kit': 'studio-kit',
    },
    fx: { reverbSeconds: 3.2, reverbSend: 0.35, delayBeats: 0.75, delaySend: 0.22, delayFeedback: 0.38, crush: 0, lowpassHz: 15000, crackle: 0 },
    lanes: ['#f2b55a', '#9ec3ff', '#e86a5c', '#c9d6df', '#8f7ad8', '#6fd3b5'],
  },
];

export const STYLE_DEFS = Object.fromEntries(RECIPES.map((r) => [r.id, buildStyle(r)])) as Record<StyleId, StyleDef>;

export const BANK_PREFIX = 'bank:';

/** The bank id when a track names `inst=bank:<id>` and the bank has it, else null. */
export function bankId(inst: string | null): string | null {
  if (inst === null || !inst.startsWith(BANK_PREFIX)) return null;
  const id = inst.slice(BANK_PREFIX.length);
  return Object.prototype.hasOwnProperty.call(INSTRUMENTS, id) ? id : null;
}

export function patchKey(style: StyleDef, track: Pick<Track, 'role' | 'inst'>): string {
  if (bankId(track.inst) !== null) return track.inst as string;
  if (track.inst !== null && Object.prototype.hasOwnProperty.call(style.patches, track.inst)) {
    return track.inst;
  }
  return style.roles[track.role];
}

export function resolvePatch(style: StyleDef, track: Pick<Track, 'role' | 'inst'>): Patch {
  const id = bankId(track.inst);
  if (id !== null) return INSTRUMENTS[id];
  return style.patches[patchKey(style, track)];
}
