// Exit Sign, by GPT-6.1-sol & SZ. An original guitar-band song for Alt rock.
// The melodies are composed bar by bar here, not borrowed or randomly generated. Shared choruses
// come from one score; the chord map supplies every accompaniment's pitches.
//   node tools/arranger/exit-sign.mjs [outDir]
import { outDir, repeatBars, saveSong, sectionBuilder } from './lib.mjs';

const out = outDir();

// Each section's harmony has a single source. A twelve-bar chorus has an answering middle phrase
// and a closing Em-C-D-G turnaround, rather than running the same four chords throughout.
const PROGRESSIONS = {
  intro: ['G', 'C', 'D', 'G'],
  verse: repeatBars(['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D'], 2),
  pre: ['Am', 'C', 'Em', 'D', 'Am', 'C', 'D', 'D'],
  chorus: ['G', 'C', 'Em', 'D', 'G', 'Am', 'C', 'D', 'Em', 'C', 'D', 'G'],
  bridge: ['C', 'C', 'Am', 'Am', 'Em', 'Em', 'D', 'D'],
  outro: ['G', 'C', 'D', 'G'],
};

// Power dyads stay below the melody; held rhythm guitars supply the thirds. Clean guitar occupies
// its own upper-middle register. The bass's octave-down oscillator remains audible even on C2.
const VOICINGS = {
  G: { power: '[G3 D4]', wall: '[G3 B3 D4]', clean: ['G4', 'B4', 'D5'], root: 'G2', fifth: 'D3' },
  C: { power: '[C3 G3]', wall: '[G3 C4 E4]', clean: ['G4', 'C5', 'E5'], root: 'C2', fifth: 'G2' },
  D: { power: '[D3 A3]', wall: '[A3 D4 F#4]', clean: ['F#4', 'A4', 'D5'], root: 'D2', fifth: 'A2' },
  Em: { power: '[E3 B3]', wall: '[G3 B3 E4]', clean: ['G4', 'B4', 'E5'], root: 'E2', fifth: 'B2' },
  Am: { power: '[A3 E4]', wall: '[A3 C4 E4]', clean: ['A4', 'C5', 'E5'], root: 'A2', fifth: 'E3' },
};

