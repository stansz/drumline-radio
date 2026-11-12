// In the Hall of the Mountain King (Grieg, Peer Gynt, 1875), arranged for the Chiptune style. The
// notes follow Grieg's own piano version (Mutopia Project, converted with tools/midi/midi2song.mjs):
// the lead plays his top line, the harmony his second voice, and the bass the lowest note of his left
// hand. Each 8-bar phrase is moved by whole octaves where it would leave the lead's range, so the tune
// starts higher than Grieg's low bassoon register. It speeds up from 100 to 210, as he asks.
//   node tools/arranger/mountain-king.mjs [outDir]
import {
  barMarks, MIXED, noteMidi, noteName, outDir, saveSong, transpose, valueAt, writeBlock,
} from './lib.mjs';

const out = outDir();

// The voices as converted, bar 1 first.
const TOP = [
 "[F#3 F#4]/2.~ [F#3 F#4]/8 r/8",
 "B1/16 r/16 C#2/16 r/16 D2/16 r/16 E2/16 r/16 F#2/16 r/16 D2/16 r/16 F#2/8 r/8",
 "F2/16 r/16 C#2/16 r/16 F2/8 r/8 E2/16 r/16 C2/16 r/16 E2/8 r/8",
 "B1/16 r/16 C#2/16 r/16 D2/16 r/16 E2/16 r/16 F#2/16 r/16 D2/16 r/16 F#2/16 r/16 B2/16 r/16",
 "A2/16 r/16 F#2/16 r/16 D2/16 r/16 F#2/16 r/16 A2/4.~ A2/16 r/16",
 "B2/16 r/16 C#3/16 r/16 D3/16 r/16 E3/16 r/16 F#3/16 r/16 D3/16 r/16 F#3/8 r/8",
 "F3/16 r/16 C#3/16 r/16 F3/8 r/8 E3/16 r/16 C3/16 r/16 E3/8 r/8",
 "B2/16 r/16 C#3/16 r/16 D3/16 r/16 E3/16 r/16 F#3/16 r/16 D3/16 r/16 F#3/16 r/16 B3/16 r/16",
 "A3/16 r/16 F#3/16 r/16 D3/16 r/16 F#3/16 r/16 [A2 A3]/4.~ [A2 A3]/16 r/16",
 "F#2/16 r/16 Ab2/16 r/16 Bb2/16 r/16 B2/16 r/16 C#3/16 r/16 Bb2/16 r/16 C#3/8 r/8",
 "D3/16 r/16 Bb2/16 r/16 D3/8 r/8 C#3/16 r/16 Bb2/16 r/16 C#3/8 r/8",
 "F#2/16 r/16 Ab2/16 r/16 Bb2/16 r/16 B2/16 r/16 C#3/16 r/16 Bb2/16 r/16 C#3/8 r/8",
 "D3/16 r/16 Bb2/16 r/16 D3/8 r/8 C#3/4.~ C#3/16 r/16",
 "F#3/16 r/16 Ab3/16 r/16 Bb3/16 r/16 B3/16 r/16 C#4/16 r/16 Bb3/16 r/16 C#4/8 r/8",
 "D4/16 r/16 Bb3/16 r/16 D4/8 r/8 C#4/16 r/16 Bb3/16 r/16 C#4/8 r/8",
 "F#3/16 r/16 Ab3/16 r/16 Bb3/16 r/16 B3/16 r/16 C#4/16 r/16 Bb3/16 r/16 C#4/8 r/8",
 "D4/16 r/16 Bb3/16 r/16 D4/8 r/8 [C#3 C#4]/4.~ [C#3 C#4]/16 r/16",
 "B1/16 r/16 C#2/16 r/16 D2/16 r/16 E2/16 r/16 F#2/16 r/16 D2/16 r/16 F#2/8 r/8",
 "F2/16 r/16 C#2/16 r/16 F2/8 r/8 E2/16 r/16 C2/16 r/16 E2/8 r/8",
 "B1/16 r/16 C#2/16 r/16 D2/16 r/16 E2/16 r/16 F#2/16 r/16 D2/16 r/16 F#2/16 r/16 B2/16 r/16",
 "A2/16 r/16 F#2/16 r/16 D2/16 r/16 F#2/16 r/16 A2/4.~ A2/16 r/16",
 "B2/16 r/16 C#3/16 r/16 D3/16 r/16 E3/16 r/16 F#3/16 r/16 D3/16 r/16 F#3/8 r/8",
 "F3/16 r/16 C#3/16 r/16 F3/8 r/8 E3/16 r/16 C3/16 r/16 E3/8 r/8",
 "B2/16 r/16 C#3/16 r/16 D3/16 r/16 E3/16 r/16 F#3/16 r/16 D3/16 r/16 F#3/16 r/16 B3/16 r/16",
 "A3/16 r/16 F#3/16 r/16 D3/16 r/16 F#3/16 r/16 [A2 A3]/4.~ [A2 A3]/16 r/16",
 "B3/16 r/16 C#4/16 r/16 [F#3 D4]/16 r/16 E4/16 r/16 F#4/16 r/16 D4/16 r/16 [F#3 F#4]/8 r/8",
 "F4/16 r/16 C#4/16 r/16 [F3 F4]/8 r/8 E4/16 r/16 C4/16 r/16 [E3 E4]/8 r/8",
 "B3/16 r/16 C#4/16 r/16 [F#3 D4]/16 r/16 E4/16 r/16 F#4/16 r/16 D4/16 r/16 F#4/16 r/16 B4/16 r/16",
 "A4/16 r/16 F#4/16 r/16 [A3 D4]/16 r/16 F#4/16 r/16 A4/4.~ A4/16 r/16",
 "B4/16 r/16 C#5/16 r/16 D5/16 r/16 E5/16 r/16 F#5/16 r/16 D5/16 r/16 F#5/8 r/8",
 "F5/16 r/16 C#5/16 r/16 F5/8 r/8 E5/16 r/16 C5/16 r/16 E5/8 r/8",
 "B4/16 r/16 C#5/16 r/16 D5/16 r/16 E5/16 r/16 F#5/16 r/16 D5/16 r/16 F#5/16 r/16 B5/16 r/16",
 "A5/16 r/16 F#5/16 r/16 D5/16 r/16 F#5/16 r/16 A5/4.~ A5/16 r/16",
 "F#4/16 r/16 Ab4/16 r/16 Bb4/16 r/16 B4/16 r/16 C#5/16 r/16 Bb4/16 r/16 [F#4 Bb4 C#5]/8.~ [F#4 Bb4 C#5]/32 r/32",
 "D5/16 r/16 Bb4/16 r/16 [F#4 Bb4 D5]/8.~ [F#4 Bb4 D5]/32 r/32 C#5/16 r/16 Bb4/16 r/16 [F#4 Bb4 C#5]/8.~ [F#4 Bb4 C#5]/32 r/32",
 "F#4/16 r/16 Ab4/16 r/16 Bb4/16 r/16 B4/16 r/16 C#5/16 r/16 Bb4/16 r/16 [F#4 Bb4 C#5]/8.~ [F#4 Bb4 C#5]/32 r/32",
 "D5/16 r/16 Bb4/16 r/16 [F#4 Bb4 D5]/8.~ [F#4 Bb4 D5]/32 r/32 C#5/4.~ C#5/16 r/16",
 "F#5/16 r/16 Ab5/16 r/16 [F#5 Bb5]/16 r/16 B5/16 r/16 C#6/16 r/16 Bb5/16 r/16 [F#5 Bb5 C#6]/8 r/8",
 "D6/16 r/16 Bb5/16 r/16 [F#5 Bb5 D6]/8 r/8 C#6/16 r/16 Bb5/16 r/16 [F#5 Bb5 C#6]/8 r/8",
 "F#5/16 r/16 Ab5/16 r/16 [F#5 Bb5]/16 r/16 B5/16 r/16 C#6/16 r/16 Bb5/16 r/16 [F#5 Bb5 C#6]/8 r/8",
 "D6/16 r/16 Bb5/16 r/16 [F#5 Bb5 D6]/8 r/8 C#6/4.~ C#6/16 r/16",
 "B3/16 r/16 C#4/16 r/16 [F#3 D4]/16 r/16 E4/16 r/16 F#4/16 r/16 D4/16 r/16 [F#3 F#4]/8 r/8",
 "F4/16 r/16 C#4/16 r/16 [F#3 F4]/8 r/8 E4/16 r/16 C4/16 r/16 [F#3 F4]/8 r/8",
 "B3/16 r/16 C#4/16 r/16 [F#3 D4]/16 r/16 E4/16 r/16 F#4/16 r/16 D4/16 r/16 [B3 F#4]/16 r/16 B4/16 r/16",
 "A4/16 r/16 F#4/16 r/16 [A3 E4]/16 r/16 F#4/16 r/16 A4/4.~ A4/16 r/16",
 "B4/16 r/16 C#5/16 r/16 D5/16 r/16 E5/16 r/16 F#5/16 r/16 D5/16 r/16 [F#4 F#5]/8.~ [F#4 F#5]/32 r/32",
 "F5/16 r/16 C#5/16 r/16 F5/8 r/8 E5/16 r/16 C5/16 r/16 [F#4 E5]/8.~ [F#4 E5]/32 r/32",
 "B4/16 r/16 C#5/16 r/16 D5/16 r/16 E5/16 r/16 F#5/16 r/16 D5/16 r/16 F#5/16 r/16 B5/16 r/16",
 "F#5/16 r/16 D5/16 r/16 F#5/16 r/16 B5/16 r/16 B4/4.~ B4/16 r/16",
 "B5/4.~ B5/16 r/16 F#6/16.~ F#6/32t r/64t D6/16 r/16 F#6/8 r/8",
 "F6/16 r/16 C#6/16 r/16 F6/8 r/8 E6/16 r/16 C6/16 r/16 E6/8 r/8",
 "B5/4.~ B5/16 r/16 F#6/16 r/16 D6/16 r/16 F#6/16 r/16 B6/16 r/16",
 "A6/16 r/16 F#6/16 r/16 D6/8. r/16 [A5 D6 A6]/4.~ [A5 D6 A6]/16 r/16",
 "B5/4.~ B5/16 r/16 F#6/16.~ F#6/32t r/64t D6/16 r/16 F#6/8 r/8",
 "F6/16.~ F6/32t r/64t C#6/16 r/16 F6/8 r/8 E6/16.~ E6/32t r/64t C6/16 r/16 E6/8 r/8",
 "B5/4.~ B5/16 r/16 F#6/16 r/16 D6/16 r/16 F#6/16 r/16 B6/16 r/16",
 "A6/16 r/16 F#6/16 r/16 D6/8. r/16 [A5 D6 A6]/4.~ [A5 D6 A6]/16 r/16",
 "F#6/4.~ F#6/16 r/16 C#7/16.~ C#7/32t r/64t Bb6/16 r/16 [C#6 F#6 C#7]/8.~ [C#6 F#6 C#7]/32 r/32",
 "[D6 F#6 D7]/16.~ [D6 F#6 D7]/32t r/64t Bb6/16 r/16 [D6 F#6 D7]/8.~ [D6 F#6 D7]/32 r/32 [C#6 F#6 C#7]/16.~ [C#6 F#6 C#7]/32t r/64t Bb6/16 r/16 [C#6 F#6 C#7]/8.~ [C#6 F#6 C#7]/32 r/32",
 "F#6/16 r/16 [F#6 G6]/16 r/16 [F#6 Bb6]/16 r/16 [F#6 B6]/16 r/16 [C#6 F#6 C#7]/16.~ [C#6 F#6 C#7]/32t r/64t [C#6 F#6 Bb6]/16 r/16 [C#6 F#6 C#7]/8.~ [C#6 F#6 C#7]/32 r/32",
 "[D6 F#6 D7]/16.~ [D6 F#6 D7]/32t r/64t [D6 F#6 Bb6]/16 r/16 [D6 F#6 D7]/8.~ [D6 F#6 D7]/32 r/32 [C#6 F#6 C#7]/4.~ [C#6 F#6 C#7]/16 r/16",
 "F#6/4.~ F#6/16 r/16 C#7/16.~ C#7/32t r/64t Bb6/16 r/16 [C#6 F#6 C#7]/8.~ [C#6 F#6 C#7]/32 r/32",
 "[Eb6 F#6 Eb7]/16.~ [Eb6 F#6 Eb7]/32t r/64t Bb6/16 r/16 [Eb6 F#6 Eb7]/8.~ [Eb6 F#6 Eb7]/32 r/32 [C#6 F#6 C#7]/16.~ [C#6 F#6 C#7]/32t r/64t Bb6/16 r/16 [C#6 F#6 C#7]/8.~ [C#6 F#6 C#7]/32 r/32",
 "F#6/16 r/16 [F#6 G6]/16 r/16 [F#6 Bb6]/16 r/16 [F#6 B6]/16 r/16 [C#6 F#6 C#7]/16.~ [C#6 F#6 C#7]/32t r/64t [C#6 F#6 Bb6]/16 r/16 [C#6 F#6 C#7]/8.~ [C#6 F#6 C#7]/32 r/32",
 "[D6 F#6 D7]/16.~ [D6 F#6 D7]/32t r/64t [D6 F#6 Bb6]/16 r/16 [D6 F#6 D7]/8.~ [D6 F#6 D7]/32 r/32 [C#6 F#6 C#7]/4.~ [C#6 F#6 C#7]/16 r/16",
 "B5/4.~ B5/16 r/16 F#6/16.~ F#6/32t r/64t D6/16 r/16 F#6/8.~ F#6/32 r/32",
 "F6/16.~ F6/32t r/64t C#6/16 r/16 F6/8 r/8 E6/16.~ E6/32t r/64t C6/16 r/16 E6/8 r/8",
 "B5/4.~ B5/16 r/16 F#6/16 r/16 B5/4~ B5/16 r/16",
 "A6/16 r/16 F#6/16 r/16 D6/8. r/16 [A5 D6 A6]/4.~ [A5 D6 A6]/16 r/16",
 "B5/16 r/16 [B5 C#6]/16 r/16 [B5 D6]/16 r/16 [B5 E6]/16 r/16 [B5 F#6]/16.~ [B5 F#6]/32t r/64t [B5 D6]/16 r/16 [B5 D6 F#6]/8 r/8",
 "[B5 F6]/16.~ [B5 F6]/32t r/64t [B5 C#6]/16 r/16 [B5 C#6 F6]/8 r/8 [B5 E6]/16.~ [B5 E6]/32t r/64t [B5 C6]/16 r/16 [B5 C6 E6]/8 r/8",
 "B5/16 r/16 [B5 C#6]/16 r/16 [B5 D6]/16 r/16 [B5 E6]/16 r/16 [B5 F#6]/16 r/16 [B5 D6]/16 r/16 [B5 F#6]/16 r/16 [B5 B6]/16 r/16",
 "[B5 F#6]/16 r/16 [B5 D6]/16 r/16 [B5 F#6]/16 r/16 [B5 B6]/16 r/16 B5/4.~ B5/32t r/16. r/64t",
 "r/8. r/32t Ab6/64t A6/64t Bb6/32t [D6 B6]/8t r/2 r/8 r/16t",
 "r/8. r/32t Ab6/64t A6/64t Bb6/32t [D6 B6]/8 r/2 r/8",
 "B4/16 r/16 C#5/16 r/16 D5/16 r/16 E5/16 r/16 F#5/16 r/16 D5/16 r/16 F#5/16 r/16 B5/16 r/16",
 "Bb5/16 r/16 F#5/16 r/16 Bb5/16 r/16 C#6/16 r/16 B5/4.~ B5/32t r/16. r/64t",
 "r/8. r/32t Ab6/64t A6/64t Bb6/32t [D6 B6]/8t r/2 r/8 r/16t",
 "r/8. r/32t Ab6/64t A6/64t Bb6/32t [D6 B6]/8 r/2 r/8",
 "B5/16 r/16 C#6/16 r/16 D6/16 r/16 E6/16 r/16 F#6/16 r/16 D6/16 r/16 F#6/16 r/16 B6/16 r/16",
 "Bb6/16 r/16 F#6/16 r/16 Bb6/16 r/16 C#7/16 r/16 B6/4.~ B6/32t r/16. r/64t",
 "r/8. r/32t Ab6/64t A6/64t Bb6/32t [D6 B6]/8t r/2 r/8 r/16t",
 "r/8. r/32t Ab6/64t A6/64t Bb6/32t [D6 B6]/8t r/2 r/8 r/16t",
 "r/8. r/32t Ab6/64t A6/64t Bb6/32t [D6 B6]/16.~ [D6 B6]/8t r/32 Ab6/64t A6/64t Bb6/32t [D6 B6]/16.~ [D6 B6]/8t r/32 Ab6/64t A6/64t Bb6/32t [D6 B6]/16.~ [D6 B6]/8t r/32 Ab6/64t A6/64t Bb6/32t",
 "[D6 B6]/16.~ [D6 B6]/8t r/16t Ab6/64t A6/32t Bb6/64t [D6 B6]/16.~ [D6 B6]/8t r/16t Ab6/32t A6/64t Bb6/64t r/64t [D6 B6]/8~ [D6 B6]/16t r/16t r/64t Ab6/64t A6/64t Bb6/32t [D6 B6]/16.~ [D6 B6]/8t r/32",
 "R",
 "R",
 "r/4 Ab6/64t A6/64t Bb6/32t [D6 B6]/8.~ [D6 B6]/32 r/4. r/16. r/32t"
];
const SECOND = [
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "r/2. [A3 D4]/8.~ [A3 D4]/32 r/32",
 "r/4 F#4/8.~ F#4/32 r/4 r/32 F#4/8.~ F#4/32 r/32",
 "r/4 F#4/8.~ F#4/32 r/4 r/32 F#4/8.~ F#4/32 r/32",
 "r/4 F#4/8.~ F#4/32 r/2 r/32",
 "r/4 A4/8.~ A4/32 r/4 r/32 [A4 D5]/8.~ [A4 D5]/32 r/32",
 "r/4 F#4/8.~ F#4/32 r/2 r/32",
 "R",
 "r/4 F#4/8.~ F#4/32 r/2 r/32",
 "r/2. [F#4 Bb4]/8.~ [F#4 Bb4]/32 r/32",
 "R",
 "R",
 "R",
 "r/2. [F#5 Bb5]/8.~ [F#5 Bb5]/32 r/32",
 "R",
 "R",
 "R",
 "r/2. [A3 E4]/8.~ [A3 E4]/32 r/32",
 "r/4 F#4/8.~ F#4/32 r/2 r/32",
 "r/4 F#4/8.~ F#4/32 r/2 r/32",
 "r/2. [B4 D5]/8.~ [B4 D5]/32 r/32",
 "r/4 [B4 D5]/8.~ [B4 D5]/32 r/2 r/32",
 "r/8 C#6/16 r/16 D6/16 r/16 E6/16 r/16 B5/4.~ B5/16 r/16",
 "B5/4.~ B5/16 r/16 B5/4.~ B5/16 r/16",
 "r/8 C#6/16 r/16 D6/16 r/16 E6/16 r/16 B5/4.~ B5/16 r/16",
 "D6/4 r/8 F#6/16 r/2 r/16",
 "r/8 C#6/16 r/16 D6/16 r/16 E6/16 r/16 B5/4.~ B5/16 r/16",
 "B5/4.~ B5/16 r/16 B5/4.~ B5/16 r/16",
 "r/8 C#6/16 r/16 D6/16 r/16 E6/16 r/16 B5/4.~ B5/16 r/16",
 "D6/4 r/8 F#6/16 r/2 r/16",
 "r/8 Ab6/16 r/16 Bb6/16 r/16 B6/16 r/16 [C#6 F#6]/8.~ [C#6 F#6]/32 r/4 r/32",
 "R",
 "R",
 "R",
 "r/8 Ab6/16 r/16 Bb6/16 r/16 B6/16 r/16 [C#6 F#6]/8.~ [C#6 F#6]/32 r/4 r/32",
 "R",
 "R",
 "R",
 "r/8 C#6/16 r/16 D6/16 r/16 E6/16 r/16 B5/4.~ B5/16 r/16",
 "B5/4.~ B5/16 r/16 B5/4.~ B5/16 r/16",
 "r/8 C#6/16 r/16 D6/16 r/16 E6/16 r/16 B5/8 r/8 F#6/16 r/16 B6/16 r/16",
 "D6/4 r/8 F#6/16 r/2 r/16",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R",
 "R"
];
const LOW = [
 "R",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "D1/8 r/8 A1/8 r/8 D1/8 r/8 A1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "D1/8 r/8 A1/8 r/8 D1/8 r/8 A1/8 r/8",
 "F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32 F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32",
 "D1/8.~ D1/32 r/32 Bb1/8.~ Bb1/32 r/32 F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32",
 "F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32 F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32",
 "D1/8.~ D1/32 r/32 Bb1/8.~ Bb1/32 r/32 F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32",
 "F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32 F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32",
 "D1/8.~ D1/32 r/32 Bb1/8.~ Bb1/32 r/32 F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32",
 "F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32 F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32",
 "D1/8.~ D1/32 r/32 Bb1/8.~ Bb1/32 r/32 F#1/8.~ F#1/32 r/32 C#2/8.~ C#2/32 r/32",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "D1/8 r/8 A1/8 r/8 D1/8 r/8 A1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "B0/8 r/8 F#1/8 r/8 B0/8 r/8 F#1/8 r/8",
 "B0/8 r/8 B1/8 r/8 A1/8 r/8 G1/8 r/8",
 "F#1/8 r/8 E1/8 r/8 C#1/8 r/8 B0/8 r/8",
 "B0/8.~ B0/32 r/32 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t B1/8 r/8 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t",
 "B1/8 r/8 [F#2 C#3]/16 F2/16 F#2/16.~ F#2/32t r/64t B1/8 r/8 [F#2 C3]/16 F2/16 F#2/16.~ F#2/32t r/64t",
 "B1/8 r/8 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t B1/8 r/8 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t",
 "D2/8 r/8 [A2 F#3]/16 Ab2/16 A2/16.~ A2/32t r/64t D2/8 r/8 [A2 F#3]/16 Ab2/16 A2/16.~ A2/32t r/64t",
 "B1/8 r/8 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t B1/8 r/8 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t",
 "B1/8 r/8 [F#2 C#3]/16 F2/16 F#2/16.~ F#2/32t r/64t B1/8 r/8 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t",
 "B1/8 r/8 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t B1/8 r/8 [F#2 D3]/16 F2/16 F#2/16.~ F#2/32t r/64t",
 "D2/8 r/8 [A2 F#3]/16 Ab2/16 A2/16.~ A2/32t r/64t D2/8 r/8 [A2 F#3]/16 Ab2/16 A2/16.~ A2/32t r/64t",
 "F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t",
 "D2/8 r/8 [D3 Bb3]/16 C#3/16 D3/16.~ D3/32t r/64t F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t",
 "F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t",
 "D2/8 r/8 [D3 Bb3]/16 C#3/16 D3/16.~ D3/32t r/64t F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t",
 "F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t",
 "D2/8 r/8 [D3 Bb3]/16 C#3/16 D3/16.~ D3/32t r/64t F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t",
 "F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t",
 "D2/8 r/8 [D3 Bb3]/16 C#3/16 D3/16.~ D3/32t r/64t F#2/8 r/8 [C#3 Bb3]/16 C3/16 C#3/16.~ C#3/32t r/64t",
 "B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t D3/16~ D3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t D3/16~ D3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t",
 "B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t C#3/16~ C#3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t C3/16~ C3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t",
 "B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t D3/16~ D3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t D3/16~ D3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t",
 "D2/16~ D2/64t r/64t Ab2/16~ Ab2/64t r/64t A2/16~ A2/64t r/64t F#3/16~ F#3/64t r/64t Ab2/16~ Ab2/64t r/64t A2/16~ A2/64t r/64t D2/16~ D2/64t r/64t Ab2/16~ Ab2/64t r/64t A2/16~ A2/64t r/64t F#3/16~ F#3/64t r/64t Ab2/16~ Ab2/64t r/64t A2/16~ A2/64t r/64t",
 "B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t D3/16~ D3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t D3/16~ D3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t",
 "B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t D3/16~ D3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t D3/16~ D3/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t",
 "B1/16~ B1/64t r/64t F2/16~ F2/64t r/64t F#2/16~ F#2/64t r/64t [B2 B3]/8 r/8 [A2 B2 A3]/8 r/8 [G2 B2 G3]/8 r/8",
 "[F#2 B2 F#3]/8.~ [F#2 B2 F#3]/32 r/32 [E2 B2 E3]/8.~ [E2 B2 E3]/32 r/32 [D2 B2 D3]/8.~ [D2 B2 D3]/32 r/32 [C#2 B2 C#3]/8.~ [C#2 B2 C#3]/32 r/32",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[D2 D3]/16.~ [D2 D3]/32t r/64t C#3/16 r/16 B2/16 r/16 A2/16 r/16 [D2 D3]/16.~ [D2 D3]/32t r/64t C#3/16 r/16 B2/16 r/16 A2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[F#2 F#3]/16.~ [F#2 F#3]/32t r/64t E3/16 r/16 D3/16 r/16 C#3/16 r/16 [F#2 F#3]/16.~ [F#2 F#3]/32t r/64t E3/16 r/16 D3/16 r/16 C#3/16 r/16",
 "[D2 D3]/16.~ [D2 D3]/32t r/64t C#3/16 r/16 D3/16 r/16 E3/16 r/16 [F#2 F#3]/16.~ [F#2 F#3]/32t r/64t E3/16 r/16 D3/16 r/16 C#3/16 r/16",
 "[F#2 F#3]/16.~ [F#2 F#3]/32t r/64t E3/16 r/16 D3/16 r/16 C#3/16 r/16 [F#2 F#3]/16.~ [F#2 F#3]/32t r/64t E3/16 r/16 D3/16 r/16 C#3/16 r/16",
 "[D2 D3]/16.~ [D2 D3]/32t r/64t C#3/16 r/16 D3/16 r/16 E3/16 r/16 [F#2 F#3]/16.~ [F#2 F#3]/32t r/64t E3/16 r/16 D3/16 r/16 C#3/16 r/16",
 "[F#2 F#3]/16.~ [F#2 F#3]/32t r/64t F3/16 r/16 Eb3/16 r/16 C#3/16 r/16 [F#2 F#3]/16.~ [F#2 F#3]/32t r/64t F3/16 r/16 Eb3/16 r/16 C#3/16 r/16",
 "[Eb2 Eb3]/16.~ [Eb2 Eb3]/32t r/64t C#3/16 r/16 Eb3/16 r/16 F3/16 r/16 [F#2 F#3]/16.~ [F#2 F#3]/32t r/64t F3/16 r/16 Eb3/16 r/16 C#3/16 r/16",
 "[F#2 F#3]/16.~ [F#2 F#3]/32t r/64t F3/16 r/16 Eb3/16 r/16 C#3/16 r/16 [F#2 F#3]/16.~ [F#2 F#3]/32t r/64t F3/16 r/16 Eb3/16 r/16 C#3/16 r/16",
 "[Eb2 Eb3]/16.~ [Eb2 Eb3]/32t r/64t C#3/16 r/16 Eb3/16 r/16 F3/16 r/16 [F#2 F#3]/16.~ [F#2 F#3]/32t r/64t F3/16 r/16 Eb3/16 r/16 C#3/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[D2 D3]/16.~ [D2 D3]/32t r/64t C#3/16 r/16 A2/16 r/16 G2/16 r/16 [D2 D3]/16.~ [D2 D3]/32t r/64t C#3/16 r/16 A2/16 r/16 G2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16 [B1 B2]/16.~ [B1 B2]/32t r/64t A2/16 r/16 G2/16 r/16 F#2/16 r/16",
 "[B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F3 Ab3 B3]/8 r/2 r/8",
 "[B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F3 Ab3 B3]/8 r/2 r/8",
 "[G2 G3]/8.~ [G2 G3]/32 r/32 [D3 G3 B3]/8.~ [D3 G3 B3]/32 r/32 [F#2 F#3]/8.~ [F#2 F#3]/32 r/32 [D3 F#3 B3]/8.~ [D3 F#3 B3]/32 r/32",
 "[F#1 F#2]/8.~ [F#1 F#2]/32 r/32 [C#3 F#3 Bb3]/8.~ [C#3 F#3 Bb3]/32 r/32 [B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F#3 B3]/8.~ [D3 F#3 B3]/32 r/32",
 "[B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F3 Ab3 B3]/8 r/2 r/8",
 "[B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F3 Ab3 B3]/8 r/2 r/8",
 "[G2 G3]/8.~ [G2 G3]/32 r/32 [D3 G3 B3]/8.~ [D3 G3 B3]/32 r/32 [F#2 F#3]/8.~ [F#2 F#3]/32 r/32 [D3 F#3 B3]/8.~ [D3 F#3 B3]/32 r/32",
 "[F#1 F#2]/8.~ [F#1 F#2]/32 r/32 [C#3 F#3 Bb3]/8.~ [C#3 F#3 Bb3]/32 r/32 [B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F#3 B3]/8.~ [D3 F#3 B3]/32 r/32",
 "[B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F3 Ab3 B3]/8 r/2 r/8",
 "[B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F3 Ab3 B3]/8 r/2 r/8",
 "[B1 B2]/8.~ [B1 B2]/32 r/32 [D3 F3 Ab3 B3]/8 r/8 [D3 F3 Ab3 B3]/8 r/8 [D3 F3 Ab3 B3]/8 r/8",
 "[D3 F3 Ab3 B3]/8 r/8 [D3 F3 Ab3 B3]/8 r/8 [D3 F3 Ab3 B3]/8 r/8 [D3 F3 Ab3 B3]/8 r/8",
 "r/2 B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t",
 "B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t B1/16t~ B1/64t r/64t B2/16t~ B2/64t r/64t",
 "[B0 B1]/8.~ [B0 B1]/32 r/32 [B2 D3 F#3 B3]/8 r/2 r/8"
];

