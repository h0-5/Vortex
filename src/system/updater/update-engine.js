'use strict';

const fs = require('fs-extra');
const path = require('path');
const {
  GITHUB_API_URL,
  REPO_OWNER,
  REPO_NAME,
  TMP_UPDATE_DIR,
  BACKUPS_DIR,
  PROTECTED_PATHS,
  UPDATE_STEPS,
} = require('./constants');
const { GitHubClient } = require('./github-client');
const { compareVersions } = require('./version-checker');
const { BackupService } = require('./backup-service');
const { DownloadService } = require('./download-service');
const { FileReplacer } = require('./file-replacer');
const { PluginDetector } = require('./plugin-detector');
const { InstallService } = require('./install-service');
const { RollbackService } = require('./rollback-service');
const { UpdateError } = require('./errors');
const { SilentReporter } = require('./reporter');

/**
 * @typedef {object} UpdateOptions
 * @property {string} [root]
 * @property {object} [repo]
 * @property {string} [repo.owner]
 * @property {string} [repo.name]
 * @property {string} [githubToken]
 * @property {import('./reporter').ConsoleReporter | import('./reporter').SilentReporter} [reporter]
 * @property {boolean} [skipBackup]
 * @property {boolean} [force]
 * @property {string} [backupDir]
 * @property {GitHubClient} [githubClient]
 * @property {DownloadService} [downloadService]
 * @property {InstallService} [installService]
 */

/**
 * @param {UpdateOptions} options
 * @returns {Promise<object>}
 */