const MELODY = {
  intro: [
    'R',
    'R',
    'r/2 A4/4 F#4/4',
    'B4/8 B4/8 D5/4 G4/4 r/4',
  ],
  verse: [
    'r/8 E4/8 G4/4 E4/4 r/4',
    'r/4 E4/4 G4/4 r/4',
    'r/8 G4/8 B4/4 G4/4 r/4',
    'F#4/2 r/2',
    'r/4 G4/8 G4/8 E4/4 r/4',
    'E4/4 G4/4 r/2',
    'r/8 E4/8 A4/4 E4/4 r/4',
    'D4/2 r/2',
    'r/8 E4/8 G4/8 G4/8 B4/4 r/4',
    'G4/4 E4/4 r/2',
    'r/4 B4/8 B4/8 G4/4 r/4',
    'A4/4 F#4/4 r/2',
    'G4/4 E4/8 G4/8 B4/4 r/4',
    'r/8 G4/8 E4/4 G4/4 r/4',
    'A4/4 E4/4 C5/4 r/4',
    'F#4/2 r/2',
  ],
  verse2: [
    'r/4 E4/8 G4/8 B4/4 r/4',
    'G4/4 E4/8 E4/8 r/2',
    'r/8 B4/8 G4/4 D4/4 r/4',
    'A4/4 F#4/4 r/2',
    'r/8 G4/8 G4/4 B4/4 r/4',
    'G4/4 E4/4 r/2',
    'r/4 A4/8 C5/8 A4/4 r/4',
    'F#4/2 r/2',
    'E4/4 G4/8 B4/8 G4/4 r/4',
    'r/4 G4/4 E4/4 r/4',
    'r/8 B4/8 D5/4 B4/4 r/4',
    'A4/4 F#4/4 r/2',
    'r/8 G4/8 B4/4 G4/4 r/4',
    'E4/4 G4/4 r/2',
    'C5/4 A4/4 E4/4 r/4',
    'A4/2 r/2',
  ],
  pre: [
    'A4/4 A4/8 C5/8 E5/4 C5/4',
    'G4/4 G4/8 E4/8 G4/2',
    'B4/4 B4/8 G4/8 B4/2',
    'A4/2 F#4/4 r/4',
    'C5/4 A4/4 C5/4 E5/4',
    'E5/4 C5/4 G4/2',
    'A4/4 A4/8 F#4/8 A4/4 D5/4',
    'A4/2 r/2',
  ],
  chorus: [
    // Two short syllables, an upward third, then a fall home: the song's central hook.
    'r/8 B4/8 B4/8 D5/8 B4/4 G4/4',
    'E5/4 E5/8 C5/8 G4/4 C5/4',
    'B4/4 B4/8 G4/8 E4/4 G4/4',
    'A4/2 F#4/4 r/4',
    'B4/8 B4/8 D5/4 D5/4 B4/4',
    'C5/4 C5/8 A4/8 E4/4 A4/4',
    'G4/4 G4/8 E4/8 G4/4 C5/4',
    'A4/2 F#4/4 A4/4',
    'B4/8 B4/8 E5/4 B4/4 G4/4',
    'G4/4 E4/4 G4/4 C5/4',
    'D5/4 A4/4 F#4/4 A4/4',
    'B4/4 G4/2 r/4',
  ],
  bridge: [
    'G4/2 E4/4 r/4',
    'E4/2 C5/4 r/4',
    'C5/2 A4/4 r/4',
    'E4/2 r/2',
    'G4/2 E4/2~',
    'E4/2 B4/4 r/4',
    'F#4/2 A4/4 r/4',
    'D5/2 r/2',
  ],
  outro: [
    'r/8 B4/8 B4/8 D5/8 G4/2',
    'G4/4 E4/2 r/4',
    'A4/4 F#4/4 D4/2',
    'G4/1',
  ],
};

// Kick and snare are separate from cymbals, so the hats can stay quieter than the backbeat.
// The bass accents these kick positions exactly; only the snare sits 12 ticks behind the grid.
const KICKS = {
  verseA: [0, 5],
  verseB: [0, 3, 4],
  chorusA: [0, 3, 4, 5],
  chorusB: [0, 1, 4, 5, 7],
};
const DRUMS = {
  verseA: 'k/8:96 r/8 s/8+12:102 r/8 r/8 k/8:88 s/8+12:106 r/8',
  verseB: 'k/8:96 r/8 s/8+12:102 k/8:84 k/8:90 r/8 s/8+12:106 r/8',
  verseFill: 'k/8:94 r/8 s/8+12:100 r/8 k/8:88 r/8 s/16+12:98 s/16+12:72 r/8',
  chorusA: 'k/8:114 r/8 s/8+12:118 k/8:94 k/8:110 k/8:96 s/8+12:120 r/8',
  chorusB: 'k/8:114 k/8:94 s/8+12:118 r/8 k/8:110 k/8:96 s/8+12:120 k/8:96',
  turnaround: 'k/8:108 r/8 s/8+12:116 k/8:92 k/4:104 tm/8:102 tl/8:110',
  fill: 'k/4:108 s/8+12:112 s/8+12:100 th/8:100 tm/8:106 tl/16:110 tl/16:116 s/8+12:120',
  half: 'k/4:88 r/4 s/4+18:101 k/8:76 r/8',
  bridgeFill: 'k/4:98 r/4 th/8:96 tm/8:104 tl/16:108 tl/16:114 s/8+12:120',
};

const keys = ['melody', 'rhythm', 'wall', 'clean', 'bass', 'drums', 'cymbals'];
const builder = sectionBuilder(keys, {
  label: (name, start, end) => `${name} (bars ${start}-${end})`,
  exact: true,
});
const { tracks, block } = builder;
const form = [];
const velocity = (value, bar) => bar === 'R' ? bar : `v=${value} ${bar}`;

