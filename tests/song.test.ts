import { describe, expect, it } from 'vitest';
import fixture from './fixtures/features.song?raw';
import { parseSong } from '../src/music/song';
import type { Song } from '../src/music/song';

const HEADER = [
  'title: T',
  'composer: original',
  'year: 2026',
  'source: original',
  'category: originals',
  'style: chiptune',
  'key: C major',
  'tempo: 120',
  'time: 4/4',
].join('\n');

function parseFixture(): Song {
  const result = parseSong(fixture);
  if (!result.ok) throw new Error(`fixture failed to parse: ${result.errors.join('; ')}`);
  return result.song;
}

function errorsFor(body: string): string[] {
  const result = parseSong(`${HEADER}\n${body}`);
  if (result.ok) return [];
  return result.errors;
}

describe('the format fixture', () => {
  it('parses', () => {
    expect(parseSong(fixture).ok).toBe(true);
  });

  it('reads the header', () => {
    const song = parseFixture();
    expect(song.meta.title).toBe('Fixture');
    expect(song.meta.style).toBe('synthwave');
    expect(song.meta.source).toBe('original');
    expect(song.meta.tempo).toBe(120);
    expect(song.meta.time).toEqual([4, 4]);
    expect(song.meta.pickupTicks).toBe(960);
  });

  it('builds the bars', () => {
    const song = parseFixture();
    expect(song.bars).toEqual([
      { number: 0, startTick: 0, ticks: 960, time: [4, 4], tempo: 120 },
      { number: 1, startTick: 960, ticks: 3840, time: [4, 4], tempo: 120 },
      { number: 2, startTick: 4800, ticks: 3840, time: [4, 4], tempo: 100 },
      { number: 3, startTick: 8640, ticks: 3840, time: [4, 4], tempo: 120 },
      { number: 4, startTick: 12480, ticks: 2880, time: [3, 4], tempo: 140 },
    ]);
    expect(song.totalTicks).toBe(15360);
  });

  it('reads the lead track', () => {
    const song = parseFixture();
    const mel = song.tracks[0];
    expect(mel.id).toBe('mel');
    expect(mel.role).toBe('lead');
    expect(mel.inst).toBe('saw-lead');
    expect(mel.vol).toBe(0.7);
    expect(mel.pan).toBe(-0.25);
    expect(mel.notes.length).toBe(11);
    expect(mel.notes[0]).toEqual({
      tick: 0,
      ticks: 960,
      pitches: [67],
      velocity: 100,
      staccato: false,
    });
    expect(mel.notes[4].pitches).toEqual([84]);
    expect(mel.notes[4].tick).toBe(3840);
    expect(mel.notes[5]).toEqual({
      tick: 4800,
      ticks: 2880,
      pitches: [60, 64, 67],
      velocity: 100,
      staccato: false,
    });
    expect(mel.notes[6]).toEqual({
      tick: 8640,
      ticks: 480,
      pitches: [74],
      velocity: 70,
      staccato: false,
    });
    expect(mel.notes[8]).toEqual({
      tick: 9600,
      ticks: 960,
      pitches: [76],
      velocity: 70,
      staccato: true,
    });
    expect(mel.notes[9]).toEqual({
      tick: 10560,
      ticks: 2880,
      pitches: [77],
      velocity: 70,
      staccato: false,
    });
    expect(mel.notes[10]).toEqual({
      tick: 13440,
      ticks: 1920,
      pitches: [79],
      velocity: 120,
      staccato: false,
    });
  });

  it('reads the bass track', () => {
    const song = parseFixture();
    const bass = song.tracks[1];
    expect(bass.id).toBe('bass');
    expect(bass.inst).toBeNull();
    expect(bass.vol).toBe(0.8);
    expect(bass.pan).toBe(0);
    expect(bass.notes).toEqual([
      { tick: 960, ticks: 3840, pitches: [36], velocity: 100, staccato: false },
      { tick: 10560, ticks: 2880, pitches: [43], velocity: 100, staccato: false },
    ]);
  });

  it('reads the drum track', () => {
    const song = parseFixture();
    const beat = song.tracks[2];
    expect(beat.notes.length).toBe(28);
    expect(beat.notes[0].tick).toBe(0);
    expect(beat.notes[0].pitches).toEqual([42]);
    expect(beat.notes[1].tick).toBe(960);
    expect(beat.notes[1].pitches).toEqual([36, 42]);
    expect(beat.notes[1].ticks).toBe(480);
    expect(beat.notes[17].tick).toBe(8640);
    expect(beat.notes[17].pitches).toEqual([36, 42]);
    const last = beat.notes[beat.notes.length - 1];
    expect(last.tick).toBe(14400);
    expect(last.ticks).toBe(960);
    expect(last.pitches).toEqual([36, 49]);
  });
});

