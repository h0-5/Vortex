'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { runUpdate, UpdateError } = require('../');
const { SilentReporter } = require('../reporter');

describe('runUpdate', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vortex-update-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  function createMockGithubClient(version = '1.1.0') {
    return {
      getLatestRelease: async () => ({
        version,
        tagName: `v${version}`,
        notes: 'Test release',
        assets: [{ name: 'source.zip', url: 'http://example.com/source.zip', size: 100 }],
        publishedAt: new Date().toISOString(),
        tarballUrl: 'http://example.com/source.tar.gz',
        zipballUrl: 'http://example.com/source.zip',
      }),
    };
  }

  function createMockDownloadService(sourceDir) {
    return {
      downloadRelease: async () => ({ zipPath: path.join(tempDir, 'release.zip'), asset: {} }),
      extract: async () => ({ extractedDir: sourceDir }),
    };
  }

  function createMockInstallService(overrides = {}) {
    return {
      installDependencies: async () => {},
      runMigrations: async () => {},
      build: async () => {},
      readPackageVersion: async (root) => {
        const packageJson = await fs.readJson(path.join(root, 'package.json'));
        return { version: packageJson.version };
      },
      countMigrations: async (root) => {
        const drizzleDir = path.join(root, 'packages', 'database', 'drizzle');
        if (!(await fs.pathExists(drizzleDir))) return 0;
        const entries = await fs.readdir(drizzleDir);
        return entries.filter((e) => e.endsWith('.sql')).length;
      },
      ...overrides,
    };
  }

  async function setupProject(version, sourceVersion = '1.1.0') {
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'vortex', version }),
    );

    await fs.ensureDir(path.join(tempDir, 'packages', 'shared', 'dist'));
    await fs.ensureDir(path.join(tempDir, 'packages', 'database', 'dist'));
    await fs.ensureDir(path.join(tempDir, 'packages', 'ui', 'dist'));
    await fs.ensureDir(path.join(tempDir, 'apps', 'api', 'dist'));
    await fs.ensureDir(path.join(tempDir, 'apps', 'bot', 'dist'));

    await fs.ensureDir(path.join(tempDir, 'uploads'));
    await fs.writeFile(path.join(tempDir, '.env'), 'SECRET=1');
    await fs.writeFile(path.join(tempDir, 'uploads', 'logo.png'), 'logo');

    const sourceDir = path.join(tempDir, 'source', `Vortex-${sourceVersion}`);
    await fs.ensureDir(sourceDir);
    await fs.writeFile(
      path.join(sourceDir, 'package.json'),
      JSON.stringify({ name: 'vortex', version: sourceVersion }),
    );
    await fs.ensureDir(path.join(sourceDir, 'packages', 'shared', 'dist'));
    await fs.ensureDir(path.join(sourceDir, 'packages', 'database', 'dist'));
    await fs.ensureDir(path.join(sourceDir, 'packages', 'ui', 'dist'));
    await fs.ensureDir(path.join(sourceDir, 'apps', 'api', 'dist'));
    await fs.ensureDir(path.join(sourceDir, 'apps', 'bot', 'dist'));
    await fs.writeFile(path.join(sourceDir, 'NEW_FILE.js'), 'new');

    return sourceDir;
  }

  it('returns already up to date when versions match', async () => {
    await setupProject('1.1.0', '1.1.0');

    const report = await runUpdate({
      root: tempDir,
      reporter: new SilentReporter(),
      githubClient: createMockGithubClient('1.1.0'),
    });

    expect(report.alreadyUpToDate).toBe(true);
    expect(report.oldVersion).toBe('1.1.0');
    expect(report.newVersion).toBe('1.1.0');
  });

  it('performs a successful update', async () => {
    const sourceDir = await setupProject('1.0.0', '1.1.0');

    const report = await runUpdate({
      root: tempDir,
      reporter: new SilentReporter(),
      githubClient: createMockGithubClient('1.1.0'),
      downloadService: createMockDownloadService(sourceDir),
      installService: createMockInstallService(),
    });

    expect(report.alreadyUpToDate).toBe(false);
    expect(report.oldVersion).toBe('1.0.0');
    expect(report.newVersion).toBe('1.1.0');
    expect(report.updatedFiles).toBeGreaterThan(0);
    expect(report.buildStatus).toBe('success');
    expect(await fs.pathExists(path.join(tempDir, 'NEW_FILE.js'))).toBe(true);
    expect(await fs.readFile(path.join(tempDir, '.env'), 'utf8')).toBe('SECRET=1');
    expect(await fs.readFile(path.join(tempDir, 'uploads', 'logo.png'), 'utf8')).toBe('logo');
    expect(await fs.pathExists(path.join(tempDir, 'backups'))).toBe(true);
  });

  it('rolls back when download fails', async () => {
    await setupProject('1.0.0', '1.1.0');

    await expect(
      runUpdate({
        root: tempDir,
        reporter: new SilentReporter(),
        githubClient: createMockGithubClient('1.1.0'),
        downloadService: {
          downloadRelease: async () => {
            throw new Error('Network error');
          },
        },
      }),
    ).rejects.toThrow(UpdateError);

    const packageJson = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(packageJson.version).toBe('1.0.0');
  });

  it('rolls back when extraction fails', async () => {
    await setupProject('1.0.0', '1.1.0');

    await expect(
      runUpdate({
        root: tempDir,
        reporter: new SilentReporter(),
        githubClient: createMockGithubClient('1.1.0'),
        downloadService: {
          downloadRelease: async () => ({ zipPath: path.join(tempDir, 'release.zip'), asset: {} }),
          extract: async () => {
            throw new Error('Corrupt zip');
          },
        },
      }),
    ).rejects.toThrow(UpdateError);

    const packageJson = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(packageJson.version).toBe('1.0.0');
  });

  it('rolls back when install fails', async () => {
    const sourceDir = await setupProject('1.0.0', '1.1.0');

    await expect(
      runUpdate({
        root: tempDir,
        reporter: new SilentReporter(),
        githubClient: createMockGithubClient('1.1.0'),
        downloadService: createMockDownloadService(sourceDir),
        installService: createMockInstallService({
          installDependencies: async () => {
            throw new Error('pnpm install failed');
          },
        }),
      }),
    ).rejects.toThrow(UpdateError);

    const packageJson = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(packageJson.version).toBe('1.0.0');
  });

  it('rolls back when migration fails', async () => {
    const sourceDir = await setupProject('1.0.0', '1.1.0');

    await expect(
      runUpdate({
        root: tempDir,
        reporter: new SilentReporter(),
        githubClient: createMockGithubClient('1.1.0'),
        downloadService: createMockDownloadService(sourceDir),
        installService: createMockInstallService({
          runMigrations: async () => {
            throw new Error('migration failed');
          },
        }),
      }),
    ).rejects.toThrow(UpdateError);

    const packageJson = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(packageJson.version).toBe('1.0.0');
  });

  it('rolls back when build fails', async () => {
    const sourceDir = await setupProject('1.0.0', '1.1.0');

    await expect(
      runUpdate({
        root: tempDir,
        reporter: new SilentReporter(),
        githubClient: createMockGithubClient('1.1.0'),
        downloadService: createMockDownloadService(sourceDir),
        installService: createMockInstallService({
          build: async () => {
            throw new Error('build failed');
          },
        }),
      }),
    ).rejects.toThrow(UpdateError);

    const packageJson = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(packageJson.version).toBe('1.0.0');
  });

  it('reports migration count difference', async () => {
    const sourceDir = await setupProject('1.0.0', '1.1.0');

    await fs.ensureDir(path.join(tempDir, 'packages', 'database', 'drizzle'));
    await fs.writeFile(path.join(tempDir, 'packages', 'database', 'drizzle', '0000_init.sql'), '');

    await fs.ensureDir(path.join(sourceDir, 'packages', 'database', 'drizzle'));
    await fs.writeFile(
      path.join(sourceDir, 'packages', 'database', 'drizzle', '0000_init.sql'),
      '',
    );
    await fs.writeFile(
      path.join(sourceDir, 'packages', 'database', 'drizzle', '0001_feature.sql'),
      '',
    );

    const report = await runUpdate({
      root: tempDir,
      reporter: new SilentReporter(),
      githubClient: createMockGithubClient('1.1.0'),
      downloadService: createMockDownloadService(sourceDir),
      installService: createMockInstallService(),
    });

    expect(report.migrationCount).toBe(1);
  });
});
