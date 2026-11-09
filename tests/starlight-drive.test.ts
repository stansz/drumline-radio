import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chordTones, parseChordMap } from '../src/music/chords';
import { parseSong } from '../src/music/song';
import type { Note, Song } from '../src/music/song';
import { buildTimeline, tickToSeconds } from '../src/music/timing';

// The song is hidden, so it is read from its file rather than from the library.
const text = readFileSync(new URL('../src/songs/starlight-drive.song', import.meta.url), 'utf8');
const parsed = parseSong(text);
const song = (parsed.ok ? parsed.song : null) as Song;
const track = (id: string) => song.tracks.find((part) => part.id === id)!;
const inBars = (id: string, first: number, last: number): Note[] => {
  const start = song.bars[first - 1].startTick;
  const end = song.bars[last - 1].startTick + song.bars[last - 1].ticks;
  return track(id).notes.filter((note) => note.tick >= start && note.tick < end);
};
const signature = (id: string, first: number, last: number) => {
  const start = song.bars[first - 1].startTick;
  return inBars(id, first, last).map((note) => ({
    tick: note.tick - start, ticks: note.ticks, pitches: note.pitches, offset: note.offset ?? 0,
  }));
};

describe('Starlight Drive', () => {
  it('is a credited Synthwave original with the intended length, form, and roles', () => {
    expect(song.meta).toMatchObject({
      title: 'Starlight Drive', composer: 'Ling 3.1 Flash & SZ', source: 'original',
      category: 'originals', style: 'synthwave', key: 'Bb major', tempo: 118, hidden: true,
    });
    expect(song.bars).toHaveLength(120);
    expect(buildTimeline(song).duration).toBeCloseTo(244.068, 1);
    expect(song.tracks.map((part) => part.id)).toEqual([
      'vox', 'saw', 'choir-aah', 'choir-ooh', 'pad', 'stabs', 'arp', 'bass', 'claps', 'drums',
    ]);
    expect(song.tracks.map((part) => part.role)).toEqual([
      'lead', 'lead2', 'pad', 'pad', 'pad', 'chords', 'arp', 'bass', 'drums', 'drums',
    ]);
    // The bank's vox and choirs, asked for by bank id so they keep their sound in every remix.
    expect(track('vox').inst).toBe('bank:vox-lead');
    expect(track('choir-aah').inst).toBe('bank:choir-aah');
    expect(track('choir-ooh').inst).toBe('bank:choir-ooh');
  });

  it('declares the whole form and a chord for every bar', () => {
    const form = [...text.matchAll(/^# Form (\d+)-(\d+): (\w+) - /gm)]
      .map((m) => [Number(m[1]), Number(m[2]), m[3]]);
    expect(form).toEqual([
      [1, 8, 'intro'], [9, 16, 'verse'], [17, 24, 'pre'], [25, 40, 'chorus'],
      [41, 48, 'verse2'], [49, 56, 'pre2'], [57, 72, 'chorus2'], [73, 88, 'breakdown'],
      [89, 96, 'build'], [97, 112, 'final'], [113, 120, 'outro'],
    ]);
    const map = parseChordMap(text)!;
    for (let bar = 1; bar <= 120; bar++) expect(map.chordAt(bar), `bar ${bar}`).not.toBeNull();
  });

  it('keeps the hook in the vox-lead register, and only in the vocal sections', () => {
    const notes = track('vox').notes;
    expect(notes.length).toBe(280);
    let within = 0;
    for (const note of notes) {
      for (const p of note.pitches) expect(p).toBeGreaterThanOrEqual(57); // A3
      if (Math.max(...note.pitches) <= 69) within += 1; // A4
    }
    expect(within / notes.length).toBeGreaterThan(0.9); // mostly A3-A4; only the final chorus peaks at B4
    for (const [a, b] of [[1, 24], [41, 56], [89, 96], [113, 120]]) {
      expect(inBars('vox', a, b)).toHaveLength(0);
    }
    for (const [a, b] of [[25, 40], [57, 72], [73, 88], [97, 112]]) {
      expect(inBars('vox', a, b).length).toBeGreaterThan(0);
    }
  });

  it('repeats the hook exactly, softer in the breakdown, and up a whole step in the final chorus', () => {
    expect(signature('vox', 57, 62)).toEqual(signature('vox', 25, 30));
    expect(signature('vox', 65, 70)).toEqual(signature('vox', 33, 38));
    expect(signature('vox', 73, 78)).toEqual(signature('vox', 25, 30));
    expect(signature('vox', 81, 86)).toEqual(signature('vox', 33, 38));
    expect(inBars('vox', 73, 78).reduce((s, n) => s + n.velocity, 0) / inBars('vox', 73, 78).length)
      .toBeLessThan(inBars('vox', 25, 30).reduce((s, n) => s + n.velocity, 0) / inBars('vox', 25, 30).length);
    // Final chorus: the same hook, every pitch two semitones up (the file already holds it transposed).
    const expected = signature('vox', 25, 30).map((note) => ({
      ...note, pitches: note.pitches.map((p) => p + 2),
    }));
    expect(signature('vox', 97, 102)).toEqual(expected);
  });

  it('moves the last chorus up a whole step to C major, with every pitched part on C-major pitches', () => {
    const cMajor = new Set([0, 2, 4, 5, 7, 9, 11]);
    for (const part of song.tracks) {
      if (part.role === 'drums') continue;
      for (const note of inBars(part.id, 97, 112)) {
        for (const p of note.pitches) {
          expect(cMajor.has(((p % 12) + 12) % 12), `${part.id} bar 97-112 MIDI ${p}`).toBe(true);
        }
      }
    }
  });

  it('drops the kick, bass, stabs, and arp in the breakdown', () => {
    for (const number of [73, 80, 88]) {
      const kicks = inBars('drums', number, number).filter((note) => note.pitches.includes(36));
      expect(kicks).toHaveLength(0);
    }
    for (const id of ['bass', 'stabs', 'arp']) {
      expect(inBars(id, 73, 88)).toHaveLength(0);
    }
    for (const id of ['vox', 'choir-aah', 'pad']) {
      expect(inBars(id, 73, 88).length).toBeGreaterThan(0);
    }
  });

  it('has the choirs trading back and forth, and the saw answering above the hook', () => {
    const sings = (id: string, bar: number) => inBars(id, bar, bar).length > 0;
    // Verses: ooh calls and aah answers a bar later (aah first in verse 2), together on the last F.
    for (const [first, call, answer] of [[9, 'choir-ooh', 'choir-aah'], [41, 'choir-aah', 'choir-ooh']] as const) {
      for (let bar = first; bar < first + 6; bar += 2) {
        expect(sings(call, bar) && !sings(answer, bar), `bar ${bar}`).toBe(true);
        expect(sings(answer, bar + 1) && !sings(call, bar + 1), `bar ${bar + 1}`).toBe(true);
      }
      expect(sings(call, first + 6) && sings(answer, first + 6)).toBe(true);
    }
    // Choruses and the breakdown: both choirs held together, a chord a bar.
    for (let bar = 25; bar <= 112; bar++) {
      if ((bar >= 41 && bar <= 56) || (bar >= 89 && bar <= 96)) continue;
      expect(sings('choir-aah', bar) && sings('choir-ooh', bar), `bar ${bar}`).toBe(true);
    }
    // The saw riff plays over the verses and the outro too.
    for (const [a, b] of [[9, 16], [41, 48], [113, 120]]) expect(inBars('saw', a, b).length).toBeGreaterThan(0);
    // The saw plays only between the hook phrases, never with it.
    for (const [a, b] of [[25, 30], [33, 38], [57, 62], [65, 70], [73, 88], [97, 102], [105, 110]]) {
      expect(inBars('saw', a, b)).toHaveLength(0);
    }
    for (const [a, b] of [[31, 32], [39, 40], [63, 64], [71, 72], [103, 104], [111, 112]]) {
      expect(inBars('saw', a, b).length).toBeGreaterThan(0);
    }
    for (const note of track('saw').notes) {
      for (const p of note.pitches) expect(p).toBeGreaterThanOrEqual(67); // G4 and up, above the hook
    }
  });

  it('keeps every sustained on-beat note on the bar chord, with no semitone clashes', () => {
    const map = parseChordMap(text)!;
    const timeline = buildTimeline(song);
    const minSeconds = 0.3;
    let offChord = 0;
    for (let ti = 0; ti < song.tracks.length; ti++) {
      const part = song.tracks[ti];
      if (part.role === 'drums') continue;
      for (const note of part.notes) {
        const length = tickToSeconds(song, note.tick + note.ticks) - tickToSeconds(song, note.tick);
        if (length < minSeconds) continue;
        const bar = song.bars.find((b) => note.tick >= b.startTick && note.tick < b.startTick + b.ticks)!;
        if ((note.tick - bar.startTick) % 960 !== 0) continue;
        const chord = map.chordAt(bar.number);
        const tones = chord ? chordTones(chord) : null;
        if (!tones) continue;
        if (note.pitches.some((p) => !tones.includes(((p % 12) + 12) % 12))) offChord += 1;
      }
    }
    expect(offChord).toBe(0);
    const checked = new Set(
      song.tracks.flatMap((t, i) => (t.role !== 'pad' && t.role !== 'bass' && t.role !== 'drums' ? [i] : [])),
    );
    const under = new Set(
      song.tracks.flatMap((t, i) => (t.role === 'pad' || t.role === 'bass' ? [i] : [])),
    );
    let clashes = 0;
    for (const note of timeline.notes) {
      if (!checked.has(note.track) || note.duration < minSeconds) continue;
      for (const other of timeline.notes) {
        if (!under.has(other.track)) continue;
        if (other.start > note.start + 1e-6 || other.start + other.duration <= note.start + 1e-6) continue;
        for (const a of note.pitches) {
          for (const b of other.pitches) {
            if ((((a - b) % 12) + 12) % 12 === 1) clashes += 1;
          }
        }
      }
    }
    expect(clashes).toBe(0);
  });

  it('pushes the notes around for feel, with uneven hats and arp', () => {
    const vox = track('vox').notes;
    expect(vox.some((note) => (note.offset ?? 0) > 0)).toBe(true);
    expect(vox.some((note) => (note.offset ?? 0) < 0)).toBe(true);
    // Stabs land late; hats and the bass push early.
    expect(track('stabs').notes.every((note) => (note.offset ?? 0) >= 10)).toBe(true);
    const hats = track('drums').notes.filter((note) => note.pitches.includes(42) || note.pitches.includes(46));
    expect(hats.some((note) => (note.offset ?? 0) < 0)).toBe(true);
    expect(track('bass').notes.some((note) => (note.offset ?? 0) < 0)).toBe(true);
    // Uneven velocities within one bar of hats and of arp.
    const hatBar = hats.filter((note) => note.tick >= song.bars[24].startTick && note.tick < song.bars[24].startTick + 3840);
    expect(new Set(hatBar.map((note) => note.velocity)).size).toBeGreaterThan(2);
    const arpBar = track('arp').notes.filter((note) => note.tick >= song.bars[24].startTick && note.tick < song.bars[24].startTick + 3840);
    expect(new Set(arpBar.map((note) => note.velocity)).size).toBeGreaterThan(2);
  });
});
