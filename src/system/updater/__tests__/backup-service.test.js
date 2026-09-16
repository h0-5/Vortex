'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { BackupService } = require('../backup-service');

describe('BackupService', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vortex-backup-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('backs up all project items except ignored ones', async () => {
    await fs.ensureDir(path.join(tempDir, 'apps', 'api'));
    await fs.ensureDir(path.join(tempDir, 'uploads'));
    await fs.ensureDir(path.join(tempDir, 'storage'));
    await fs.ensureDir(path.join(tempDir, 'plugins', 'custom'));
    await fs.ensureDir(path.join(tempDir, 'node_modules'));
    await fs.writeFile(path.join(tempDir, '.env'), 'SECRET=1');
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"version":"1.0.0"}');
    await fs.writeFile(path.join(tempDir, 'apps', 'api', 'main.js'), 'api');
    await fs.writeFile(path.join(tempDir, 'uploads', 'logo.png'), 'png');

    const backupDir = path.join(tempDir, 'backups', 'test');
    const service = new BackupService({ root: tempDir, backupDir });
    const result = await service.createBackup();

    expect(result.backupDir).toBe(backupDir);
    expect(await fs.pathExists(path.join(backupDir, '.env'))).toBe(true);
    expect(await fs.pathExists(path.join(backupDir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(backupDir, 'apps', 'api', 'main.js'))).toBe(true);
    expect(await fs.pathExists(path.join(backupDir, 'uploads', 'logo.png'))).toBe(true);
    expect(await fs.pathExists(path.join(backupDir, 'node_modules'))).toBe(false);
    expect(await fs.readFile(path.join(backupDir, '.env'), 'utf8')).toBe('SECRET=1');
  });

  it('does not backup log files or coverage', async () => {
    await fs.writeFile(path.join(tempDir, 'app.log'), 'log');
    await fs.ensureDir(path.join(tempDir, 'coverage'));
    await fs.writeFile(path.join(tempDir, 'package.json'), '{"version":"1.0.0"}');

    const backupDir = path.join(tempDir, 'backups', 'test');
    const service = new BackupService({ root: tempDir, backupDir });
    await service.createBackup();

    expect(await fs.pathExists(path.join(backupDir, 'app.log'))).toBe(false);
    expect(await fs.pathExists(path.join(backupDir, 'coverage'))).toBe(false);
  });
});
