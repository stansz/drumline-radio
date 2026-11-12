// A worked example of arrangeForm(): a short original with verse, chorus, and a bridge breakdown,
// building up to a final chorus a step higher. It is a demo, not a song in the app.
//   node tools/arranger/examples/form-demo.mjs [outDir]
//   CHECK_DIR=tmp/demo npm run check:songs
import { arrangeForm } from '../arranger.mjs';
import { outDir } from '../lib.mjs';

const out = outDir('tmp/demo');

arrangeForm(out, {
  file: 'form-demo.song',
  head: `# Form demo: verse, chorus, a bridge breakdown, and a last chorus up a step.
title: Form Demo
composer: Claude & SZ
year: 2026
source: original
category: originals
key: A minor`,
  style: 'synthwave', time: [4, 4], tempo: 112,
  bass: 'octave8', drums: 'gated',
  harm: 'counter', arp: 'up', pad: 'hold',
  sections: {
    verse: {
      melody: ['A4/4 C5/4 E5/4 D5/4', 'C5/2 A4/2', 'G4/4 C5/4 E5/4 G5/4', 'D5/1'],
      chords: ['Am', 'F', 'C', 'G'],
    },
    chorus: {
      melody: ['A5/4 G5/4 F5/2', 'G5/4 F5/4 D5/2', 'E5/4 C5/4 A4/2', 'E5/1'],
      chords: ['F', 'G', 'Am', 'Am'],
    },
    bridge: {
      melody: ['F5/2 D5/2', 'E5/2 B4/2', 'C5/2 A4/2', 'B4/1'],
      chords: ['Dm', 'Em', 'F', 'G'],
    },
  },
  intro: { type: 'pad', section: 'verse', bars: 2 },
  form: [
    { section: 'verse', level: 1 },
    { section: 'chorus', level: 2 },
    { section: 'verse', level: 1 },
    { section: 'chorus', level: 3 },
    { section: 'bridge', name: 'Bridge (breakdown)', level: 0, dyn: 'build' },
    { section: 'chorus', name: 'Last chorus, up a step', level: 3, shift: 2 },
  ],
  finalChord: 'Am',
  ramp: [112, 96],
});
console.log(`wrote ${out}/form-demo.song`);