describe('the checker', () => {
  it('reports a bar that is too long', () => {
    const errors = errorsFor('track a role=lead\n| C4/4 C4 C4 C4 C4 |');
    expect(errors).toContain('line 11: track a bar 1 is 4800 ticks, expected 3840');
  });

  it('collects several bar errors', () => {
    const errors = errorsFor('track a role=lead\n| C4/2 | C4/1 C4/4 |');
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects a note outside the role range', () => {
    expect(errorsFor('track b role=bass\n| C6/1 |').some((e) => e.includes('out of range'))).toBe(true);
  });

  it('rejects tracks with different bar counts', () => {
    const errors = errorsFor('track a role=lead\n| C4/1 | C4/1 |\ntrack b role=bass\n| C2/1 |');
    expect(errors.some((e) => e.includes('bar count'))).toBe(true);
  });

  it('rejects an unknown role', () => {
    expect(errorsFor('track a role=kazoo\n| C4/1 |').some((e) => e.includes('unknown role'))).toBe(true);
  });

  it('rejects drums and note names in the wrong track', () => {
    expect(errorsFor('track a role=lead\n| k/1 |').some((e) => e.includes('drum'))).toBe(true);
    expect(errorsFor('track a role=drums\n| C4/1 |').some((e) => e.includes('drum'))).toBe(true);
  });

  it('rejects broken ties', () => {
    expect(errorsFor('track a role=lead\n| C4/2~ D4/2 |').some((e) => e.includes('tie'))).toBe(true);
    expect(errorsFor('track a role=lead\n| C4/1~ |').some((e) => e.includes('tie'))).toBe(true);
    expect(errorsFor('track a role=lead\n| C4/2~ r/2 |').some((e) => e.includes('tie'))).toBe(true);
  });

  it('reports a missing title', () => {
    const withoutTitle = HEADER.split('\n').slice(1).join('\n');
    const result = parseSong(`${withoutTitle}\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('missing title'))).toBe(true);
  });

  it('reports a missing category', () => {
    const withoutCategory = HEADER.split('\n')
      .filter((line) => !line.startsWith('category:'))
      .join('\n');
    const result = parseSong(`${withoutCategory}\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('missing category'))).toBe(true);
  });

  it('rejects an unknown category', () => {
    const jazz = `${HEADER.replace('category: originals', 'category: jazz')}\ntrack a role=lead\n| C4/1 |`;
    const result = parseSong(jazz);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("unknown category 'jazz'"))).toBe(true);
  });

  it('rejects an unknown style', () => {
    const polka = `${HEADER.replace('style: chiptune', 'style: polka')}\ntrack a role=lead\n| C4/1 |`;
    const result = parseSong(polka);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('unknown style'))).toBe(true);
  });

  it('quotes unrecognised tokens', () => {
    expect(errorsFor('track a role=lead\n| C4/4 X9 C4 C4 C4 |').some((e) => e.includes('X9'))).toBe(true);
  });

  it('quotes a bad duration', () => {
    expect(errorsFor('track a role=lead\n| C4/3 C4/2 |').some((e) => e.includes('C4/3'))).toBe(true);
  });

  it('rejects a pickup bar of the wrong length', () => {
    const result = parseSong(
      `${HEADER}\npickup: /4\ntrack a role=lead\n| C4/2 | C4/1 |`,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('track a bar 0'))).toBe(true);
  });

  it('rejects % as the first bar', () => {
    const errors = errorsFor('track a role=lead\n| % |');
    expect(errors.some((e) => e.includes('%'))).toBe(true);
  });

  it('rejects nested groups', () => {
    expect(
      errorsFor('track a role=lead\n| { { C4/1 }*2 }*2 |').some((e) => e.includes('nested')),
    ).toBe(true);
  });

  it('rejects a directive past the last bar', () => {
    const result = parseSong(`${HEADER}\n@bar 9 tempo=90\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('bar 9'))).toBe(true);
  });

  it('rejects a duplicate track id', () => {
    const errors = errorsFor('track a role=lead\n| C4/1 |\ntrack a role=bass\n| C2/1 |');
    expect(errors.some((e) => e.includes('duplicate track'))).toBe(true);
  });

  it('rejects a bad volume or pan', () => {
    expect(errorsFor('track a role=lead vol=1.5\n| C4/1 |').some((e) => e.includes('vol'))).toBe(true);
    expect(errorsFor('track a role=lead pan=-2\n| C4/1 |').some((e) => e.includes('pan'))).toBe(true);
  });

  it('rejects a bad velocity', () => {
    expect(errorsFor('track a role=lead\n| C4/1:0 |').some((e) => e.includes('velocity'))).toBe(true);
    expect(errorsFor('track a role=lead\n| C4/1:128 |').some((e) => e.includes('velocity'))).toBe(true);
  });

  it('prefixes every error with its line number', () => {
    const bodies = [
      'track a role=lead\n| C4/4 C4 C4 C4 C4 |',
      'track a role=lead\n| C4/2 | C4/1 C4/4 |',
      'track b role=bass\n| C6/1 |',
      'track a role=lead\n| C4/1 | C4/1 |\ntrack b role=bass\n| C2/1 |',
      'track a role=kazoo\n| C4/1 |',
      'track a role=lead\n| k/1 |',
      'track a role=lead\n| C4/2~ D4/2 |',
      'track a role=lead\n| C4/4 X9 C4 C4 C4 |',
      'track a role=lead\n| C4/3 C4/2 |',
      'track a role=lead\n| % |',
      'track a role=lead\n| { { C4/1 }*2 }*2 |',
      'track a role=lead\n| C4/1 |\ntrack a role=bass\n| C2/1 |',
      'track a role=lead vol=1.5\n| C4/1 |',
      'track a role=lead\n| C4/1:0 |',
    ];
    const collected = bodies.flatMap((body) => errorsFor(body));
    const withoutTitle = parseSong(`${HEADER.split('\n').slice(1).join('\n')}\ntrack a role=lead\n| C4/1 |`);
    if (!withoutTitle.ok) collected.push(...withoutTitle.errors);
    const polka = parseSong(`${HEADER.replace('style: chiptune', 'style: polka')}\ntrack a role=lead\n| C4/1 |`);
    if (!polka.ok) collected.push(...polka.errors);
    const pickup = parseSong(`${HEADER}\npickup: /4\ntrack a role=lead\n| C4/2 | C4/1 |`);
    if (!pickup.ok) collected.push(...pickup.errors);
    const lateDirective = parseSong(`${HEADER}\n@bar 9 tempo=90\ntrack a role=lead\n| C4/1 |`);
    if (!lateDirective.ok) collected.push(...lateDirective.errors);

    expect(collected.length).toBeGreaterThan(0);
    for (const error of collected) expect(error).toMatch(/^line \d+: /);
  });
});

describe('the parser', () => {
  it('handles triplets, dotted values, and rest repeats', () => {
    const result = parseSong(
      `${HEADER}\ntrack a role=lead\n| C4/8t C4 C4 C4/8t C4 C4 C4/2 |\n| C4/4.. C4/16 C4/2 |\ntrack b role=bass\n| R*2 |`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const song = result.song;
    expect(song.tracks[0].notes[0].ticks).toBe(320);
    expect(song.tracks[0].notes[7].ticks).toBe(1680);
    expect(song.tracks[1].notes).toEqual([]);
    expect(song.bars.length).toBe(2);
  });

  it('handles comments and CRLF line endings', () => {
    const text = `${HEADER}\ntrack a role=lead\n| C4/1 | # comment\n| [E4 C4 E4]/1 |`.replace(/\n/g, '\r\n');
    const result = parseSong(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.song.tracks[0].notes[1].pitches).toEqual([60, 64]);
  });

  it('merges a tied chain', () => {
    const result = parseSong(`${HEADER}\ntrack a role=lead\n| C4/4~ C4/4~ C4/2 |`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const notes = result.song.tracks[0].notes;
    expect(notes.length).toBe(1);
    expect(notes[0].ticks).toBe(3840);
  });
});

