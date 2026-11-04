import { parsePitch } from './pitch';
import { DRUMS, isRole, isStyle, ROLE_RANGES } from './roles';
import type { PitchedRole, Role, StyleId } from './roles';

export const TICKS_PER_QUARTER = 960;
export const TICKS_PER_WHOLE = 3840;

export const CATEGORIES = ['carols', 'classics', 'originals'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface SongMeta {
  title: string;
  composer: string;
  arranger: string | null;
  year: string;
  source: 'public-domain' | 'original';
  category: Category;
  style: StyleId;
  key: string;
  tempo: number;
  time: [number, number];
  pickupTicks: number;
}

export interface BarInfo {
  number: number;
  startTick: number;
  ticks: number;
  time: [number, number];
  tempo: number;
}

export interface Note {
  tick: number;
  ticks: number;
  pitches: number[];
  velocity: number;
  staccato: boolean;
}

export interface Track {
  id: string;
  role: Role;
  inst: string | null;
  vol: number;
  pan: number;
  notes: Note[];
}

export interface Song {
  meta: SongMeta;
  bars: BarInfo[];
  tracks: Track[];
  totalTicks: number;
}

export type ParseResult = { ok: true; song: Song } | { ok: false; errors: string[] };

const REQUIRED_HEADER_KEYS = [
  'title',
  'composer',
  'year',
  'source',
  'category',
  'style',
  'key',
  'tempo',
  'time',
] as const;

const KNOWN_HEADER_KEYS = new Set<string>([...REQUIRED_HEADER_KEYS, 'pickup', 'arranger']);
const TIME_DENOMINATORS = [1, 2, 4, 8, 16];
const DURATION_NUMBERS = [1, 2, 4, 8, 16, 32, 64];

function ticksForTime(time: readonly [number, number]): number {
  return (time[0] * TICKS_PER_WHOLE) / time[1];
}

function stripComment(line: string): string {
  return line.replace(/(^|\s)#.*$/, '$1');
}

interface SourceToken {
  text: string;
  line: number;
}

function tokenizeLine(line: string, lineNumber: number): SourceToken[] {
  const tokens: SourceToken[] = [];
  const pattern = /\[[^\]]*\]\S*|\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    tokens.push({ text: match[0], line: lineNumber });
  }
  return tokens;
}

const DURATION_PATTERN = /^\/(1|2|4|8|16|32|64)(\.{1,2}|t)?$/;

function durationTicks(text: string): number | null {
  const match = DURATION_PATTERN.exec(text);
  if (!match) return null;
  const base = TICKS_PER_WHOLE / Number(match[1]);
  const suffix = match[2] ?? '';
  const factor = suffix === '.' ? 1.5 : suffix === '..' ? 1.75 : suffix === 't' ? 2 / 3 : 1;
  return Math.round(base * factor);
}

function parseTimeSignature(text: string): [number, number] | null {
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (numerator < 1 || numerator > 32) return null;
  if (!TIME_DENOMINATORS.includes(denominator)) return null;
  return [numerator, denominator];
}

function parseTempo(text: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const tempo = Number(text);
  if (!Number.isFinite(tempo) || tempo < 20 || tempo > 400) return null;
  return tempo;
}

function pitchesEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

type ParsedToken =
  | { kind: 'velocity'; velocity: number }
  | { kind: 'rest'; ticks: number; durationWritten: number | null }
  | {
      kind: 'note';
      pitches: number[];
      ticks: number;
      durationWritten: number | null;
      velocity: number | null;
      staccato: boolean;
      tie: boolean;
    }
  | { kind: 'error'; message: string };

function unrecognised(text: string): ParsedToken {
  return { kind: 'error', message: `unrecognised token '${text}'` };
}

