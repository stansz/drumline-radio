// Runs only the song report (tools/analysis/*.check.ts), never the regular tests.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/analysis/**/*.check.ts'],
    silent: false,
  },
});
