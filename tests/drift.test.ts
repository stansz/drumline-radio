// The generators are deterministic, so a recipe edit that was not regenerated (or a hand edit to a
// generated file) fails here. Hand-written songs have no generator and are not checked.
// @ts-ignore -- @types/node is not a dependency here, so Node's builtins have no types (see vite.config.ts).
import { execFileSync } from 'node:child_process';
// @ts-ignore -- same reason as above.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
// @ts-ignore -- same reason as above.
import { tmpdir } from 'node:os';
// @ts-ignore -- same reason as above.
import { dirname, join } from 'node:path';
// @ts-ignore -- same reason as above.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Node's process, declared here because @types/node is not a dependency.
declare const process: { execPath: string };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SCRIPT = [
  'tools/arranger/songs.mjs',
  'tools/arranger/originals.mjs',
  'tools/arranger/ivory-and-ash.mjs',
  'tools/arranger/club.mjs',
  'tools/arranger/nocturne.mjs',
  'tools/arranger/fur-elise.mjs',
  'tools/arranger/greensleeves.mjs',
  'tools/arranger/mountain-king.mjs',
  'tools/arranger/swan-lake.mjs',
  'tools/arranger/night-shift.mjs',
  'tools/arranger/save-point.mjs',
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