function chugs(chord, level, pattern = 'verseA') {
  const power = VOICINGS[chord].power;
  const muted = pattern.startsWith('verse');
  const rests = pattern === 'verseA' ? [2, 6] : pattern === 'verseB' ? [2, 5] : [];
  return Array.from({ length: 8 }, (_, step) => {
    if (rests.includes(step)) return 'r/8';
    const accent = step === 0 || step === 4 ? 6 : step % 2 ? -7 : 0;
    return `${power}/8${muted ? "'" : ''}+10:${level + accent}`;
  }).join(' ');
}

function bassLine(chord, level, pattern) {
  const { root, fifth } = VOICINGS[chord];
  return Array.from({ length: 8 }, (_, step) => {
    const kick = KICKS[pattern].includes(step);
    // Fifth-note answers never displace a root on a kick.
    const pitch = !kick && (step === 6 || step === 7) ? fifth : root;
    return `${pitch}/8:${level + (kick ? 7 : step % 2 ? -5 : 0)}`;
  }).join(' ');
}

function cleanAnswer(chord, longGap = false) {
  const [low, middle, high] = VOICINGS[chord].clean;
  return longGap
    ? `r/2 ${low}/8 ${middle}/8 ${high}/8 ${middle}/8`
    : `r/2. ${middle}/8 ${low}/8`;
}

function hats(level, ride = false, open = false, crash = false) {
  return Array.from({ length: 8 }, (_, step) => {
    const pitch = crash && step === 0 ? '[cr oh]' : open && step % 4 === 0 ? 'oh' : ride ? 'rd' : 'h';
    const accent = crash && step === 0 ? 12 : step % 2 ? -16 : 0;
    return `${pitch}/8:${level + accent}`;
  }).join(' ');
}

function section(name, progression, parts) {
  const chords = PROGRESSIONS[progression];
  const start = tracks.melody.length + 1;
  form.push([name, progression, start, start + chords.length - 1]);
  builder.section(name, chords.length, parts);
}

section('Intro: clean strings, then the band counts itself in', 'intro', {
  melody: MELODY.intro.map((bar) => velocity(86, bar)),
  clean: PROGRESSIONS.intro.map((chord, i) => {
    const [low, middle, high] = VOICINGS[chord].clean;
    return velocity(76 + i * 3, `${low}/8 ${middle}/8 ${high}/4 ${middle}/8 ${low}/8 r/4`);
  }),
  rhythm: ['R', 'R', velocity(72, '[D3 A3]/4 r/4 [D3 A3]/4 r/4'), chugs('G', 82, 'chorusA')],
  bass: ['R', 'R', 'D2/2:78 A2/2:74', bassLine('G', 86, 'verseA')],
  drums: ['R', 'R', 'k/4:82 r/4 s/4+12:94 r/4', DRUMS.verseFill],
  cymbals: ['R', 'R', hats(58), hats(64)],
});

function verse(name, second = false) {
  const chords = PROGRESSIONS.verse;
  section(name, 'verse', {
    melody: MELODY[second ? 'verse2' : 'verse'].map((bar, i) => velocity(80 + (i >= 8 ? 4 : 0) + (second ? 2 : 0), bar)),
    rhythm: chords.map((chord, i) => chugs(chord, 62 + (second ? 4 : 0), i % 2 ? 'verseB' : 'verseA')),
    clean: chords.map((chord, i) => velocity(78 + (second ? 3 : 0), cleanAnswer(chord, i % 4 === 3 || i % 8 === 5))),
    bass: chords.map((chord, i) => bassLine(chord, 75 + (second ? 4 : 0), i % 2 ? 'verseB' : 'verseA')),
    drums: chords.map((_, i) => i % 8 === 7 ? DRUMS.verseFill : DRUMS[i % 2 ? 'verseB' : 'verseA']),
    cymbals: chords.map((_, i) => hats(84 + (second ? 4 : 0), second && i >= 8)),
  });
}

