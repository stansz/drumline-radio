// Runs only the song checker (tools/check/*.check.ts), never the regular tests.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/check/**/*.check.ts'],
    silent: false,
  },
});
