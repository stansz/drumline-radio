// Writes a piano piece converted from a score (see tools/midi/midi2song.mjs) as a .song file. Each
// part is a list of voices, each voice a list of bars (bar 1 first); every voice becomes a track.
// Used by moonlight.mjs and clair-de-lune.mjs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeBlock } from './lib.mjs';

/**
 * spec: { file, head (header lines, no tracks), directives (tempo lines or ''), sections (Map of
 * bar number -> comment), parts: [{ id, role, vol, pan?, vel, voices: [[bar, ...], ...] }] }
 */
export function writePianoPiece(out, spec) {
  mkdirSync(out, { recursive: true });
  const tracks = [];
  for (const part of spec.parts) {
    part.voices.forEach((bars, i) => {
      const id = i === 0 ? part.id : `${part.id}-${i + 1}`;
      const pan = part.pan ? ` pan=${part.pan}` : '';
      tracks.push(`track ${id} role=${part.role} vol=${part.vol}${pan}\n${block(bars, part.vel, spec.sections)}`);
    });
  }
  const directives = spec.directives ? `\n${spec.directives}\n` : '';
  writeFileSync(join(out, spec.file), `${spec.head.trim()}\n${directives}\n${tracks.join('\n\n')}\n`);
  return tracks.length;
}

// Four bars a line, a comment line where a section starts, the velocity set on the first note.
function block(bars, vel, sections) {
  const first = bars.findIndex((bar) => bar !== 'R');
  const withVel = bars.map((bar, i) => (i === first ? `v=${vel} ${bar}` : bar));
  const at = new Map([...sections].map(([n, text]) => [n - 1, text]));
  return writeBlock(withVel, at);
}