function preChorus(name) {
  const chords = PROGRESSIONS.pre;
  section(name, 'pre', {
    melody: MELODY.pre.map((bar, i) => velocity(92 + i * 2, bar)),
    rhythm: chords.map((chord, i) => chugs(chord, 76 + i * 3, 'chorusA')),
    wall: chords.map((chord, i) => i < 4 ? 'R' : velocity(70 + (i - 4) * 6, `${VOICINGS[chord].wall}/1`)),
    clean: chords.map((chord, i) => i === 3 ? velocity(80, cleanAnswer(chord)) : 'R'),
    bass: chords.map((chord, i) => bassLine(chord, 82 + i * 2, i % 2 ? 'chorusB' : 'chorusA')),
    drums: chords.map((_, i) => i === 7 ? DRUMS.fill : DRUMS[i % 2 ? 'chorusB' : 'chorusA']),
    cymbals: chords.map((_, i) => i === 7 ? 'h/8:96 h/8:72 h/8:90 oh/8:96 r/2' : hats(84 + i * 2, false, i >= 4)),
  });
}

function chorus(name, final = 0) {
  const chords = PROGRESSIONS.chorus;
  const melody = [...MELODY.chorus];
  if (final === 2) melody[11] = 'B4/4 G4/2.';
  section(name, 'chorus', {
    melody: melody.map((bar, i) => velocity(112 + (i >= 8 ? 3 : 0) + final * 2, bar)),
    rhythm: chords.map((chord) => chugs(chord, 98 + final * 3, 'chorusA')),
    wall: chords.map((chord) => velocity(106 + final * 3, `${VOICINGS[chord].wall}/1`)),
    // Only the final double chorus gains clean-guitar answers, and only in phrase endings.
    clean: chords.map((chord, i) => final && i % 4 === 3 ? velocity(99 + final * 2, cleanAnswer(chord, true)) : 'R'),
    bass: chords.map((chord, i) => bassLine(chord, 98 + final * 2, i % 2 ? 'chorusB' : 'chorusA')),
    drums: chords.map((_, i) => i === 11 ? (final === 1 ? DRUMS.fill : DRUMS.turnaround) : DRUMS[i % 2 ? 'chorusB' : 'chorusA']),
    cymbals: chords.map((_, i) => hats(98 + final * 2, false, true, i % 4 === 0)),
  });
}

verse('Verse 1: palm-muted, with room between vocal phrases');
preChorus('Pre-chorus 1: eighths open up; a tom fill opens the door');
chorus('Chorus 1: the twelve-bar hook');
verse('Verse 2: a new vocal phrasing, then ride cymbal', true);
preChorus('Pre-chorus 2: rebuilding the same tension');
chorus('Chorus 2: full band, then the floor drops away');

section('Bridge: two bars without bass or drums, then a half-time backbeat', 'bridge', {
  melody: MELODY.bridge.map((bar, i) => velocity(82 + (i >= 6 ? 10 : 0), bar)),
  clean: PROGRESSIONS.bridge.map((chord, i) => {
    const [low, middle, high] = VOICINGS[chord].clean;
    return i < 4 ? velocity(84, `${low}/4 ${middle}/4 ${high}/2`) : velocity(78, cleanAnswer(chord, true));
  }),
  rhythm: PROGRESSIONS.bridge.map((chord, i) => i < 4 ? 'R' : velocity(72 + (i - 4) * 6, `${VOICINGS[chord].power}/2 r/4 ${VOICINGS[chord].power}/4`)),
  wall: PROGRESSIONS.bridge.map((chord, i) => i < 4 ? 'R' : velocity(72, `${VOICINGS[chord].wall}/1`)),
  bass: PROGRESSIONS.bridge.map((chord, i) => i < 2 ? 'R' : velocity(84, `${VOICINGS[chord].root}/2 ${VOICINGS[chord].root}/4 ${VOICINGS[chord].fifth}/8 r/8`)),
  drums: ['R', 'R', DRUMS.half, DRUMS.half, DRUMS.half, DRUMS.half, DRUMS.half, DRUMS.bridgeFill],
  cymbals: ['R', 'R', 'rd/4:62 r/4 rd/4:66 r/4', 'rd/4:62 r/4 rd/4:66 r/4',
    'rd/4:66 r/4 rd/4:70 r/4', 'rd/4:66 r/4 rd/4:70 r/4', hats(68), 'h/4:70 oh/4:82 r/2'],
});