async function runUpdate(options = {}) {
  const root = options.root || process.cwd();
  const repo = options.repo || { owner: REPO_OWNER, name: REPO_NAME };
  const reporter = options.reporter || new SilentReporter();
  const githubToken = options.githubToken || process.env.GITHUB_TOKEN;
  const skipBackup = options.skipBackup === true;
  const force = options.force === true;

  const tmpDir = path.join(root, TMP_UPDATE_DIR);
  let backupDir = options.backupDir || null;
  let rollbackDone = false;
  let currentStep = 0;

  const installService =
    options.installService ||
    new InstallService({
      onOutput: (_channel, data) => {
        if (process.env.VORTEX_UPDATER_VERBOSE === '1') {
          process.stdout.write(data);
        }
      },
    });

  const githubClient =
    options.githubClient ||
    new GitHubClient({
      owner: repo.owner,
      name: repo.name,
      apiUrl: GITHUB_API_URL,
      token: githubToken,
    });

  const downloadService = options.downloadService || new DownloadService();

  try {
    // Step 1: Check version
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[0]);
    const currentVersion = await readCurrentVersion(root);
    const release = await githubClient.getLatestRelease();
    const versionCheck = compareVersions(currentVersion, release.version);

    if (!versionCheck.hasUpdate && !force) {
      reporter.success(`Vortex ${currentVersion} is already up to date.`);
      return {
        alreadyUpToDate: true,
        oldVersion: currentVersion,
        newVersion: release.version,
      };
    }

    reporter.info(`Update available: ${currentVersion} → ${release.version}`);

    if (versionCheck.isMajor) {
      reporter.warn(
        'This is a major version update. Please review the release notes before continuing.',
      );
    }

    // Step 2: Backup
    if (!skipBackup) {
      reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[1]);
      backupDir = await createBackup(root);
      reporter.success(`Backup created at ${path.relative(root, backupDir)}`);
    } else {
      reporter.warn('Backup skipped');
    }

    // Step 3: Download
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[2]);
    reporter.startSpinner(`Downloading ${release.tagName}...`);
    const { zipPath } = await downloadService.downloadRelease(release, tmpDir);
    reporter.stopSpinner();
    reporter.success(`Downloaded ${release.tagName}`);

    // Step 4: Extract
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[3]);
    reporter.startSpinner('Extracting release archive...');
    const { extractedDir } = await downloadService.extract(zipPath, tmpDir);
    reporter.stopSpinner();
    reporter.success(`Extracted release to ${path.relative(root, extractedDir)}`);

    // Detect plugins before replacement
    const pluginDetector = new PluginDetector({
      pluginsDir: path.join(root, 'plugins'),
    });
    const currentPlugins = await pluginDetector.detectPlugins();

    // Count migrations before replacement
    const migrationCountBefore = await installService.countMigrations(root);

    // Step 5: Replace files
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[4]);
    const replacer = new FileReplacer({ root, protectedPaths: PROTECTED_PATHS });
    const { updatedFiles } = await replacer.replaceFiles({
      sourceDir: extractedDir,
      onProgress: (relativePath) => {
        if (process.env.VORTEX_UPDATER_VERBOSE === '1') {
          reporter.info(`  ${relativePath}`);
        }
      },
    });
    reporter.success(`Replaced ${updatedFiles} official file(s)`);

    // Compute plugin updates
    const pluginUpdates = await pluginDetector.computeUpdates(
      currentPlugins,
      path.join(extractedDir, 'plugins'),
    );

    // Step 6: Install dependencies
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[5]);
    reporter.startSpinner('Running pnpm install --frozen-lockfile...');
    await installService.installDependencies(root);
    reporter.stopSpinner();
    reporter.success('Dependencies installed');

    // Step 7: Run migrations
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[6]);
    reporter.startSpinner('Running database migrations...');
    await installService.runMigrations(root);
    reporter.stopSpinner();
    reporter.success('Database migrations applied');

    const migrationCountAfter = await installService.countMigrations(root);

    // Step 8: Build
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[7]);
    reporter.startSpinner('Building project...');
    await installService.build(root);
    reporter.stopSpinner();
    reporter.success('Build completed');

    // Step 9: Validate
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[8]);
    const { version: installedVersion } = await installService.readPackageVersion(root);
    if (installedVersion !== release.version) {
      throw new UpdateError(
        `Validation failed: installed version ${installedVersion} does not match expected ${release.version}`,
      );
    }

    const buildOutputs = [
      path.join(root, 'packages', 'shared', 'dist'),
      path.join(root, 'packages', 'database', 'dist'),
      path.join(root, 'packages', 'ui', 'dist'),
      path.join(root, 'apps', 'api', 'dist'),
      path.join(root, 'apps', 'bot', 'dist'),
    ];
    const missingBuilds = [];
    for (const output of buildOutputs) {
      if (!(await fs.pathExists(output))) {
        missingBuilds.push(path.relative(root, output));
      }
    }
    if (missingBuilds.length > 0) {
      throw new UpdateError(
        `Validation failed: missing build output for ${missingBuilds.join(', ')}`,
      );
    }
    reporter.success('Installation validated');

    // Step 10: Generate report
    reporter.step(++currentStep, UPDATE_STEPS.length, UPDATE_STEPS[9]);
    const report = {
      alreadyUpToDate: false,
      oldVersion: currentVersion,
      newVersion: installedVersion,
      updatedFiles,
      migrationCount: Math.max(0, migrationCountAfter - migrationCountBefore),
      buildStatus: 'success',
      plugins: pluginUpdates,
      backupDir,
      releaseNotes: release.notes,
    };
    reporter.finish(report);

    // Cleanup
    await fs.remove(tmpDir);

    return report;
  } catch (error) {
    reporter.stopSpinner();

    if (backupDir && !rollbackDone) {
      try {
        reporter.warn('Update failed. Rolling back to previous version...');
        const rollbackService = new RollbackService({
          root,
          backupDir,
          protectedPaths: PROTECTED_PATHS,
        });
        await rollbackService.rollback();
        rollbackDone = true;
        reporter.success('Rollback completed');
      } catch (rollbackError) {
        reporter.error(`Rollback failed: ${rollbackError.message}`);
      }
    }

    reporter.rollback(error, rollbackDone);

    throw new UpdateError(error.message, {
      step: UPDATE_STEPS[Math.max(0, currentStep - 1)],
      cause: error,
      rolledBack: rollbackDone,
    });
  }
}

/**
 * @param {string} root
 * @returns {Promise<string>}
 */
async function readCurrentVersion(root) {
  const packageJsonPath = path.join(root, 'package.json');
  const exists = await fs.pathExists(packageJsonPath);
  if (!exists) {
    throw new Error(`package.json not found at ${packageJsonPath}`);
  }

  const packageJson = await fs.readJson(packageJsonPath);
  if (!packageJson.version) {
    throw new Error('package.json is missing version field');
  }

  return packageJson.version;
}

/**
 * @param {string} root
 * @returns {Promise<string>}
 */
async function createBackup(root) {
  const timestamp = new Date().toISOString().replace(/[:T]/gu, '-').slice(0, 19);
  const backupDir = path.join(root, BACKUPS_DIR, timestamp);
  const backupService = new BackupService({ root, backupDir });
  await backupService.createBackup();
  return backupDir;
}

module.exports = { runUpdate, readCurrentVersion, createBackup };
