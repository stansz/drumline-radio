// Chord symbols and a song's `# chords:` comment lines. A song can declare its progression once,
// one symbol per bar, and the song checker reports long notes that fall outside the bar's chord
// (an "off-chord" report, like the clash count). Free of the DOM and Web Audio.

/** Pitch classes (0 = C … 11 = B) of a chord symbol, or null for no chord ("-" or "N.C.").
 *  Throws an Error naming the symbol if it can't be read. */
export function chordTones(symbol: string): number[] | null {
  const text = symbol.trim();
  if (text === '-' || text === 'N.C.') return null;

  const slash = text.indexOf('/');
  const head = slash < 0 ? text : text.slice(0, slash);
  if (slash >= 0) {
    const bass = text.slice(slash + 1);
    // The slash bass note is ignored for the chord tones, but it must be a valid root.
    rootPitch(bass, symbol);
  }

  const match = /^([A-G][#b]?)(.*)$/.exec(head);
  if (!match) throw new Error(`cannot read chord symbol '${symbol}'`);
  const root = rootPitch(match[1], symbol);
  const quality = match[2];
  const intervals = QUALITIES[quality];
  if (!intervals) throw new Error(`unknown chord quality '${quality}' in '${symbol}'`);

  const tones = intervals.map((interval) => (root + interval) % 12);
  return Array.from(new Set(tones)).sort((a, b) => a - b);
}

export interface ChordMap {
  /** The chord symbol for a 1-based bar number, or null when the song declares no chord there. */
  chordAt(bar: number): string | null;
}

/** Reads the `# chords:` comment lines of a song's text. Returns null when there are none.
 *  Throws an Error naming the line for a bad line or symbol. */
export function parseChordMap(text: string): ChordMap | null {
  const lines = text.split(/\r?\n/);
  const entries: ChordLine[] = [];

  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (!trimmed.startsWith('# chords')) continue;
    const lineNumber = index + 1;
    const match = /^# chords(?:\s+@(\d+))?\s*:\s*(.*)$/.exec(trimmed);
    if (!match) throw new Error(`line ${lineNumber}: cannot read chord line '${trimmed}'`);

    const start = match[1] === undefined ? 1 : Number(match[1]);
    if (start < 1) throw new Error(`line ${lineNumber}: chord bar ${start} is not 1 or more`);

    const symbols = match[2].split(/\s+/).filter((token) => token !== '' && token !== '|');
    if (symbols.length === 0) {
      throw new Error(`line ${lineNumber}: chord line has no chord symbols`);
    }
    for (const symbol of symbols) {
      try {
        chordTones(symbol);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`line ${lineNumber}: ${message}`);
      }
    }

    const previous = entries[entries.length - 1];
    if (previous && start <= previous.start) {
      throw new Error(`line ${lineNumber}: chord bar ${start} is not after bar ${previous.start}`);
    }
    entries.push({ start, symbols });
  }

  if (entries.length === 0) return null;
  return {
    chordAt(bar: number): string | null {
      let entry: ChordLine | null = null;
      for (const candidate of entries) {
        if (candidate.start > bar) break;
        entry = candidate;
      }
      if (!entry) return null;
      const symbol = entry.symbols[(bar - entry.start) % entry.symbols.length];
      return chordTones(symbol) === null ? null : symbol;
    },
  };
}

interface ChordLine {
  start: number;
  symbols: string[];
}

const ROOTS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  sus: [0, 5, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  add9: [0, 2, 4, 7],
  madd9: [0, 2, 3, 7],
  '9': [0, 2, 4, 7, 10],
  m9: [0, 2, 3, 7, 10],
  maj9: [0, 2, 4, 7, 11],
};

function rootPitch(note: string, symbol: string): number {
  const match = /^([A-G])([#b]?)$/.exec(note);
  if (!match) throw new Error(`cannot read chord symbol '${symbol}'`);
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return (ROOTS[match[1]] + accidental + 12) % 12;
}
