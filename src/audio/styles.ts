import type { Role, StyleId } from '../music/roles';
import type { Song, Track } from '../music/song';
import type { Patch } from './patches';
import { INSTRUMENTS } from './instruments';

export type { Wave, Osc, SynthPatch, DrumKit, Patch } from './patches';

export interface StyleDef {
  id: StyleId;
  name: string;
  blurb: string;
  roles: Record<Role, string>;
  patches: Record<string, Patch>;
  /** Bank instruments this style plays as one of its own patches instead (bank id -> patch). */
  bankSwaps: Record<string, Patch>;
  fx: {
    reverbSeconds: number;
    reverbSend: number;
    delayBeats: number;
    delaySend: number;
    delayFeedback: number;
    crush: number;
    lowpassHz: number;
    crackle: number;
    /** A soft, slowly breathing noise bed under the music, like air or distant rain. */
    air: number;
  };
  lanes: string[];
}

/** A style as written: its instruments as local name -> bank id, everything else as in StyleDef. */
interface StyleRecipe extends Omit<StyleDef, 'patches' | 'bankSwaps'> {
  instruments: Record<string, string>;
  /** Bank id -> one of this style's local names, and a gain that matches its level to the bank's. */
  bankSwaps?: Record<string, { patch: string; gain: number }>;
}

function buildStyle(recipe: StyleRecipe): StyleDef {
  const { instruments, bankSwaps = {}, ...rest } = recipe;
  const patches: Record<string, Patch> = {};
  for (const [local, id] of Object.entries(instruments)) {
    const patch = INSTRUMENTS[id];
    if (!patch) throw new Error(`style '${recipe.id}' uses unknown instrument '${id}'`);
    patches[local] = patch;
  }
  const swaps: Record<string, Patch> = {};
  for (const [id, { patch: local, gain }] of Object.entries(bankSwaps)) {
    const patch = patches[local];
    if (!patch) throw new Error(`style '${recipe.id}' swaps to unknown patch '${local}'`);
    swaps[id] = { ...patch, gain: patch.gain * gain };
  }
  return { ...rest, patches, bankSwaps: swaps };
}

