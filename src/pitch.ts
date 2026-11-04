const LETTER_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const PITCH_PATTERN = /^[A-G](#|b)?[0-8]$/;

/** Parses a note name like `C4`, `F#5`, or `Bb3` into a MIDI number. */
export function parsePitch(name: string): number | null {
  if (!PITCH_PATTERN.test(name)) return null;
  const letter = name[0];
  const accidental = name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0;
  const octave = Number(name[name.length - 1]);
  return (octave + 1) * 12 + LETTER_SEMITONES[letter] + accidental;
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiName(midi: number): string {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[semitone]}${octave}`;
}
