// Save Point: an original for the Chiptune style. The A and B themes are the song's own; this script
// adds a quiet "save room" interlude and an "adventure" section, then plays the themes again up a
// step (C to D) before the outro.
//   node tools/arranger/save-point.mjs [outDir]
import {
  entryVelocity, noteName, outDir, parseChord, saveSong, sectionBuilder, SHARPS, transpose,
} from './lib.mjs';

const out = outDir();

const nm = (n) => noteName(n, SHARPS);

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
const duoBar = (sym) => { const c = parseChord(sym); const t = c.iv.map((i) => 64 + ((c.pc + i - 4 + 12) % 12)).sort((x, y) => x - y); return `${nm(t[1])}/2 ${nm(t[0])}/2`; };

const T = {
  arp: (sym) => {
    const c = parseChord(sym);
    const base = 57 + ((c.pc - 9 + 12) % 12); // A3 .. G#4
    const t = [base, base + c.iv[1], base + 7, base + 12];
    return [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 1, 0, 1].map((k) => `${nm(t[k])}/16`).join(' ');
  },
  bass: (sym) => {
    const c = parseChord(sym);
    const r = 40 + ((c.pc - 4 + 12) % 12); // E2 .. D#3
    const f = r + 7 <= 48 ? r + 7 : r - 5;
    return `${nm(r)}/4 ${nm(f)}/4 ${nm(r)}/4 ${nm(f)}/4`;
  },
  pulse: (sym) => { const r = 40 + ((parseChord(sym).pc - 4 + 12) % 12); return Array(4).fill(`${nm(r)}/8 ${nm(r + 12)}/8`).join(' '); },
  hold: (sym) => `${nm(40 + ((parseChord(sym).pc - 4 + 12) % 12))}/1`,
};
const DR = {
  a: 'k/8 h s h k k s h', b: 'k/8 h s h k h s s', fill: 'k/8 h s h s/16 s s s s/8 s',
  half: 'k/4 h/4 s/4 h/4', quest: 'k/8 k s h k k s s', end: '[k cr]/2. r/4',
};
const crashFirst = (bars) => bars.map((b, i) => (i === 0 ? b.replace(/^k\//, '[k cr]/') : b));
const groove = (kind) => crashFirst([...Array(7).fill(DR[kind]), DR.fill]);

const keys = ['lead', 'duo', 'arp', 'bass', 'drums'];
const { tracks, section, block } = sectionBuilder(keys);

section('Intro', 4, {
  arp: entryVelocity(70, A_CH.slice(0, 4).map(T.arp)),
  bass: entryVelocity(90, A_CH.slice(0, 4).map(T.bass)),
  drums: entryVelocity(90, ['k/4 r/4 k/4 r/4', 'k/4 r/4 k/4 r/4', DR.b, DR.fill]),
});
section('A', 8, { lead: entryVelocity(100, A), bass: entryVelocity(96, A_CH.map(T.bass)), drums: entryVelocity(100, groove('a')) });
section('A again, the harmony joins', 8, { lead: entryVelocity(100, A), duo: entryVelocity(80, A_CH.map(duoBar)), bass: entryVelocity(96, A_CH.map(T.bass)), drums: entryVelocity(100, groove('a')) });
section('B', 8, { lead: entryVelocity(100, B), duo: entryVelocity(78, B_CH.map(duoBar)), arp: entryVelocity(66, B_CH.map(T.arp)), bass: entryVelocity(96, B_CH.map(T.bass)), drums: entryVelocity(100, groove('b')) });
section('The save room: a quiet interlude', 8, {
  lead: entryVelocity(84, ROOM), arp: entryVelocity(58, ROOM_CH.map(T.arp)), bass: entryVelocity(84, ROOM_CH.map(T.hold)),
  drums: entryVelocity(84, [...Array(7).fill(DR.half), DR.fill]),
});
section('A', 8, { lead: entryVelocity(100, A), duo: entryVelocity(80, A_CH.map(duoBar)), bass: entryVelocity(96, A_CH.map(T.bass)), drums: entryVelocity(100, groove('a')) });
section('Adventure', 8, {
  lead: entryVelocity(104, QUEST), duo: entryVelocity(76, QUEST_CH.map(duoBar)), bass: entryVelocity(100, QUEST_CH.map(T.pulse)), drums: entryVelocity(104, groove('quest')),
});
section('B', 8, { lead: entryVelocity(104, B), duo: entryVelocity(80, B_CH.map(duoBar)), arp: entryVelocity(68, B_CH.map(T.arp)), bass: entryVelocity(98, B_CH.map(T.bass)), drums: entryVelocity(104, groove('b')) });
section('Up a step: A', 8, { lead: entryVelocity(106, A), duo: entryVelocity(82, A_CH.map(duoBar)), bass: entryVelocity(100, A_CH.map(T.bass)), drums: entryVelocity(106, groove('a')) }, { map: (bar, key) => transpose(bar, key === 'drums' ? 0 : 2, nm) });
section('The save room, up a step', 8, {
  lead: entryVelocity(90, ROOM), duo: entryVelocity(70, ROOM_CH.map(duoBar)), arp: entryVelocity(62, ROOM_CH.map(T.arp)), bass: entryVelocity(88, ROOM_CH.map(T.hold)),
  drums: entryVelocity(88, [...Array(7).fill(DR.half), DR.fill]),
}, { map: (bar, key) => transpose(bar, key === 'drums' ? 0 : 2, nm) });
section('Adventure, up a step', 8, {
  lead: entryVelocity(108, QUEST), duo: entryVelocity(80, QUEST_CH.map(duoBar)), arp: entryVelocity(64, QUEST_CH.map(T.arp)), bass: entryVelocity(104, QUEST_CH.map(T.pulse)), drums: entryVelocity(108, groove('quest')),
}, { map: (bar, key) => transpose(bar, key === 'drums' ? 0 : 2, nm) });
section('B, up a step', 8, { lead: entryVelocity(108, B), duo: entryVelocity(84, B_CH.map(duoBar)), arp: entryVelocity(70, B_CH.map(T.arp)), bass: entryVelocity(102, B_CH.map(T.bass)), drums: entryVelocity(108, groove('b')) }, { map: (bar, key) => transpose(bar, key === 'drums' ? 0 : 2, nm) });
section('Outro', 4, {
  lead: entryVelocity(100, ['E5/8 G5/8 C6/8 G5/8 E5/4 D5/8 C5/8', 'A4/4 C5/4 F5/4 A5/4', 'G5/8 F5/8 E5/8 D5/8 B4/4 D5/4', 'C5/2. r/4']),
  duo: entryVelocity(78, ['G4/2 E4/2', 'A4/2 F4/2', 'B4/2 D5/2', 'E4/2. r/4']),
  bass: entryVelocity(96, [T.bass('C'), T.bass('F'), T.bass('G'), 'C3/2. r/4']),
  drums: entryVelocity(100, [DR.a.replace(/^k\//, '[k cr]/'), DR.a, DR.fill, DR.end]),
}, { map: (bar, key) => transpose(bar, key === 'drums' ? 0 : 2, nm) });

const total = tracks.lead.length;
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
saveSong(out, 'save-point.song', text);
console.log(`wrote ${out}/save-point.song (${total} bars)`);