function parseSuffixWithPitches(
  suffix: string,
  pitches: number[],
  fullText: string,
  lastDuration: number,
): ParsedToken {
  let rest = suffix;
  let tickCount = lastDuration;
  let durationWritten: number | null = null;

  if (rest.startsWith('/')) {
    const match = /^\/(\d+)(\.{1,2}|t)?/.exec(rest);
    if (!match) return unrecognised(fullText);
    const ticks = durationTicks(match[0]);
    if (ticks === null) return unrecognised(fullText);
    tickCount = ticks;
    durationWritten = ticks;
    rest = rest.slice(match[0].length);
  }

  let staccato = false;
  if (rest.startsWith("'")) {
    staccato = true;
    rest = rest.slice(1);
  }

  let velocity: number | null = null;
  if (rest.startsWith(':')) {
    const match = /^:(\d+)/.exec(rest);
    if (!match) return { kind: 'error', message: `invalid velocity in '${fullText}'` };
    const value = Number(match[1]);
    if (value < 1 || value > 127) {
      return { kind: 'error', message: `velocity ${value} out of range in '${fullText}'` };
    }
    velocity = value;
    rest = rest.slice(match[0].length);
  }

  let tie = false;
  if (rest.startsWith('~')) {
    tie = true;
    rest = rest.slice(1);
  }

  if (rest !== '') return unrecognised(fullText);

  const unique = Array.from(new Set(pitches)).sort((a, b) => a - b);
  return { kind: 'note', pitches: unique, ticks: tickCount, durationWritten, velocity, staccato, tie };
}