/** Removed bank patches and the patch each one's name now plays. */
const REPLACED: Record<string, string> = {
  brass: 'fm-brass',
  harp: 'concert-harp',
  bells: 'glockenspiel',
  'tine-keys': 'fm-rhodes',
  'upright-bass': 'string-bass',
  'indie-lead': 'shimmer-guitar',
  'soft-flute': 'woodwind',
};

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
      air: 0,
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
      air: 0,
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
      brass: 'fm-brass',
      woodwind: 'concert-flute',
      oboe: 'oboe',
      'string-pad': 'string-pad',
      harp: 'concert-harp',
      'low-strings': 'low-strings',
      bells: 'glockenspiel',
      'tubular-bells': 'fm-bells',
      pizzicato: 'pizzicato',
      'orchestra-kit': 'orchestra-kit',
    },
    // A wordless vocal hook plays on the strings here.
    bankSwaps: { 'vox-lead': { patch: 'strings', gain: 1.8 } },
    fx: {
      reverbSeconds: 3.5,
      reverbSend: 0.45,
      delayBeats: 0.75,
      delaySend: 0,
      delayFeedback: 0.2,
      crush: 0,
      lowpassHz: 14000,
      crackle: 0,
      air: 0,
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
      air: 0,
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
      'tine-keys': 'fm-rhodes',
      'soft-flute': 'woodwind',
      'radio-lead': 'radio-lead',
      'tape-pad': 'tape-pad',
      'round-bass': 'round-bass',
      'muted-pluck': 'muted-pluck',
      'dusty-sample': 'dusty-sample',
      'upright-bass': 'string-bass',
      'dusty-kit': 'dusty-kit',
    },
    fx: { reverbSeconds: 2.2, reverbSend: 0.25, delayBeats: 0.75, delaySend: 0.15, delayFeedback: 0.3, crush: 0.08, lowpassHz: 4200, crackle: 0.045, air: 0 },
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
    // A wordless vocal hook plays on the soaring guitar here.
    bankSwaps: { 'vox-lead': { patch: 'guitar', gain: 0.35 } },
    fx: { reverbSeconds: 3.2, reverbSend: 0.35, delayBeats: 0.75, delaySend: 0.22, delayFeedback: 0.38, crush: 0, lowpassHz: 15000, crackle: 0, air: 0 },
    lanes: ['#f2b55a', '#9ec3ff', '#e86a5c', '#c9d6df', '#8f7ad8', '#6fd3b5'],
  },
  {
    id: 'altrock',
    name: 'Alt rock',
    blurb: 'Fuzzy power chords, a jangly clean guitar, a driving bass, and a punchy room kit.',
    roles: { lead: 'fuzz-lead', lead2: 'clean-guitar', counter: 'clean-guitar', pad: 'guitar-wall', chords: 'power-chords', bass: 'pick-bass', arp: 'clean-guitar', drums: 'rock-kit' },
    instruments: {
      'fuzz-lead': 'fuzz-lead',
      'clean-guitar': 'clean-guitar',
      'guitar-wall': 'guitar-wall',
      'power-chords': 'power-chords',
      'pick-bass': 'pick-bass',
      'rock-kit': 'rock-kit',
      'indie-lead': 'shimmer-guitar',
      'shimmer-guitar': 'shimmer-guitar',
      'acoustic-guitar': 'acoustic-guitar',
      'plugged-acoustic': 'plugged-acoustic',
      'clean-electric': 'clean-electric',
      'crunch-guitar': 'crunch-guitar',
    },
    // A wordless vocal hook plays on the fuzz lead here.
    bankSwaps: { 'vox-lead': { patch: 'fuzz-lead', gain: 0.35 } },
    fx: { reverbSeconds: 1.4, reverbSend: 0.18, delayBeats: 0.75, delaySend: 0.08, delayFeedback: 0.25, crush: 0, lowpassHz: 16000, crackle: 0, air: 0 },
    lanes: ['#ff4136', '#ffd23f', '#3fa7ff', '#f4e9d8', '#7ee081', '#ff8fc7'],
  },
  {
    id: 'ambient',
    name: 'Ambient',
    blurb: 'A washed pad, a music box, and a soft sub, drifting in a long dark reverb over a bed of air.',
    roles: { lead: 'music-box', lead2: 'fm-rhodes', counter: 'concert-flute', pad: 'ambient-pad', chords: 'synth-pad', bass: 'ambient-sub', arp: 'music-box', drums: 'dusty-kit' },
    instruments: {
      'music-box': 'music-box',
      'fm-rhodes': 'fm-rhodes',
      'concert-flute': 'concert-flute',
      'ambient-pad': 'ambient-pad',
      'synth-pad': 'synth-pad',
      'ambient-sub': 'ambient-sub',
      'dusty-kit': 'dusty-kit',
      'grand-piano': 'grand-piano',
      'fm-bells': 'fm-bells',
      'choir-ooh': 'choir-ooh',
    },
    fx: { reverbSeconds: 5, reverbSend: 0.5, delayBeats: 1.5, delaySend: 0.22, delayFeedback: 0.45, crush: 0, lowpassHz: 9000, crackle: 0, air: 0.1 },
    lanes: ['#9fd8cb', '#c9b8f0', '#f2d7a0', '#7fa8c9', '#e6e1d6', '#a8c99f'],
  },
  // The open style: every bank instrument under its bank id, through clean, neutral effects, so a
  // song written for it can pick any instrument with plain `inst=`. Remixes still fall back to the
  // other styles' own patches.
  {
    id: 'studio',
    name: 'Studio',
    blurb: 'Every instrument in the bank, through a clean, neutral mix.',
    roles: { lead: 'saw-lead', lead2: 'grand-piano', counter: 'woodwind', pad: 'warm-pad', chords: 'grand-piano', bass: 'warm-bass', arp: 'pluck', drums: 'studio-kit' },
    // Every bank instrument under its own id, plus the names of patches that were replaced, so an old
    // inst= name still plays: it now reaches the replacement.
    instruments: {
      ...Object.fromEntries(Object.keys(INSTRUMENTS).map((id) => [id, id])),
      ...REPLACED,
    },
    fx: { reverbSeconds: 2, reverbSend: 0.2, delayBeats: 0.75, delaySend: 0.12, delayFeedback: 0.3, crush: 0, lowpassHz: 20000, crackle: 0, air: 0 },
    lanes: ['#5ee0c1', '#f4f4f0', '#ff8a5c', '#8fb3ff', '#ffd166', '#c79bff'],
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

/**
 * The song with every plain `inst=<id>` that its home style lacks but the bank has turned into
 * `inst=bank:<id>`, so `inst=vox-lead` plays the vox lead in any song instead of the role's default.
 * Names the home style has are left alone, so remixes still swap them for the other style's patches.
 */
export function withBankInstruments(song: Song): Song {
  const home = STYLE_DEFS[song.meta.style];
  let changed = false;
  const tracks = song.tracks.map((track) => {
    const inst = track.inst;
    if (inst === null || inst.startsWith(BANK_PREFIX)) return track;
    if (Object.prototype.hasOwnProperty.call(home.patches, inst)) return track;
    if (!Object.prototype.hasOwnProperty.call(INSTRUMENTS, inst)) return track;
    changed = true;
    return { ...track, inst: BANK_PREFIX + inst };
  });
  return changed ? { ...song, tracks } : song;
}

/** A track's volume in a style: its `vol.<style>=` when it sets one, else its `vol=`. */
export function trackVolume(track: Pick<Track, 'vol' | 'styleVol'>, style: StyleId): number {
  return track.styleVol?.[style] ?? track.vol;
}

/** The track volume at a 1-based bar, after any `vol@N=` steps. */
export function trackVolumeAt(
  track: Pick<Track, 'vol' | 'styleVol' | 'volumeSteps'>,
  style: StyleId,
  bar: number,
): number {
  let volume = trackVolume(track, style);
  for (const step of track.volumeSteps ?? []) {
    if (step.bar > bar) break;
    volume = step.volume;
  }
  return volume;
}

type PatchTrack = Pick<Track, 'role' | 'inst' | 'styleInst'>;

/**
 * The instrument a track asks for in a style: its `inst.<style>=` when it sets one (a name the style
 * lacks but the bank has plays the bank instrument), else its `inst=`.
 */
function instIn(style: StyleDef, track: PatchTrack): string | null {
  const own = track.styleInst?.[style.id];
  if (own === undefined) return track.inst;
  if (own.startsWith(BANK_PREFIX) || Object.prototype.hasOwnProperty.call(style.patches, own)) return own;
  return Object.prototype.hasOwnProperty.call(INSTRUMENTS, own) ? BANK_PREFIX + own : own;
}

export function patchKey(style: StyleDef, track: PatchTrack): string {
  const inst = instIn(style, track);
  if (bankId(inst) !== null) return inst as string;
  if (inst !== null && Object.prototype.hasOwnProperty.call(style.patches, inst)) {
    return inst;
  }
  return style.roles[track.role];
}

export function resolvePatch(style: StyleDef, track: PatchTrack): Patch {
  const id = bankId(instIn(style, track));
  if (id !== null) return style.bankSwaps[id] ?? INSTRUMENTS[id];
  return style.patches[patchKey(style, track)];
}