chorus('Final chorus A: back to full time, with clean-guitar answers', 1);
chorus('Final chorus B: the hook stays put; the final tonic gets its whole beat', 2);

section('Outro: the opening syllables return, then one last band chord', 'outro', {
  melody: MELODY.outro.map((bar, i) => velocity(104 - i * 6, bar)),
  rhythm: PROGRESSIONS.outro.map((chord, i) => velocity(100 - i * 6,
    i === 3 ? `${VOICINGS[chord].power}/1` : `${VOICINGS[chord].power}/4 r/4 ${VOICINGS[chord].power}/4 r/4`)),
  wall: PROGRESSIONS.outro.map((chord, i) => velocity(102 - i * 6, `${VOICINGS[chord].wall}/1`)),
  clean: ['R', 'R', velocity(78, cleanAnswer('D', true)), 'R'],
  bass: PROGRESSIONS.outro.map((chord, i) => i < 2 ? bassLine(chord, 94 - i * 4, 'chorusA') : velocity(86 - (i - 2) * 4, `${VOICINGS[chord].root}/1`)),
  drums: [DRUMS.chorusA, DRUMS.turnaround, 'k/4:100 r/4 s/4+12:110 r/4', 'k/1:110'],
  cymbals: [hats(76, false, true, true), hats(70), 'oh/4:78 r/4 oh/4:72 r/4', 'cr/1:102'],
});

const HEADERS = {
  melody: 'track melody role=lead vol=1 pan=0',
  rhythm: 'track rhythm role=chords vol=0.72 pan=-0.45',
  wall: 'track wall role=pad vol=0.72 pan=0.4',
  clean: 'track clean role=lead2 vol=1 pan=0.25',
  bass: 'track bass role=bass vol=0.34 pan=0',
  drums: 'track drums role=drums vol=0.38 pan=0',
  cymbals: 'track cymbals role=drums vol=0.95 pan=-0.12',
};

const total = tracks.melody.length;
const chordComments = Object.entries(PROGRESSIONS).map(([name, chords]) => `# Chords ${name}: ${chords.join(' | ')}`);
const formComments = form.map(([name, progression, start, end]) => `# Form ${start}-${end}: ${progression} - ${name}`);
const text = [
  '# Exit Sign, by GPT-6.1-sol & SZ. Original Alt rock / pop punk: a vocal-style fuzz hook,',
  '# palm-muted verses, full guitar-wall choruses, and a drumless drop into a half-time bridge.',
  '# Built by tools/arranger/exit-sign.mjs from hand-composed melodies and one harmonic map.',
  '# Each chord below lasts one bar; every pitched part stays on that bar\'s chord tones.',
  ...chordComments,
  ...formComments,
  '# The snare drags 12 ticks (18 in half time); guitar chugs trail the kick by 10 ticks.',
  '# Kick-locked bass eighths and louder cymbals make the chorus lift; no fixed bank instruments.',
  'title: Exit Sign',
  'composer: GPT-6.1-sol & SZ',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: altrock',
  'key: G major',
  'tempo: 152',
  'time: 4/4',
  'about: One more chorus before the lights come up: palm-muted verses give way to a twelve-bar shout-along hook, the band drops out for a half-time bridge, and the final double chorus finds its way home.',
  '',
  Object.keys(tracks).map((id) => `${HEADERS[id]}\n${block(id)}`).join('\n\n'),
  '',
].join('\n');

saveSong(out, 'exit-sign.song', text);
console.log(`wrote ${out}/exit-sign.song (${total} bars, ${(total * 240 / 152).toFixed(2)} seconds)`);
