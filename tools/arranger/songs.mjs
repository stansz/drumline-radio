// The 15 carols and classics built by the arranger. Each recipe is a melody, chords, and the song's
// own intro, bass line, and drum groove. Writes .song files to <outDir> (default: src/songs).
//   node tools/arranger/songs.mjs [outDir] [song-id ...]
// Für Elise, Greensleeves, Mountain King, Swan Lake, and the originals have their own scripts;
// Valkyries is hand-written.
import { mkdirSync } from 'node:fs';
import { arrange, head } from './arranger.mjs';
import { ABOUT } from './about.mjs';

const [out = 'src/songs', ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
let written = 0;
const A = (spec) => {
  const id = spec.file.replace(/\.song$/, '');
  if (only.length && !only.includes(id)) return;
  if (!ABOUT[id]) throw new Error(`${id}: no story in about.mjs`);
  arrange(out, { ...spec, head: spec.head.replace(/^(arranger: .*)$/m, `$1\nabout: ${ABOUT[id]}`) });
  written += 1;
};

// ---------------- Classics ----------------
A({
  file: 'korobeiniki.song', style: 'chiptune', time: [4, 4], tempo: 144, passes: 3, keyUp: 1,
  intro: { type: 'tease', tease: [0, 1] }, bass: 'oompah', drums: 'polka',
  head: head('Korobeiniki (Tetris tune)', 'Traditional (Russian)', '1861', 'A minor', 'A folk-dance oom-pah under the tune, teased on the arp first.', 'classics'),
  melody: [
    'E5/4 B4/8 C5/8 D5/4 C5/8 B4/8', 'A4/4 A4/8 C5/8 E5/4 D5/8 C5/8', 'B4/4. C5/8 D5/4 E5/4', 'C5/4 A4/4 A4/2',
    'r/8 D5/4 F5/8 A5/4 G5/8 F5/8', 'E5/4. C5/8 E5/4 D5/8 C5/8', 'B4/4 B4/8 C5/8 D5/4 E5/4', 'C5/4 A4/4 A4/2',
    'E5/4 B4/8 C5/8 D5/4 C5/8 B4/8', 'A4/4 A4/8 C5/8 E5/4 D5/8 C5/8', 'B4/4. C5/8 D5/4 E5/4', 'C5/4 A4/4 A4/2',
    'r/8 D5/4 F5/8 A5/4 G5/8 F5/8', 'E5/4. C5/8 E5/4 D5/8 C5/8', 'B4/4 B4/8 C5/8 D5/4 E5/4', 'C5/4 A4/4 A4/2',
    'E5/2 C5/2', 'D5/2 B4/2', 'C5/2 A4/2', 'G#4/2 B4/2', 'E5/2 C5/2', 'D5/2 B4/2', 'C5/4 E5/4 A5/2', 'G#5/1',
  ],
  chords: ['E Am', 'Am', 'E', 'Am', 'Dm', 'C', 'E', 'Am', 'E Am', 'Am', 'E', 'Am', 'Dm', 'C', 'E', 'Am',
    'Am', 'E', 'Am', 'E', 'Am', 'E', 'Am', 'E'],
  final: 'A5/1', finalChord: 'Am',
});

A({
  file: 'ode-to-joy.song', style: 'orchestral', time: [4, 4], tempo: 112, passes: 3, keyUp: 2, hidden: true,
  intro: { type: 'pad', bars: 2 }, bass: 'walk', drums: 'orch',
  head: head('Ode to Joy', 'Ludwig van Beethoven', '1824', 'D major', 'A string swell, then a walking bass under the tune; up a step at the end.', 'classics'),
  melody: [
    'F#5/4 F#5/4 G5/4 A5/4', 'A5/4 G5/4 F#5/4 E5/4', 'D5/4 D5/4 E5/4 F#5/4', 'F#5/4. E5/8 E5/2',
    'F#5/4 F#5/4 G5/4 A5/4', 'A5/4 G5/4 F#5/4 E5/4', 'D5/4 D5/4 E5/4 F#5/4', 'E5/4. D5/8 D5/2',
    'E5/4 E5/4 F#5/4 D5/4', 'E5/4 F#5/8 G5/8 F#5/4 D5/4', 'E5/4 F#5/8 G5/8 F#5/4 E5/4', 'D5/4 E5/4 A4/2',
    'F#5/4 F#5/4 G5/4 A5/4', 'A5/4 G5/4 F#5/4 E5/4', 'D5/4 D5/4 E5/4 F#5/4', 'E5/4. D5/8 D5/2',
  ],
  chords: ['D', 'A', 'D', 'A', 'D', 'A', 'D', 'A D', 'A', 'D', 'A', 'D A', 'D', 'A', 'D', 'A D'],
});

A({
  file: 'can-can.song', style: 'chiptune', time: [2, 4], tempo: 152, passes: 4, keyUp: 2, hidden: true,
  intro: { type: 'drums', bars: 2 }, bass: 'gallop', drums: 'march',
  head: head('Can-Can', 'Jacques Offenbach', '1858', 'C major', 'A snare roll-in, a galloping bass, four times round.', 'classics'),
  melody: [
    'C5/4 C5/4', 'D5/8 F5/8 E5/8 D5/8', 'G5/4 G5/4', 'G5/8 A5/8 E5/8 F5/8', 'D5/4 D5/4', 'D5/8 F5/8 E5/8 D5/8',
    'C5/8 C6/8 B5/8 A5/8', 'G5/8 F5/8 E5/8 D5/8',
    'C5/4 C5/4', 'D5/8 F5/8 E5/8 D5/8', 'G5/4 G5/4', 'G5/8 A5/8 E5/8 F5/8', 'D5/4 D5/4', 'D5/8 F5/8 E5/8 D5/8',
    'C5/8 G5/8 D5/8 E5/8', 'C5/4 r/4',
  ],
  chords: ['C', 'G7', 'C', 'C', 'G7', 'G7', 'C', 'G7', 'C', 'G7', 'C', 'C', 'G7', 'G7', 'C G7', 'C'],
});

A({
  file: 'canon-in-d.song', style: 'orchestral', time: [4, 4], tempo: 70, passes: 4, keyUp: 0,
  intro: { type: 'bassriff', bars: 4 }, bass: 'held', drums: 'canon',
  head: head('Canon in D', 'Johann Pachelbel', 'around 1680', 'D major', 'The ground bass alone, then the canon lines build over it.', 'classics'),
  melody: [
    'F#5/2 E5/2', 'D5/2 C#5/2', 'B4/2 A4/2', 'B4/2 C#5/2',
    'D4/4 F#4/4 A4/4 G4/4', 'F#4/4 D4/4 F#4/4 E4/4', 'D4/4 B3/4 D4/4 A4/4', 'G4/4 B4/4 A4/4 G4/4',
    'D5/8 F#5/8 A5/8 F#5/8 C#5/8 E5/8 A5/8 E5/8', 'B4/8 D5/8 F#5/8 D5/8 A4/8 C#5/8 F#5/8 C#5/8',
    'B4/8 D5/8 G5/8 D5/8 A4/8 D5/8 F#5/8 D5/8', 'B4/8 D5/8 G5/8 D5/8 C#5/8 E5/8 A5/8 E5/8',
  ],
  chords: ['D A', 'Bm F#m', 'G D', 'G A', 'D A', 'Bm F#m', 'G D', 'G A', 'D A', 'Bm F#m', 'G D', 'G A'],
  final: 'F#5/1', finalChord: 'D', ramp: [70, 56],
});

A({
  file: 'eine-kleine-nachtmusik.song', style: 'techno', time: [4, 4], tempo: 128, passes: 3, keyUp: 2, hidden: true,
  intro: { type: 'drums', bars: 4 }, bass: 'pulse16', drums: 'disco',
  head: head('Eine kleine Nachtmusik', 'Wolfgang Amadeus Mozart', '1787', 'G major', 'Four bars of open hats, then Mozart over a pulsing bass.', 'classics'),
  melody: [
    'G4/4 r/8 D4/8 G4/4 r/8 D4/8', 'G4/8 D4/8 G4/8 B4/8 D5/4 r/4', 'C5/4 r/8 A4/8 C5/4 r/8 A4/8', 'C5/8 A4/8 F#4/8 A4/8 D4/4 r/4',
    'G4/4 G4/4 G4/8 B4/8 A4/8 G4/8', 'G4/4 F#4/4 F#4/8 A4/8 C5/8 F#4/8', 'A4/4 G4/4 G4/8 B4/8 A4/8 G4/8', 'G4/4 F#4/4 G4/2',
  ],
  chords: ['G', 'G', 'D', 'D', 'G', 'D', 'G', 'D G'],
});

A({
  file: 'when-the-saints.song', style: 'synthwave', time: [4, 4], tempo: 120, passes: 3, keyUp: 2, hidden: true,
  intro: { type: 'drums', bars: 2 }, bass: 'walk', drums: 'march',
  head: head('When the Saints Go Marching In', 'Traditional', 'traditional', 'C major', 'A marching snare, a walking bass, the last chorus up a step.', 'classics'),
  melody: [
    'r/4 C5/4 E5/4 F5/4', 'G5/1', 'r/4 C5/4 E5/4 F5/4', 'G5/1', 'r/4 C5/4 E5/4 F5/4', 'G5/2 E5/2', 'C5/2 E5/2', 'D5/1',
    'r/4 E5/4 E5/4 D5/4', 'C5/2. C5/4', 'E5/2 G5/2', 'G5/4 F5/2.', 'r/4 E5/4 F5/4 G5/4', 'E5/2 C5/2', 'D5/1', 'C5/1',
  ],
  chords: ['C', 'C', 'C', 'C', 'C', 'C', 'C', 'G', 'C', 'C', 'C7', 'F', 'C', 'C', 'G7', 'C'],
});

// ---------------- Carols ----------------
A({
  file: 'jingle-bells.song', style: 'chiptune', time: [4, 4], tempo: 132, passes: 3, keyUp: 2,
  intro: { type: 'tease', tease: [16, 17] }, bass: 'root5', drums: 'shuffle',
  head: head('Jingle Bells', 'James Lord Pierpont', '1857', 'C major', 'The chorus hook first, then a swung sleigh-ride beat.', 'carols'),
  melody: [
    'G4/4 E5/4 D5/4 C5/4', 'G4/2. G4/8 G4/8', 'G4/4 E5/4 D5/4 C5/4', 'A4/1', 'A4/4 F5/4 E5/4 D5/4', 'B4/1', 'G5/4 G5/4 F5/4 D5/4', 'E5/1',
    'G4/4 E5/4 D5/4 C5/4', 'G4/1', 'G4/4 E5/4 D5/4 C5/4', 'A4/2. A4/4', 'A4/4 F5/4 E5/4 D5/4', 'G5/4 G5/4 G5/4 G5/4', 'A5/4 G5/4 F5/4 D5/4', 'C5/2 r/2',
    'E5/4 E5/4 E5/2', 'E5/4 E5/4 E5/2', 'E5/4 G5/4 C5/4. D5/8', 'E5/1', 'F5/4 F5/4 F5/4. F5/8', 'F5/4 E5/4 E5/4 E5/8 E5/8', 'E5/4 D5/4 D5/4 E5/4', 'D5/2 G5/2',
    'E5/4 E5/4 E5/2', 'E5/4 E5/4 E5/2', 'E5/4 G5/4 C5/4. D5/8', 'E5/1', 'F5/4 F5/4 F5/4 F5/4', 'F5/4 E5/4 E5/4 E5/8 E5/8', 'G5/4 G5/4 F5/4 D5/4', 'C5/1',
  ],
  chords: ['C', 'C', 'C', 'F', 'Dm', 'G', 'G7', 'C', 'C', 'C', 'C', 'F', 'Dm', 'G', 'G7', 'C',
    'C', 'C', 'C', 'C', 'F', 'C', 'D7', 'G7', 'C', 'C', 'C', 'C', 'F', 'C', 'G7', 'C'],
});

A({
  file: 'deck-the-halls.song', style: 'synthwave', time: [4, 4], tempo: 120, passes: 3, keyUp: 2,
  intro: { type: 'tease', tease: [2, 3] }, bass: 'syncop', drums: 'halftime',
  head: head('Deck the Halls', 'Traditional (Welsh)', 'traditional', 'C major', 'A fa-la-la on the pluck, then a half-time beat; last verse up a step.', 'carols'),
  melody: [
    'G5/4. F5/8 E5/4 D5/4', 'C5/4 D5/4 E5/4 C5/4', 'D5/8 E5/8 F5/8 D5/8 E5/4. D5/8', 'C5/4 B4/4 C5/2',
    'G5/4. F5/8 E5/4 D5/4', 'C5/4 D5/4 E5/4 C5/4', 'D5/8 E5/8 F5/8 D5/8 E5/4. D5/8', 'C5/4 B4/4 C5/2',
    'D5/4. E5/8 F5/4 D5/4', 'E5/4. F5/8 G5/4 D5/4', 'E5/8 F#5/8 G5/4 A5/8 B5/8 C6/4', 'B5/4 A5/4 G5/2',
    'G5/4. F5/8 E5/4 D5/4', 'C5/4 D5/4 E5/4 C5/4', 'A5/8 A5/8 A5/8 A5/8 G5/4. F5/8', 'E5/4 D5/4 C5/2',
  ],
  chords: ['C', 'C', 'G7', 'C', 'C', 'C', 'G7', 'C', 'G7', 'C', 'G', 'G', 'C', 'C', 'F', 'C'],
});

A({
  file: 'joy-to-the-world.song', style: 'orchestral', time: [4, 4], tempo: 100, passes: 3, keyUp: 1,
  intro: { type: 'none' }, bass: 'held', drums: 'orch',
  head: head('Joy to the World', 'Traditional, arr. Lowell Mason', '1839', 'D major', 'Straight in with the falling scale; brass joins, then up a key.', 'carols'),
  melody: [
    'D5/2 C#5/4. B4/8', 'A4/2. G4/4', 'F#4/2 E4/2', 'D4/2. A4/4', 'B4/2. B4/4', 'C#5/2. C#5/4', 'D5/2. D5/4',
    'D5/4 C#5/4 B4/4 A4/4', 'A4/4. G4/8 F#4/4 D5/4', 'D5/4 C#5/4 B4/4 A4/4', 'A4/4. G4/8 F#4/4 F#4/4',
    'F#4/4 F#4/4 F#4/4 F#4/8 G4/8', 'A4/2. G4/8 F#4/8', 'E4/4 E4/4 E4/4 E4/8 F#4/8', 'G4/2. F#4/8 E4/8',
    'D4/4 D5/2 B4/4', 'A4/4. G4/8 F#4/4 G4/4', 'F#4/2 E4/2', 'D4/1',
  ],
  chords: ['D A', 'A', 'D A', 'D', 'G', 'A', 'D', 'D A', 'D', 'D A', 'D', 'D', 'D', 'A', 'A7', 'D G', 'D A', 'D A', 'D'],
});

A({
  file: 'god-rest-ye.song', style: 'techno', time: [4, 4], tempo: 126, passes: 3, keyUp: 0,
  intro: { type: 'bassriff', bars: 4 }, bass: 'offbeat8', drums: 'break',
  head: head('God Rest Ye Merry Gentlemen', 'Traditional (English)', 'traditional', 'E minor', 'An off-beat bass alone, then a broken beat under the minor-key carol.', 'carols'),
  melody: [
    'E4/4 B4/4 B4/4 A4/4', 'G4/4 F#4/4 E4/4 D4/4', 'E4/4 F#4/4 G4/4 A4/4', 'B4/2. E4/4',
    'E4/4 B4/4 B4/4 A4/4', 'G4/4 F#4/4 E4/4 D4/4', 'E4/4 F#4/4 G4/4 A4/4', 'B4/2. B4/4',
    'C5/4 A4/4 B4/4 C5/4', 'D5/4 E5/4 B4/4 A4/4', 'G4/4 E4/4 F#4/4 G4/4', 'A4/2 G4/4 A4/4',
    'B4/2 C5/4 B4/4', 'B4/4 A4/4 G4/4 F#4/4', 'E4/2 G4/8 F#4/8 E4/4', 'A4/2 G4/4 A4/4',
    'B4/4 C5/4 D5/4 E5/4', 'B4/4 A4/4 G4/4 F#4/4', 'E4/1',
  ],
  chords: ['Em', 'Em D', 'Em', 'B', 'Em', 'Em D', 'Em', 'B', 'Am', 'G', 'Em', 'D', 'G', 'Em', 'Em', 'D', 'G', 'B7', 'Em'],
});

A({
  file: 'hark-the-herald.song', style: 'orchestral', time: [4, 4], tempo: 108, passes: 3, keyUp: 1,
  intro: { type: 'tease', tease: [0, 1] }, bass: 'walk', drums: 'orch',
  head: head('Hark! The Herald Angels Sing', 'Felix Mendelssohn', '1840', 'G major', 'Bells ring the opening line, then three verses, the last up a key.', 'carols'),
  melody: [
    'D4/4 G4/4 G4/4. F#4/8', 'G4/4 B4/4 B4/4 A4/4', 'D5/4 D5/4 D5/4. C5/8', 'B4/4 A4/4 B4/2',
    'D4/4 G4/4 G4/4. F#4/8', 'G4/4 B4/4 B4/4 A4/4', 'D5/4 A4/4 A4/4. F#4/8', 'F#4/4 E4/4 D4/2',
    'D5/4 D5/4 D5/4 G4/4', 'C5/4 B4/4 B4/4 A4/4', 'D5/4 D5/4 D5/4 G4/4', 'C5/4 B4/4 B4/4 A4/4',
    'E5/4. E5/8 E5/4 D5/4', 'C5/4 B4/4 C5/2', 'A4/4 B4/8 C5/8 D5/4. G4/8', 'G4/4 A4/4 B4/2',
    'E5/4. E5/8 E5/4 D5/4', 'C5/4 B4/4 C5/2', 'A4/4 B4/8 C5/8 D5/4. G4/8', 'G4/4 A4/4 G4/2',
  ],
  chords: ['G', 'G D', 'G D', 'G', 'G', 'G D', 'D', 'A D', 'G', 'C D', 'G', 'C D', 'C', 'Am', 'D7', 'G', 'C', 'Am', 'D7', 'G'],
});

A({
  file: 'good-king-wenceslas.song', style: 'chiptune', time: [4, 4], tempo: 116, passes: 3, keyUp: 2,
  intro: { type: 'bassriff', bars: 2 }, bass: 'syncop', drums: 'chip',
  head: head('Good King Wenceslas', 'Traditional (Piae Cantiones)', '1582', 'G major', 'A syncopated triangle bass sets off, the drums fall in; last verse up a step.', 'carols'),
  melody: [
    'G4/4 G4/4 G4/4 A4/4', 'G4/4 G4/4 D4/2', 'E4/4 D4/4 E4/4 F#4/4', 'G4/2 G4/2',
    'G4/4 G4/4 G4/4 A4/4', 'G4/4 G4/4 D4/2', 'E4/4 D4/4 E4/4 F#4/4', 'G4/2 G4/2',
    'D5/4 C5/4 B4/4 A4/4', 'B4/4 A4/4 G4/2', 'E4/4 D4/4 E4/4 F#4/4', 'G4/2 G4/2',
    'D4/4 D4/4 E4/4 F#4/4', 'G4/4 G4/4 A4/2', 'D5/4 C5/4 B4/4 A4/4', 'G4/2 C5/2', 'G4/1',
  ],
  chords: ['G', 'G D', 'C D', 'G', 'G', 'G D', 'C D', 'G', 'G D', 'G', 'C D', 'G', 'D', 'G D', 'G D', 'G C', 'G'],
});

A({
  file: 'we-wish-you.song', style: 'synthwave', time: [3, 4], tempo: 150, passes: 3, keyUp: 2,
  intro: { type: 'drums', bars: 2 }, bass: 'waltz', drums: 'waltz',
  head: head('We Wish You a Merry Christmas', 'Traditional (English)', 'traditional', 'G major', 'A waltz beat counts in, verse and chorus three times.', 'carols'),
  pickup: 'r/2 D4/4',
  melody: [
    'G4/4 G4/8 A4/8 G4/8 F#4/8', 'E4/4 C4/4 E4/4', 'A4/4 A4/8 B4/8 A4/8 G4/8', 'F#4/4 D4/4 F#4/4',
    'B4/4 B4/8 C5/8 B4/8 A4/8', 'G4/4 E4/4 D4/8 D4/8', 'E4/4 A4/4 F#4/4', 'G4/2 D4/4',
    'G4/4 G4/4 G4/4', 'F#4/2 F#4/4', 'G4/4 F#4/4 E4/4', 'D4/2 A4/4',
    'B4/4 A4/4 G4/4', 'D5/4 D4/4 D4/8 D4/8', 'E4/4 A4/4 F#4/4', 'G4/2.',
  ],
  chords: ['G', 'C', 'A7', 'D', 'B7', 'Em', 'C D', 'G', 'G', 'D', 'Em', 'D', 'G', 'D', 'C D', 'G'],
  link: 'G4/2 D4/4', final: 'G4/2.',
});

A({
  file: 'o-christmas-tree.song', style: 'orchestral', time: [3, 4], tempo: 92, passes: 3, keyUp: 0,
  intro: { type: 'pad', bars: 2 }, bass: 'waltz', drums: 'orch',
  head: head('O Christmas Tree', 'Traditional (German)', 'traditional', 'G major', 'A soft string chord, then woodwinds over a gentle waltz bass.', 'carols'),
  pickup: 'r/2 D4/4',
  melody: [
    'G4/8. G4/16 G4/4. A4/8', 'B4/8. B4/16 B4/4. B4/8', 'A4/8 B4/8 C5/4 F#4/4', 'A4/4 G4/4 r/8 D4/8',
    'G4/8. G4/16 G4/4. A4/8', 'B4/8. B4/16 B4/4. B4/8', 'A4/8 B4/8 C5/4 F#4/4', 'A4/4 G4/4 r/8 D5/8',
    'D5/8 B4/8 E5/4. D5/8', 'D5/8 C5/8 C5/4. C5/8', 'C5/8 A4/8 D5/4. C5/8', 'C5/8 B4/8 B4/4 r/8 D4/8',
    'G4/8. G4/16 G4/4. A4/8', 'B4/8. B4/16 B4/4. B4/8', 'A4/8 B4/8 C5/4 F#4/4', 'A4/4 G4/4 r/4',
  ],
  chords: ['G', 'G', 'D7', 'G', 'G', 'G', 'D7', 'G', 'G C', 'D7', 'D7', 'G', 'G', 'G', 'D7', 'G'],
  link: 'A4/4 G4/4 D4/4', final: 'A4/4 G4/2',
  parts: { lead: 'counter', harm: 'lead' },
  ramp: [92, 70],
});

A({
  file: 'silent-night.song', style: 'synthwave', time: [6, 8], tempo: 78, passes: 2, keyUp: 0,
  intro: { type: 'pad', bars: 2 }, bass: 'held', drums: 'ballad',
  head: head('Silent Night', 'Franz Xaver Gruber', '1818', 'C major', 'Two gentle verses over a warm pad and a soft rim.', 'carols'),
  melody: [
    'G4/4. A4/8 G4/4', 'E4/2.', 'G4/4. A4/8 G4/4', 'E4/2.', 'D5/2 D5/4', 'B4/2.', 'C5/2 C5/4', 'G4/2.',
    'A4/2 A4/4', 'C5/4. B4/8 A4/4', 'G4/4. A4/8 G4/4', 'E4/2.', 'A4/2 A4/4', 'C5/4. B4/8 A4/4', 'G4/4. A4/8 G4/4', 'E4/2.',
    'D5/2 D5/4', 'F5/4. D5/8 B4/4', 'C5/2.', 'E5/2.', 'C5/4. G4/8 E4/4', 'G4/4. F4/8 D4/4', 'C4/2.', 'C4/2.',
  ],
  chords: ['C', 'C', 'C', 'C', 'G', 'G', 'C', 'C', 'F', 'F', 'C', 'C', 'F', 'F', 'C', 'C',
    'G', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C'],
  ramp: [78, 60],
});

console.log(`${written} songs written to ${out}`);
