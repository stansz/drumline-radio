import { describe, expect, it } from 'vitest';
import { encodeWav } from '../src/audio/wav';

function ascii(view: DataView, offset: number, length: number): string {
  let text = '';
  for (let i = 0; i < length; i += 1) text += String.fromCharCode(view.getUint8(offset + i));
  return text;
}

describe('encodeWav', () => {
  it('writes a 16-bit PCM header and interleaved clamped samples', () => {
    const wav = encodeWav([new Float32Array([0, 1, -1]), new Float32Array([0.5, 2, -2])], 44100);
    const view = new DataView(wav);

    expect(wav.byteLength).toBe(44 + 12);
    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(ascii(view, 8, 4)).toBe('WAVE');
    expect(ascii(view, 12, 4)).toBe('fmt ');
    expect(ascii(view, 36, 4)).toBe('data');

    expect(view.getUint32(4, true)).toBe(48);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(28, true)).toBe(176400);
    expect(view.getUint32(40, true)).toBe(12);

    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint16(32, true)).toBe(4);
    expect(view.getUint16(34, true)).toBe(16);

    const samples: number[] = [];
    for (let offset = 44; offset < wav.byteLength; offset += 2) {
      samples.push(view.getInt16(offset, true));
    }
    expect(samples).toEqual([0, 16384, 32767, 32767, -32768, -32768]);
  });

  it('throws for no channels and for channels of different lengths', () => {
    expect(() => encodeWav([], 44100)).toThrow();
    expect(() => encodeWav([new Float32Array(2), new Float32Array(3)], 44100)).toThrow();
  });
});
