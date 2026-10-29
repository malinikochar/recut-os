import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/run-benchmarks.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
});