describe('bends', () => {
  function leadNotes(body: string) {
    const result = parseSong(`${HEADER}\n${body}`);
    if (!result.ok) throw new Error(`failed to parse: ${result.errors.join('; ')}`);
    return result.song.tracks[0].notes;
  }

  it('merges a bend into one note', () => {
    const notes = leadNotes('track a role=lead\n| G4/2^ A4/2 |');
    expect(notes.length).toBe(1);
    expect(notes[0].tick).toBe(0);
    expect(notes[0].ticks).toBe(3840);
    expect(notes[0].pitches).toEqual([67]);
    expect(notes[0].bends).toEqual([{ at: 1920, pitch: 69 }]);
  });

  it('chains bends up and back', () => {
    const notes = leadNotes('track a role=lead\n| G4/8^ A4/8^ G4/4 r/2 |');
    expect(notes.length).toBe(1);
    expect(notes[0].ticks).toBe(1920);
    expect(notes[0].bends).toEqual([
      { at: 480, pitch: 69 },
      { at: 960, pitch: 67 },
    ]);
  });

  it('holds a tie and then bends it', () => {
    const notes = leadNotes('track a role=lead\n| G4/4~ G4/4^ A4/2 |');
    expect(notes.length).toBe(1);
    expect(notes[0].ticks).toBe(3840);
    expect(notes[0].bends).toEqual([{ at: 1920, pitch: 69 }]);
  });

  it('bends and then holds a tie', () => {
    const notes = leadNotes('track a role=lead\n| G4/8^ A4/8~ A4/2 r/4 |');
    expect(notes.length).toBe(1);
    expect(notes[0].ticks).toBe(2880);
    expect(notes[0].bends).toEqual([{ at: 480, pitch: 69 }]);
  });

  it('bends across a bar line', () => {
    const notes = leadNotes('track a role=lead\n| G4/1^ |\n| A4/1 |');
    expect(notes.length).toBe(1);
    expect(notes[0].ticks).toBe(7680);
    expect(notes[0].bends).toEqual([{ at: 3840, pitch: 69 }]);
  });

  it('leaves notes without bends without a bends key', () => {
    const notes = leadNotes('track a role=lead\n| G4/1 |');
    expect(notes[0]).toEqual({
      tick: 0,
      ticks: 3840,
      pitches: [67],
      velocity: 100,
      staccato: false,
    });
    expect('bends' in notes[0]).toBe(false);
  });

  it('keeps the first note velocity and staccato', () => {
    const notes = leadNotes("track a role=lead\n| G4/4':80^ A4/4 r/2 |");
    expect(notes[0].velocity).toBe(80);
    expect(notes[0].staccato).toBe(true);
  });

  it('rejects a bend from a chord', () => {
    const errors = errorsFor('track a role=lead\n| [C4 E4]/2^ A4/2 |');
    expect(errors).toContain('line 11: bend from a chord in track a');
  });

  it('rejects a bend to a chord', () => {
    const errors = errorsFor('track a role=lead\n| C4/2^ [E4 G4]/2 |');
    expect(errors).toContain('line 11: bend to a chord in track a');
  });

  it('rejects a bend into a rest', () => {
    expect(errorsFor('track a role=lead\n| C4/2^ r/2 |')).toContain(
      'line 11: bend into a rest in track a',
    );
    expect(errorsFor('track a role=lead\n| C4/1^ | R |')).toContain(
      'line 11: bend into a rest in track a',
    );
    expect(errorsFor('track a role=lead\n| C4/1^ | R*2 |')).toContain(
      'line 11: bend into a rest in track a',
    );
  });

  it('rejects a bend with no following note', () => {
    expect(errorsFor('track a role=lead\n| C4/1^ |')).toContain(
      'line 11: bend has no following note in track a',
    );
  });

  it('rejects a bend in a drums track', () => {
    expect(errorsFor('track a role=drums\n| k/4^ s/4 k s |')).toContain(
      'line 11: bend in a drums track a',
    );
  });

  it('rejects a tie and a bend on the same note', () => {
    expect(errorsFor('track a role=lead\n| G4/8~^ A4/1 |').some((e) => e.includes('G4/8~^'))).toBe(
      true,
    );
    expect(errorsFor('track a role=lead\n| G4/8^~ A4/1 |').some((e) => e.includes('G4/8^~'))).toBe(
      true,
    );
  });
});

