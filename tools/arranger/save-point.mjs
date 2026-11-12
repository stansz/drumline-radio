// Save Point: an original for the Chiptune style. The A and B themes are the song's own; this script
// adds a quiet "save room" interlude and an "adventure" section, then plays the themes again up a
// step (C to D) before the outro.
//   node tools/arranger/save-point.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { noteName, SHARPS, writeBlock } from './lib.mjs';

const [out = 'src/songs'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const nm = (n) => noteName(n, SHARPS);
const midi = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return (Number(m[2]) + 1) * 12 + PC[m[1]]; };
const up = (bar, by) => (by === 0 || bar === 'R' ? bar : bar.replace(/\b[A-G]#?\d\b/g, (n) => nm(midi(n) + by)));
const chord = (sym) => {
  const m = /^([A-G]#?)(m?)$/.exec(sym);
  return { pc: PC[m[1]], iv: m[2] ? [0, 3, 7] : [0, 4, 7] };
};

// The themes (the song's own), and the two new sections.
const A = [
  'E5/8 G5/8 C6/8 G5/8 E5/4 D5/8 C5/8', 'A4/4 C5/4 E5/4 A5/4', 'F5/8 E5/8 F5/8 A5/8 C6/4 A5/4', 'G5/4. F5/8 E5/4 D5/4',
  'E5/8 G5/8 C6/8 G5/8 E5/4 G5/4', 'A5/8 G5/8 E5/8 C5/8 A4/4 C5/4', 'F5/8 A5/8 C6/8 A5/8 G5/8 F5/8 E5/8 D5/8', 'D5/2 G5/4 r/4',
];
const A_CH = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'];
const B = [
  'C6/4. B5/8 A5/4 E5/4', 'F5/4. G5/8 A5/4 C6/4', 'G5/4. E5/8 C5/4 E5/4', 'D5/2. r/4',
  'C6/4. B5/8 A5/4 C6/4', 'A5/4. G5/8 F5/4 A5/4', 'G5/8 A5/8 B5/8 C6/8 D6/4 B5/4', 'G5/2 D5/4 B4/4',
];
const B_CH = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'G'];
const ROOM = [
  'A5/2 G5/4 F5/4', 'G5/2. D5/4', 'E5/2 G5/4 B5/4', 'A5/1',
  'C6/2 A5/4 F5/4', 'D6/2 B5/4 G5/4', 'E5/2 G5/4 C6/4', 'C6/2. r/4',
];
const ROOM_CH = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'];
const QUEST = [
  'A4/8 C5/8 E5/8 A5/4 G5/8 E5/8 C5/8', 'D5/8 E5/8 r/8 C5/8 B4/4 A4/4',
  'A4/8 C5/8 F5/8 A5/4 G5/8 F5/8 C5/8', 'E5/8 F5/8 r/8 C5/8 A4/2',
  'B4/8 D5/8 G5/8 B5/4 A5/8 G5/8 D5/8', 'F5/8 G5/8 r/8 D5/8 B4/2',
  'G5/8 E5/8 B4/8 E5/8 G5/8 B5/8 G5/8 E5/8', 'G#5/4 E5/4 B4/4 G#4/4',
];
const QUEST_CH = ['Am', 'Am', 'F', 'F', 'G', 'G', 'Em', 'E'];
// The harmony line from the first version: two half notes a bar from each chord.
const duoBar = (sym) => { const c = chord(sym); const t = c.iv.map((i) => 64 + ((c.pc + i - 4 + 12) % 12)).sort((x, y) => x - y); return `${nm(t[1])}/2 ${nm(t[0])}/2`; };

const T = {
  arp: (sym) => {
    const c = chord(sym);
    const base = 57 + ((c.pc - 9 + 12) % 12); // A3 .. G#4
    const t = [base, base + c.iv[1], base + 7, base + 12];
    return [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 1, 0, 1].map((k) => `${nm(t[k])}/16`).join(' ');
  },
  bass: (sym) => {
    const c = chord(sym);
    const r = 40 + ((c.pc - 4 + 12) % 12); // E2 .. D#3
    const f = r + 7 <= 48 ? r + 7 : r - 5;
    return `${nm(r)}/4 ${nm(f)}/4 ${nm(r)}/4 ${nm(f)}/4`;
  },
  pulse: (sym) => { const r = 40 + ((chord(sym).pc - 4 + 12) % 12); return Array(4).fill(`${nm(r)}/8 ${nm(r + 12)}/8`).join(' '); },
  hold: (sym) => `${nm(40 + ((chord(sym).pc - 4 + 12) % 12))}/1`,
};
const DR = {
  a: 'k/8 h s h k k s h', b: 'k/8 h s h k h s s', fill: 'k/8 h s h s/16 s s s s/8 s',
  half: 'k/4 h/4 s/4 h/4', quest: 'k/8 k s h k k s s', end: '[k cr]/2. r/4',
};
const crashFirst = (bars) => bars.map((b, i) => (i === 0 ? b.replace(/^k\//, '[k cr]/') : b));
const groove = (kind) => crashFirst([...Array(7).fill(DR[kind]), DR.fill]);

const keys = ['lead', 'duo', 'arp', 'bass', 'drums'];
const tracks = Object.fromEntries(keys.map((k) => [k, []]));
const marks = [];
const R = 'R';
const v = (vel, bars) => bars.map((b, i) => (b === R || b === null ? R : i === 0 || bars[i - 1] === R || bars[i - 1] === null ? `v=${vel} ${b}` : b));
function section(name, n, parts, by = 0) {
  marks.push([tracks.lead.length, name]);
  for (const key of keys) {
    const bars = parts[key] ?? [];
    for (let i = 0; i < n; i++) tracks[key].push(up(bars[i] ?? R, key === 'drums' ? 0 : by));
  }
}
const ch = (list, fn) => list.map(fn);

section('Intro', 4, {
  arp: v(70, ch(A_CH.slice(0, 4), T.arp)),
  bass: v(90, ch(A_CH.slice(0, 4), T.bass)),
  drums: v(90, ['k/4 r/4 k/4 r/4', 'k/4 r/4 k/4 r/4', DR.b, DR.fill]),
});
section('A', 8, { lead: v(100, A), bass: v(96, ch(A_CH, T.bass)), drums: v(100, groove('a')) });
section('A again, the harmony joins', 8, { lead: v(100, A), duo: v(80, ch(A_CH, duoBar)), bass: v(96, ch(A_CH, T.bass)), drums: v(100, groove('a')) });
section('B', 8, { lead: v(100, B), duo: v(78, ch(B_CH, duoBar)), arp: v(66, ch(B_CH, T.arp)), bass: v(96, ch(B_CH, T.bass)), drums: v(100, groove('b')) });
section('The save room: a quiet interlude', 8, {
  lead: v(84, ROOM), arp: v(58, ch(ROOM_CH, T.arp)), bass: v(84, ch(ROOM_CH, T.hold)),
  drums: v(84, [...Array(7).fill(DR.half), DR.fill]),
});
section('A', 8, { lead: v(100, A), duo: v(80, ch(A_CH, duoBar)), bass: v(96, ch(A_CH, T.bass)), drums: v(100, groove('a')) });
section('Adventure', 8, {
  lead: v(104, QUEST), duo: v(76, ch(QUEST_CH, duoBar)), bass: v(100, ch(QUEST_CH, T.pulse)), drums: v(104, groove('quest')),
});
section('B', 8, { lead: v(104, B), duo: v(80, ch(B_CH, duoBar)), arp: v(68, ch(B_CH, T.arp)), bass: v(98, ch(B_CH, T.bass)), drums: v(104, groove('b')) });
section('Up a step: A', 8, { lead: v(106, A), duo: v(82, ch(A_CH, duoBar)), bass: v(100, ch(A_CH, T.bass)), drums: v(106, groove('a')) }, 2);
section('The save room, up a step', 8, {
  lead: v(90, ROOM), duo: v(70, ch(ROOM_CH, duoBar)), arp: v(62, ch(ROOM_CH, T.arp)), bass: v(88, ch(ROOM_CH, T.hold)),
  drums: v(88, [...Array(7).fill(DR.half), DR.fill]),
}, 2);
section('Adventure, up a step', 8, {
  lead: v(108, QUEST), duo: v(80, ch(QUEST_CH, duoBar)), arp: v(64, ch(QUEST_CH, T.arp)), bass: v(104, ch(QUEST_CH, T.pulse)), drums: v(108, groove('quest')),
}, 2);
section('B, up a step', 8, { lead: v(108, B), duo: v(84, ch(B_CH, duoBar)), arp: v(70, ch(B_CH, T.arp)), bass: v(102, ch(B_CH, T.bass)), drums: v(108, groove('b')) }, 2);
section('Outro', 4, {
  lead: v(100, ['E5/8 G5/8 C6/8 G5/8 E5/4 D5/8 C5/8', 'A4/4 C5/4 F5/4 A5/4', 'G5/8 F5/8 E5/8 D5/8 B4/4 D5/4', 'C5/2. r/4']),
  duo: v(78, ['G4/2 E4/2', 'A4/2 F4/2', 'B4/2 D5/2', 'E4/2. r/4']),
  bass: v(96, [T.bass('C'), T.bass('F'), T.bass('G'), 'C3/2. r/4']),
  drums: v(100, [DR.a.replace(/^k\//, '[k cr]/'), DR.a, DR.fill, DR.end]),
}, 2);

const total = tracks.lead.length;
const block = (key) => writeBlock(tracks[key], marks);

const text = `# Save Point, by Claude and SZ. An original for the Chiptune style: two themes, a quiet save-room
# interlude, an adventure section, and everything again up a step.
title: Save Point
composer: Claude & SZ
year: 2026
source: original
category: originals
style: chiptune
key: C major
tempo: 150
time: 4/4

track lead role=lead vol=0.85
${block('lead')}

track duo role=lead2 vol=0.5
${block('duo')}

track arp role=arp vol=0.4
${block('arp')}

track bass role=bass vol=0.5
${block('bass')}

track drums role=drums
${block('drums')}
`;
writeFileSync(join(out, 'save-point.song'), text);
console.log(`wrote ${out}/save-point.song (${total} bars)`);
