// Writes a piano piece converted from a score (see tools/midi/midi2song.mjs) as a .song file. Each
// part is a list of voices, each voice a list of bars (bar 1 first); every voice becomes a track.
// Used by moonlight.mjs and clair-de-lune.mjs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
  const lines = [];
  let row = [];
  let started = false;
  const flush = () => { if (row.length) lines.push(`| ${row.join(' | ')} |`); row = []; };
  bars.forEach((bar, i) => {
    if (sections.has(i + 1)) { flush(); lines.push(`# ${sections.get(i + 1)}`); }
    if (!started && bar !== 'R') { row.push(`v=${vel} ${bar}`); started = true; } else row.push(bar);
    if (row.length === 4) flush();
  });
  flush();
  return lines.join('\n');
}
