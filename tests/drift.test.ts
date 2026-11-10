// The generators are deterministic, so a recipe edit that was not regenerated (or a hand edit to a
// generated file) fails here. Hand-written songs have no generator and are not checked.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SCRIPT = [
  'tools/arranger/songs.mjs',
  'tools/arranger/last-stop.mjs',
  'tools/arranger/ivory-and-ash.mjs',
  'tools/arranger/club.mjs',
  'tools/arranger/nocturne.mjs',
  'tools/arranger/fur-elise.mjs',
  'tools/arranger/greensleeves.mjs',
  'tools/arranger/mountain-king.mjs',
  'tools/arranger/swan-lake.mjs',
  'tools/arranger/night-shift.mjs',
  'tools/arranger/riverfront.mjs',
  'tools/arranger/fathom.mjs',
  'tools/arranger/save-point.mjs',
  'tools/arranger/moonlight.mjs',
  'tools/arranger/clair-de-lune.mjs',
  'tools/arranger/exit-sign.mjs',
  'tools/arranger/the-silent-keep.mjs',
  'tools/arranger/sunliner.mjs',
  'tools/arranger/confetti-cannon.mjs',
];

describe('the song generators', () => {
  for (const script of SCRIPT) {
    it(`${script} matches src/songs`, () => {
      const dir = mkdtempSync(join(tmpdir(), 'radio-drift-'));
      try {
        execFileSync(process.execPath, [script, dir], { cwd: root, stdio: 'pipe' });
        const files = readdirSync(dir).filter((file: string) => file.endsWith('.song'));
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
          const generated = readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
          const committed = readFileSync(join(root, 'src/songs', file), 'utf8').replace(/\r\n/g, '\n');
          expect(generated, `${file} differs from src/songs: re-run ${script}`).toBe(committed);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