describe('micro-timing offsets', () => {
  function leadNotes(body: string) {
    const result = parseSong(`${HEADER}\n${body}`);
    if (!result.ok) throw new Error(`failed to parse: ${result.errors.join('; ')}`);
    return result.song.tracks[0].notes;
  }

  it('reads a positive and a negative offset', () => {
    expect(leadNotes('track a role=lead\n| C4/1+18 |')[0].offset).toBe(18);
    expect(leadNotes('track a role=lead\n| C4/1-10 |')[0].offset).toBe(-10);
  });

  it('leaves an offset key off a note without one', () => {
    const note = leadNotes('track a role=lead\n| C4/1 |')[0];
    expect('offset' in note).toBe(false);
  });

  it('combines with staccato, velocity, and a tie', () => {
    const note = leadNotes("track a role=lead\n| C4/8'+12:90~ C4/8 r/2 r/4 |")[0];
    expect(note.offset).toBe(12);
    expect(note.staccato).toBe(true);
    expect(note.velocity).toBe(90);
    expect(note.ticks).toBe(960);
  });

  it('applies to a chord', () => {
    const note = leadNotes('track a role=lead\n| [C4 E4 G4]/2+24:88 r/2 |')[0];
    expect(note.offset).toBe(24);
    expect(note.pitches).toEqual([60, 64, 67]);
  });

  it('applies to a drum token', () => {
    const result = parseSong(`${HEADER}\ntrack a role=drums\n| s/8-10 h h h h h h h |`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.song.tracks[0].notes[0].offset).toBe(-10);
  });

  it('accepts the limit and rejects one tick past it', () => {
    expect(leadNotes('track a role=lead\n| C4/1+240 |')[0].offset).toBe(240);
    expect(leadNotes('track a role=lead\n| C4/1-240 |')[0].offset).toBe(-240);
    expect(
      errorsFor('track a role=lead\n| C4/1+241 |').some((e) => e.includes('outside -240..240')),
    ).toBe(true);
    expect(
      errorsFor('track a role=lead\n| C4/1-241 |').some((e) => e.includes('outside -240..240')),
    ).toBe(true);
  });

  it('rejects a malformed offset', () => {
    expect(errorsFor('track a role=lead\n| C4/1+x |').some((e) => e.includes('invalid offset'))).toBe(
      true,
    );
  });

  it('rejects an offset on a tie or bend continuation', () => {
    expect(
      errorsFor('track a role=lead\n| C4/4~ C4/4+10 C4/2 |').some((e) =>
        e.includes('offset on a tie or bend continuation'),
      ),
    ).toBe(true);
    expect(
      errorsFor('track a role=lead\n| G4/8^ A4/4+10 r/2 r/8 |').some((e) =>
        e.includes('offset on a tie or bend continuation'),
      ),
    ).toBe(true);
  });

  it('rejects an offset on a rest', () => {
    expect(errorsFor('track a role=lead\n| r/4+10 C4/1 |').length).toBeGreaterThan(0);
  });
});