function parseNoteToken(text: string, role: Role, lastDuration: number): ParsedToken {
  if (text.startsWith('v=')) {
    const match = /^v=(\d+)$/.exec(text);
    if (!match) return { kind: 'error', message: `invalid velocity '${text}'` };
    const velocity = Number(match[1]);
    if (velocity < 1 || velocity > 127) {
      return { kind: 'error', message: `velocity ${velocity} out of range in '${text}'` };
    }
    return { kind: 'velocity', velocity };
  }

  if (role === 'drums') {
    const drumName = /^([a-z]+)/.exec(text);
    if (drumName && Object.prototype.hasOwnProperty.call(DRUMS, drumName[1])) {
      const name = drumName[1];
      return parseSuffixWithPitches(
        text.slice(name.length),
        [DRUMS[name]],
        text,
        lastDuration,
      );
    }
  }

  if (text.startsWith('[')) {
    const close = text.indexOf(']');
    if (close < 0) return unrecognised(text);
    const inner = text.slice(1, close).trim();
    const parts = inner.length === 0 ? [] : inner.split(/\s+/);
    if (parts.length === 0) return { kind: 'error', message: `empty chord '${text}'` };
    const pitches: number[] = [];
    for (const part of parts) {
      if (role === 'drums') {
        if (Object.prototype.hasOwnProperty.call(DRUMS, part)) {
          pitches.push(DRUMS[part]);
          continue;
        }
        if (/^[A-G](#|b)?[0-8]$/.test(part)) {
          return { kind: 'error', message: `note name '${part}' is not valid in a drums track` };
        }
        return unrecognised(text);
      }
      const midi = parsePitch(part);
      if (midi !== null) {
        pitches.push(midi);
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(DRUMS, part)) {
        return { kind: 'error', message: `drum name '${part}' is not valid in a pitched track` };
      }
      return unrecognised(text);
    }
    return parseSuffixWithPitches(text.slice(close + 1), pitches, text, lastDuration);
  }

  if (text.startsWith('r')) {
    const match = /^r(\/(1|2|4|8|16|32|64)(\.{1,2}|t)?)?$/.exec(text);
    if (!match) return unrecognised(text);
    if (match[1]) {
      const ticks = durationTicks(match[1]);
      if (ticks === null) return unrecognised(text);
      return { kind: 'rest', ticks, durationWritten: ticks };
    }
    return { kind: 'rest', ticks: lastDuration, durationWritten: null };
  }

  if (role === 'drums') {
    const noteName = /^([A-G](?:#|b)?[0-8])/.exec(text);
    if (noteName) {
      return { kind: 'error', message: `note name '${noteName[1]}' is not valid in a drums track` };
    }
    return unrecognised(text);
  }

  const noteName = /^([A-G](?:#|b)?[0-8])/.exec(text);
  if (noteName) {
    const midi = parsePitch(noteName[1]);
    if (midi === null) return unrecognised(text);
    return parseSuffixWithPitches(text.slice(noteName[1].length), [midi], text, lastDuration);
  }

  const drumName = /^([a-z]+)/.exec(text);
  if (drumName && Object.prototype.hasOwnProperty.call(DRUMS, drumName[1])) {
    return { kind: 'error', message: `drum name '${drumName[1]}' is not valid in a pitched track` };
  }

  return unrecognised(text);
}

interface AssembledBar {
  tokens: SourceToken[];
  line: number;
  fill: boolean;
}

interface RawTrack {
  headerLine: number;
  id: string;
  role: Role;
  inst: string | null;
  vol: number;
  pan: number;
  tokens: SourceToken[];
}

type Directive =
  | { kind: 'set'; line: number; bar: number; tempo?: number; time?: [number, number] }
  | { kind: 'ramp'; line: number; from: number; to: number; tempoA: number; tempoB: number };

export function parseSong(text: string): ParseResult {
  const errors: string[] = [];
  const err = (line: number, message: string) => {
    errors.push(`line ${line}: ${message}`);
  };

  const headerValues = new Map<string, { value: string; line: number }>();
  const rawTracks: RawTrack[] = [];
  const directives: Directive[] = [];
  let inTracks = false;
  let currentTrack: RawTrack | null = null;

  const parseTrackHeader = (trimmed: string, lineNumber: number): RawTrack => {
    const parts = trimmed.split(/\s+/);
    const id = parts[1] ?? '';
    const track: RawTrack = {
      headerLine: lineNumber,
      id,
      role: 'lead',
      inst: null,
      vol: 0.8,
      pan: 0,
      tokens: [],
    };

    if (id === '') {
      err(lineNumber, 'track needs an id');
    } else if (!/^[a-z0-9-]+$/.test(id)) {
      err(lineNumber, `invalid track id '${id}'`);
    } else if (rawTracks.some((existing) => existing.id === id)) {
      err(lineNumber, `duplicate track ${id}`);
    }

    let roleSeen = false;
    for (const part of parts.slice(2)) {
      const equals = part.indexOf('=');
      if (equals < 0) {
        err(lineNumber, `unexpected token '${part}' in track header`);
        continue;
      }
      const key = part.slice(0, equals);
      const value = part.slice(equals + 1);
      if (key === 'role') {
        roleSeen = true;
        if (isRole(value)) track.role = value;
        else err(lineNumber, `unknown role '${value}'`);
      } else if (key === 'inst') {
        if (!/^[a-z0-9-]+$/.test(value)) err(lineNumber, `invalid inst '${value}'`);
        else track.inst = value;
      } else if (key === 'vol') {
        const volume = Number(value);
        if (!/^-?\d+(\.\d+)?$/.test(value) || !Number.isFinite(volume) || volume < 0 || volume > 1) {
          err(lineNumber, `invalid vol '${value}'`);
        } else {
          track.vol = volume;
        }
      } else if (key === 'pan') {
        const pan = Number(value);
        if (!/^-?\d+(\.\d+)?$/.test(value) || !Number.isFinite(pan) || pan < -1 || pan > 1) {
          err(lineNumber, `invalid pan '${value}'`);
        } else {
          track.pan = pan;
        }
      } else {
        err(lineNumber, `unknown track option '${key}'`);
      }
    }
    if (!roleSeen) err(lineNumber, 'unknown role (missing)');

    return track;
  };

  const parseHeaderLine = (key: string, value: string, lineNumber: number) => {
    if (!KNOWN_HEADER_KEYS.has(key)) {
      err(lineNumber, `unknown key '${key}'`);
      return;
    }
    if (headerValues.has(key)) {
      err(lineNumber, `repeated key '${key}'`);
      return;
    }
    headerValues.set(key, { value, line: lineNumber });
  };

  const parseDirective = (trimmed: string, lineNumber: number) => {
    const rampMatch = /^@bars\s+(\d+)\s*-\s*(\d+)\s+(.+)$/.exec(trimmed);
    if (rampMatch) {
      const from = Number(rampMatch[1]);
      const to = Number(rampMatch[2]);
      let tempoA: number | undefined;
      let tempoB: number | undefined;
      for (const option of rampMatch[3].split(/\s+/)) {
        const equals = option.indexOf('=');
        if (equals < 0) {
          err(lineNumber, `unrecognised directive option '${option}'`);
          continue;
        }
        const key = option.slice(0, equals);
        const value = option.slice(equals + 1);
        if (key !== 'tempo') {
          err(lineNumber, `unrecognised directive option '${option}'`);
          continue;
        }
        const pieces = /^(\d+(?:\.\d+)?)\.\.(\d+(?:\.\d+)?)$/.exec(value);
        if (!pieces) {
          err(lineNumber, `invalid tempo '${value}'`);
          continue;
        }
        const a = parseTempo(pieces[1]);
        const b = parseTempo(pieces[2]);
        if (a === null || b === null) {
          err(lineNumber, `invalid tempo '${value}'`);
          continue;
        }
        tempoA = a;
        tempoB = b;
      }
      if (tempoA !== undefined && tempoB !== undefined) {
        directives.push({ kind: 'ramp', line: lineNumber, from, to, tempoA, tempoB });
      }
      return;
    }

    const barMatch = /^@bar\s+(\d+)\s+(.+)$/.exec(trimmed);
    if (!barMatch) {
      err(lineNumber, `unrecognised directive '${trimmed}'`);
      return;
    }
    const bar = Number(barMatch[1]);
    let tempo: number | undefined;
    let time: [number, number] | undefined;
    let any = false;
    for (const option of barMatch[2].split(/\s+/)) {
      const equals = option.indexOf('=');
      if (equals < 0) {
        err(lineNumber, `unrecognised directive option '${option}'`);
        continue;
      }
      const key = option.slice(0, equals);
      const value = option.slice(equals + 1);
      if (key === 'tempo') {
        const parsed = parseTempo(value);
        if (parsed === null) err(lineNumber, `invalid tempo '${value}'`);
        else {
          tempo = parsed;
          any = true;
        }
      } else if (key === 'time') {
        const parsed = parseTimeSignature(value);
        if (parsed === null) err(lineNumber, `invalid time '${value}'`);
        else {
          time = parsed;
          any = true;
        }
      } else {
        err(lineNumber, `unrecognised directive option '${option}'`);
      }
    }
    if (any) directives.push({ kind: 'set', line: lineNumber, bar, tempo, time });
  };

  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = stripComment(lines[index]);
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (/^track(\s|$)/.test(trimmed)) {
      inTracks = true;
      currentTrack = parseTrackHeader(trimmed, lineNumber);
      rawTracks.push(currentTrack);
      continue;
    }

    if (!inTracks) {
      if (trimmed.startsWith('@')) {
        parseDirective(trimmed, lineNumber);
        continue;
      }
      const headerMatch = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(trimmed);
      if (headerMatch) {
        parseHeaderLine(headerMatch[1], headerMatch[2].trim(), lineNumber);
        continue;
      }
      err(lineNumber, `expected a header line or a track, found '${trimmed}'`);
      continue;
    }

    if (trimmed.startsWith('@')) {
      err(lineNumber, `directive after the first track: '${trimmed}'`);
      continue;
    }
    const headerMatch = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(trimmed);
    if (headerMatch && KNOWN_HEADER_KEYS.has(headerMatch[1])) {
      err(lineNumber, `header line after the first track: '${headerMatch[1]}'`);
      continue;
    }
    if (currentTrack) {
      currentTrack.tokens.push(...tokenizeLine(line, lineNumber));
    }
  }

  const meta: SongMeta = {
    title: '',
    composer: '',
    arranger: null,
    year: '',
    source: 'original',
    category: 'classics',
    style: 'synthwave',
    key: '',
    tempo: 120,
    time: [4, 4],
    pickupTicks: 0,
  };

  for (const key of REQUIRED_HEADER_KEYS) {
    if (!headerValues.has(key)) err(1, `missing ${key}`);
  }

  for (const key of ['title', 'composer', 'year', 'key'] as const) {
    const entry = headerValues.get(key);
    if (entry && entry.value === '') err(entry.line, `${key} must not be empty`);
    else if (entry) meta[key] = entry.value;
  }

  const arrangerEntry = headerValues.get('arranger');
  if (arrangerEntry) {
    if (arrangerEntry.value === '') err(arrangerEntry.line, 'arranger must not be empty');
    else meta.arranger = arrangerEntry.value;
  }

  const sourceEntry = headerValues.get('source');
  if (sourceEntry) {
    if (sourceEntry.value === 'public-domain' || sourceEntry.value === 'original') {
      meta.source = sourceEntry.value;
    } else {
      err(sourceEntry.line, `unknown source '${sourceEntry.value}'`);
    }
  }

  const categoryEntry = headerValues.get('category');
  if (categoryEntry) {
    if ((CATEGORIES as readonly string[]).includes(categoryEntry.value)) {
      meta.category = categoryEntry.value as Category;
    } else {
      err(categoryEntry.line, `unknown category '${categoryEntry.value}'`);
    }
  }

  const styleEntry = headerValues.get('style');
  if (styleEntry) {
    if (isStyle(styleEntry.value)) meta.style = styleEntry.value;
    else err(styleEntry.line, `unknown style '${styleEntry.value}'`);
  }

  const tempoEntry = headerValues.get('tempo');
  if (tempoEntry) {
    const tempo = parseTempo(tempoEntry.value);
    if (tempo === null) err(tempoEntry.line, `invalid tempo '${tempoEntry.value}'`);
    else meta.tempo = tempo;
  }

  const timeEntry = headerValues.get('time');
  if (timeEntry) {
    const time = parseTimeSignature(timeEntry.value);
    if (time === null) err(timeEntry.line, `invalid time '${timeEntry.value}'`);
    else meta.time = time;
  }

  const pickupEntry = headerValues.get('pickup');
  if (pickupEntry) {
    const ticks = durationTicks(pickupEntry.value);
    if (ticks === null || ticks <= 0 || ticks >= ticksForTime(meta.time)) {
      err(pickupEntry.line, `invalid pickup '${pickupEntry.value}'`);
    } else {
      meta.pickupTicks = ticks;
    }
  }

  const assembleBars = (tokens: SourceToken[]): AssembledBar[] => {
    interface Frame {
      bars: AssembledBar[];
      line: number;
    }
    const top: Frame = { bars: [], line: 0 };
    const stack: Frame[] = [top];
    let current: SourceToken[] = [];

    const pushBar = (frame: Frame, barTokens: SourceToken[], fallbackLine: number) => {
      if (barTokens.length === 0) return;
      const line = barTokens[0]?.line ?? fallbackLine;
      if (barTokens.length === 1) {
        const text = barTokens[0].text;
        if (text === 'R') {
          frame.bars.push({ tokens: [], line, fill: true });
          return;
        }
        const repeat = /^R\*(\d+)$/.exec(text);
        if (repeat) {
          const count = Number(repeat[1]);
          if (count < 1) {
            err(line, `invalid rest repeat count in '${text}'`);
            return;
          }
          for (let i = 0; i < count; i++) frame.bars.push({ tokens: [], line, fill: true });
          return;
        }
        if (text === '%') {
          const previous = frame.bars[frame.bars.length - 1];
          if (!previous) {
            err(line, `% has no previous bar to repeat`);
            return;
          }
          frame.bars.push({ tokens: previous.tokens, line: previous.line, fill: previous.fill });
          return;
        }
      }
      frame.bars.push({ tokens: barTokens, line, fill: false });
    };

    for (const token of tokens) {
      const text = token.text;
      if (text === '|') {
        pushBar(stack[stack.length - 1], current, token.line);
        current = [];
        continue;
      }
      if (text === '{') {
        if (current.length > 0) {
          err(current[0].line, `{ must start its own bar`);
          pushBar(stack[stack.length - 1], current, current[0].line);
          current = [];
        }
        if (stack.length > 1) err(token.line, 'nested groups are not allowed');
        stack.push({ bars: [], line: token.line });
        continue;
      }
      const close = /^\}\*(\d+)$/.exec(text);
      if (close) {
        if (stack.length === 1) {
          err(token.line, `unexpected '${text}'`);
          continue;
        }
        const frame = stack[stack.length - 1];
        pushBar(frame, current, token.line);
        current = [];
        stack.pop();
        const requested = Number(close[1]);
        if (requested < 1 || requested > 64) {
          err(token.line, `invalid group repeat count in '${text}'`);
        }
        const count = Math.min(Math.max(requested, 1), 64);
        if (frame.bars.length === 0) err(token.line, 'group has no bars');
        const parent = stack[stack.length - 1];
        for (let i = 0; i < count; i++) {
          for (const bar of frame.bars) {
            parent.bars.push({ tokens: bar.tokens, line: bar.line, fill: bar.fill });
          }
        }
        continue;
      }
      current.push(token);
    }

    while (stack.length > 1) {
      const frame = stack.pop() as Frame;
      pushBar(frame, current, frame.line);
      current = [];
      err(frame.line, 'unclosed group');
      const parent = stack[stack.length - 1];
      for (const bar of frame.bars) parent.bars.push(bar);
    }
    pushBar(stack[0], current, stack[0].line);
    return top.bars;
  };

  if (rawTracks.length === 0) err(1, 'song needs at least one track');

  const assembled = rawTracks.map((raw) => ({ raw, bars: assembleBars(raw.tokens) }));

  let positionCount = 0;
  for (const track of assembled) positionCount = Math.max(positionCount, track.bars.length);
  const numberedBarCount =
    meta.pickupTicks > 0 ? Math.max(positionCount - 1, 0) : positionCount;
  const firstCount = assembled[0]?.bars.length ?? 0;
  if (assembled.some((track) => track.bars.length !== firstCount)) {
    const summary = assembled.map((track) => `${track.raw.id} ${track.bars.length}`).join(', ');
    err(assembled[0].raw.headerLine, `bar count mismatch: ${summary}`);
  }

  for (const directive of directives) {
    const checkBar = (bar: number) => {
      if (bar < 1 || bar > numberedBarCount) {
        err(
          directive.line,
          `bar ${bar} is past the last bar (the song has ${numberedBarCount} bars)`,
        );
        return false;
      }
      return true;
    };
    if (directive.kind === 'set') {
      checkBar(directive.bar);
    } else {
      const fromOk = checkBar(directive.from);
      if (!fromOk) continue;
      if (directive.to <= directive.from) {
        err(directive.line, `bar ${directive.to} is not after bar ${directive.from}`);
      } else if (directive.to > numberedBarCount) {
        err(
          directive.line,
          `bar ${directive.to} is past the last bar (the song has ${numberedBarCount} bars)`,
        );
      }
    }
  }

  const tempoAt: number[] = new Array(numberedBarCount + 1).fill(meta.tempo);
  const timeAt: [number, number][] = new Array(numberedBarCount + 1).fill(meta.time);
  for (let n = 1; n <= numberedBarCount; n++) timeAt[n] = meta.time;

  for (const directive of directives) {
    if (directive.kind === 'set') {
      if (directive.bar < 1 || directive.bar > numberedBarCount) continue;
      if (directive.tempo !== undefined) {
        for (let n = directive.bar; n <= numberedBarCount; n++) tempoAt[n] = directive.tempo;
      }
      if (directive.time !== undefined) {
        for (let n = directive.bar; n <= numberedBarCount; n++) timeAt[n] = directive.time;
      }
      continue;
    }
    if (
      directive.from < 1 ||
      directive.to <= directive.from ||
      directive.to > numberedBarCount
    ) {
      continue;
    }
    const span = directive.to - directive.from;
    for (let i = 0; i <= span; i++) {
      tempoAt[directive.from + i] =
        directive.tempoA + ((directive.tempoB - directive.tempoA) * i) / span;
    }
    for (let n = directive.to; n <= numberedBarCount; n++) tempoAt[n] = directive.tempoB;
  }

  const bars: BarInfo[] = [];
  let startTick = 0;
  if (meta.pickupTicks > 0) {
    bars.push({
      number: 0,
      startTick: 0,
      ticks: meta.pickupTicks,
      time: meta.time,
      tempo: meta.tempo,
    });
    startTick += meta.pickupTicks;
  }
  for (let number = 1; number <= numberedBarCount; number++) {
    const ticks = ticksForTime(timeAt[number]);
    bars.push({ number, startTick, ticks, time: timeAt[number], tempo: tempoAt[number] });
    startTick += ticks;
  }
  const totalTicks = startTick;

  const tracks: Track[] = [];
  for (const { raw, bars: trackBars } of assembled) {
    const notes: Note[] = [];
    let stickyDuration = TICKS_PER_QUARTER;
    let stickyVelocity = 100;
    let pendingTie: { note: Note; line: number } | null = null;

    const flushTie = () => {
      if (pendingTie) {
        notes.push(pendingTie.note);
        pendingTie = null;
      }
    };

    for (let index = 0; index < trackBars.length; index++) {
      const assembledBar = trackBars[index];
      const barInfo = bars[index];
      if (!barInfo) continue;

      if (assembledBar.fill) {
        if (pendingTie) {
          err(assembledBar.line, `tie into a rest in track ${raw.id}`);
          flushTie();
        }
        continue;
      }

      let barTicks = 0;
      for (const token of assembledBar.tokens) {
        const parsed = parseNoteToken(token.text, raw.role, stickyDuration);

        if (parsed.kind === 'velocity') {
          stickyVelocity = parsed.velocity;
          continue;
        }
        if (parsed.kind === 'error') {
          err(token.line, parsed.message);
          continue;
        }
        if (parsed.durationWritten !== null) stickyDuration = parsed.durationWritten;
        if (parsed.kind === 'rest') {
          if (pendingTie) {
            err(token.line, `tie into a rest in track ${raw.id}`);
            flushTie();
          }
          barTicks += parsed.ticks;
          continue;
        }

        const noteTick = barInfo.startTick + barTicks;
        barTicks += parsed.ticks;
        const velocity = parsed.velocity ?? stickyVelocity;
        const note: Note = {
          tick: noteTick,
          ticks: parsed.ticks,
          pitches: parsed.pitches,
          velocity,
          staccato: parsed.staccato,
        };

        if (raw.role !== 'drums') {
          const range = ROLE_RANGES[raw.role as PitchedRole];
          const offender = parsed.pitches.find((pitch) => pitch < range[0] || pitch > range[1]);
          if (offender !== undefined) {
            err(
              token.line,
              `${offender} out of range for ${raw.role} (${range[0]}-${range[1]})`,
            );
          }
        }

        if (pendingTie) {
          if (pitchesEqual(pendingTie.note.pitches, note.pitches)) {
            pendingTie.note.ticks += parsed.ticks;
            if (!parsed.tie) {
              notes.push(pendingTie.note);
              pendingTie = null;
            }
            continue;
          }
          err(token.line, `tie to different pitches in track ${raw.id}`);
          flushTie();
        }

        if (parsed.tie) pendingTie = { note, line: token.line };
        else notes.push(note);
      }

      if (barTicks !== barInfo.ticks) {
        err(
          assembledBar.line,
          `track ${raw.id} bar ${barInfo.number} is ${barTicks} ticks, expected ${barInfo.ticks}`,
        );
      }
    }

    if (pendingTie) {
      err(pendingTie.line, `tie has no following note in track ${raw.id}`);
      flushTie();
    }

    notes.sort((a, b) => a.tick - b.tick);
    tracks.push({
      id: raw.id,
      role: raw.role,
      inst: raw.inst,
      vol: raw.vol,
      pan: raw.pan,
      notes,
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  const song: Song = { meta, bars, tracks, totalTicks };
  return { ok: true, song };
}