const nm = (n) => noteName(n, MIXED);
const NOTE = /\b[A-G](#|b)?-?\d\b/g;
const pitches = (bar) => (bar.match(NOTE) ?? []).map(noteMidi);
const BARS = TOP.length;

// One octave shift per 8-bar phrase (bar 1 on its own), chosen so the lead stays in C3-C7.
const phrases = [[1, 1]];
for (let a = 2; a <= BARS; a += 8) phrases.push([a, Math.min(a + 7, BARS)]);
const shiftOf = new Array(BARS + 1).fill(0);
for (const [a, b] of phrases) {
  const ps = TOP.slice(a - 1, b).flatMap(pitches);
  let by = 0;
  if (ps.length) {
    while (Math.min(...ps) + by < 48) by += 12;
    while (Math.max(...ps) + by > 96) by -= 12;
  }
  for (let n = a; n <= b; n++) shiftOf[n] = by;
}
const lead = TOP.map((bar, i) => transpose(bar, shiftOf[i + 1], nm));
// The second voice moves with the lead, then into the harmony's range note by note if needed.
const fit = (bar, low, high) => bar.replace(NOTE, (n) => { let m = noteMidi(n); while (m < low) m += 12; while (m > high) m -= 12; return nm(m); });
const harmony = SECOND.map((bar, i) => fit(transpose(bar, shiftOf[i + 1], nm), 48, 96));
// The bass keeps the lowest note of each left-hand chord, raised an octave below C1.
const bass = LOW.map((bar) => (bar === 'R' ? bar : bar.replace(/\[([^\]]+)\]/g, (_, ch) => ch.split(' ').sort((x, y) => noteMidi(x) - noteMidi(y))[0]))).map((bar) => fit(bar, 24, 60));

