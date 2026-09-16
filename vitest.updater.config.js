'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/system/updater/**/*.test.js'],
    testTimeout: 30_000,
    pool: 'forks',
    maxWorkers: 2,
    minWorkers: 1,
  },
});
