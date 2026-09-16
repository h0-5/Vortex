import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    pool: 'forks',
    maxWorkers: 2,
    minWorkers: 1,
    testTimeout: 30_000,
    forks: {
      execArgv: ['--max-old-space-size=8192'],
    },
  },
});
