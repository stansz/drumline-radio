import { describe, expect, it } from 'vitest';
import { midiName, midiToFreq, parsePitch } from '../src/music/pitch';

describe('parsePitch', () => {
  it('parses natural notes', () => {
    expect(parsePitch('C4')).toBe(60);
    expect(parsePitch('A4')).toBe(69);
    expect(parsePitch('C0')).toBe(12);
    expect(parsePitch('B8')).toBe(119);
  });

  it('parses accidentals', () => {
    expect(parsePitch('Bb3')).toBe(58);
    expect(parsePitch('F#5')).toBe(78);
    expect(parsePitch('Cb4')).toBe(59);
    expect(parsePitch('B#3')).toBe(60);
  });

  it('rejects everything else', () => {
    expect(parsePitch('H4')).toBeNull();
    expect(parsePitch('C9')).toBeNull();
    expect(parsePitch('c4')).toBeNull();
    expect(parsePitch('C#')).toBeNull();
    expect(parsePitch('')).toBeNull();
  });
});

describe('midiToFreq', () => {
  it('maps concert pitch and octaves', () => {
    expect(midiToFreq(69)).toBe(440);
    expect(midiToFreq(81)).toBe(880);
    expect(midiToFreq(57)).toBe(220);
  });
});

describe('midiName', () => {
  it('uses sharps', () => {
    expect(midiName(60)).toBe('C4');
    expect(midiName(61)).toBe('C#4');
    expect(midiName(70)).toBe('A#4');
  });
});