describe('the arranger header', () => {
  it('reads an optional arranger', () => {
    const result = parseSong(`${HEADER}\narranger: Claude & SZ\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.song.meta.arranger).toBe('Claude & SZ');
  });

  it('defaults to null without the line', () => {
    const result = parseSong(`${HEADER}\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.song.meta.arranger).toBeNull();
  });

  it('rejects an empty arranger', () => {
    const result = parseSong(`${HEADER}\narranger:\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('arranger must not be empty'))).toBe(true);
  });
});

describe('the about header', () => {
  it('reads an optional about', () => {
    const result = parseSong(`${HEADER}\nabout: Some story.\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.song.meta.about).toBe('Some story.');
  });

  it('defaults to null without the line', () => {
    const result = parseSong(`${HEADER}\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.song.meta.about).toBeNull();
  });

  it('rejects an empty about', () => {
    const result = parseSong(`${HEADER}\nabout:\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('about must not be empty'))).toBe(true);
  });
});

describe('the hidden header', () => {
  it('reads hidden: true', () => {
    const result = parseSong(`${HEADER}\nhidden: true\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.song.meta.hidden).toBe(true);
  });

  it('defaults to false without the line', () => {
    const result = parseSong(`${HEADER}\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.song.meta.hidden).toBe(false);
  });

  it('rejects any other value', () => {
    const result = parseSong(`${HEADER}\nhidden: yes\ntrack a role=lead\n| C4/1 |`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes('hidden must be true'))).toBe(true);
  });
});
