// Originals built with arrangeForm(). Writes .song files to <outDir> (default: src/songs).
//   node tools/arranger/originals.mjs [outDir] [song-id ...]
// Midnight Arcade, Night Shift, and Save Point are hand-written; Ivory and Ash has its own script.
import { mkdirSync } from 'node:fs';
import { arrangeForm } from './arranger.mjs';

const [out = 'src/songs', ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
let written = 0;
const F = (spec) => {
  if (only.length && !only.includes(spec.file.replace(/\.song$/, ''))) return;
  arrangeForm(out, spec);
  written += 1;
};

// Last Stop replaced the hand-written Late Bus Home. Lo-fi kept calm: Rhodes stabs instead of a
// pad wash, slow quarter-note plucks, a minor-iv bridge with only keys and melody, and the flute
// counter-line saved for the one big chorus.
F({
  file: 'last-stop.song',
  head: `# Last Stop, by Claude and SZ. Slow lo-fi, arranged with arrangeForm(): verse, hook, a keys-only bridge, and a hook that fades out.
title: Last Stop
composer: Claude & SZ
year: 2026
source: original
category: originals
key: F major`,
  style: 'lofi', time: [4, 4], tempo: 72,
  bass: 'lofi', drums: 'lofi',
  harm: 'counter', arp: 'broken', arpUnit: 960, pad: 'stabs', voices: 4,
  parts: { pad: 'chords' },
  sections: {
    verse: {
      melody: [
        'r/4 D5/8 C5/8 A4/2', 'r/8 G4/8 A4/4 C5/2', 'Bb4/4. A4/8 G4/4 F4/4', 'G4/4 E4/4 r/2',
        'r/4 F5/8 D5/8 C5/2', 'r/8 E5/8 D5/4 C5/2', 'Bb4/4 A4/4 G4/4 Bb4/4', 'A4/2 r/2',
      ],
      chords: ['Bbmaj7', 'Am7', 'Gm7', 'C7', 'Bbmaj7', 'Am7', 'Gm7 C7', 'Fmaj7'],
    },
    hook: {
      melody: [
        'r/8 F5/8 E5/8 D5/8 C5/2', 'r/8 F5/8 E5/8 D5/8 Bb4/2', 'r/8 E5/8 D5/8 C5/8 Bb4/4 G4/4', 'A4/2 r/2',
        'r/8 F5/8 E5/8 D5/8 C5/2', 'r/8 G5/8 F5/8 D5/8 F5/2', 'D5/4 C5/4 Bb4/4 G4/4', 'A4/1',
      ],
      chords: ['Dm7', 'Gm7', 'C7', 'Fmaj7', 'Dm7', 'Gm7', 'Bbmaj7 C7', 'Fmaj7'],
    },
    bridge: {
      melody: ['F5/2 D5/2', 'Db5/2 F4/2', 'E5/2 C5/2', 'D5/2 Bb4/2'],
      chords: ['Bbmaj7', 'Bbm7', 'Am7', 'Gm7 C7'],
    },
  },
  intro: { type: 'pad', section: 'verse', bars: 2 },
  form: [
    { section: 'verse', level: 1 },
    { section: 'hook', level: 2 },
    { section: 'verse', name: 'Verse 2', level: 1 },
    { section: 'bridge', name: 'Bridge (keys only)', level: 0, dyn: 'build' },
    { section: 'hook', name: 'Big hook', level: 3 },
    { section: 'hook', name: 'Last hook, fading', level: 2, dyn: 'drop', last: 'F4/1' },
  ],
  finalChord: 'Fmaj7',
  ramp: [72, 60],
});

console.log(`wrote ${written} song(s) to ${out}`);
