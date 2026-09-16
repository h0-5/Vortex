'use strict';

const { runUpdate, ConsoleReporter, UpdateError } = require('./src/system/updater');

const ROOT = __dirname;
const args = process.argv.slice(2);
const force = args.includes('--force');
const skipBackup = args.includes('--skip-backup');
const verbose = args.includes('--verbose') || args.includes('-v');

if (verbose) {
  process.env.VORTEX_UPDATER_VERBOSE = '1';
}

async function main() {
  const reporter = new ConsoleReporter();

  try {
    const report = await runUpdate({
      root: ROOT,
      reporter,
      force,
      skipBackup,
    });

    if (report.alreadyUpToDate) {
      process.exit(0);
    }

    process.exit(0);
  } catch (error) {
    if (error instanceof UpdateError) {
      process.exit(1);
    }

    reporter.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

void main();