// The march gets busier as it speeds up; a snare roll leads into the last chords.
const drumAt = (n) => {
  if (n <= 17) return 'R';
  if (n <= 33) return 'k/4 h/4 s/4 h/4';
  if (n <= 49) return 'k/8 h/8 s/8 h/8 k/8 h/8 s/8 h/8';
  if (n <= 85) return n % 8 === 2 ? '[k cr]/8 h/8 s/8 h/8 k/8 k/8 s/8 h/8' : 'k/8 h/8 s/8 h/8 k/8 k/8 s/8 h/8';
  if (n <= 87) return Array(16).fill('s/16').join(' ');
  return '[k cr]/4 r/2.';
};
const drums = Array.from({ length: BARS }, (_, i) => drumAt(i + 1));

const SECTIONS = new Map([[1, 'The tune creeps in'], [18, 'Again, the march begins'], [26, 'Higher'],
  [50, 'Faster (più vivo)'], [86, 'The last chords']]);
const DYN = [[1, 70], [18, 80], [26, 88], [42, 92], [50, 100], [66, 110], [86, 118]];
const velBars = (bars, sub) => {
  let last = null;
  return bars.map((bar, i) => {
    const vel = valueAt(DYN, i + 1) - sub;
    const text = bar !== 'R' && vel !== last ? `v=${vel} ${bar}` : bar;
    if (bar !== 'R') last = vel;
    return text;
  });
};
const block = (bars, sub = 0) => writeBlock(velBars(bars, sub), barMarks(SECTIONS));

const text = `# In the Hall of the Mountain King by Edvard Grieg, arranged by Claude and SZ for the Chiptune style.
# Grieg's notes from his piano version, speeding up from start to finish.
title: In the Hall of the Mountain King
composer: Edvard Grieg
arranger: Claude & SZ
about: From Grieg's music for Ibsen's play Peer Gynt (1875). Peer sneaks into the troll king's hall, and the same short theme repeats over and over, faster and louder, as the trolls close in.
year: 1875
source: public-domain
category: classics
key: B minor
style: chiptune
tempo: 100
time: 4/4

@bars 1-49 tempo=100..150
@bars 50-85 tempo=154..210

track lead role=lead vol=0.8
${block(lead)}

track harmony role=lead2 vol=0.5
${block(harmony, 16)}

track bass role=bass
${block(bass, 6)}

track drums role=drums vol=0.7
${block(drums, 10)}
`;
saveSong(out, 'mountain-king.song', text);
console.log(`wrote ${out}/mountain-king.song (${BARS} bars)`);
