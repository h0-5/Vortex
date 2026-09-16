'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { FileReplacer } = require('../file-replacer');

describe('FileReplacer', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vortex-replacer-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('copies new files and overwrites existing official files', async () => {
    const root = path.join(tempDir, 'root');
    const source = path.join(tempDir, 'source');

    await fs.ensureDir(path.join(root, 'apps', 'api'));
    await fs.writeFile(path.join(root, 'package.json'), '{"version":"1.0.0"}');
    await fs.writeFile(path.join(root, 'apps', 'api', 'main.js'), 'old');

    await fs.ensureDir(path.join(source, 'apps', 'api'));
    await fs.writeFile(path.join(source, 'package.json'), '{"version":"1.1.0"}');
    await fs.writeFile(path.join(source, 'apps', 'api', 'main.js'), 'new');
    await fs.writeFile(path.join(source, 'new-file.js'), 'hello');

    const replacer = new FileReplacer({
      root,
      protectedPaths: ['.env', 'uploads', 'storage', 'plugins/custom'],
    });
    const result = await replacer.replaceFiles({ sourceDir: source });

    expect(result.updatedFiles).toBe(3);
    expect(await fs.readFile(path.join(root, 'apps', 'api', 'main.js'), 'utf8')).toBe('new');
    expect(await fs.readFile(path.join(root, 'package.json'), 'utf8')).toBe('{"version":"1.1.0"}');
    expect(await fs.readFile(path.join(root, 'new-file.js'), 'utf8')).toBe('hello');
  });

  it('never overwrites protected paths', async () => {
    const root = path.join(tempDir, 'root');
    const source = path.join(tempDir, 'source');

    await fs.ensureDir(source);
    await fs.ensureDir(path.join(root, 'uploads'));
    await fs.writeFile(path.join(root, '.env'), 'SECRET=old');
    await fs.writeFile(path.join(root, 'uploads', 'logo.png'), 'old');
    await fs.ensureDir(path.join(root, 'plugins', 'custom'));
    await fs.writeFile(path.join(root, 'plugins', 'custom', 'plugin.js'), 'old');

    await fs.writeFile(path.join(source, '.env'), 'SECRET=new');
    await fs.ensureDir(path.join(source, 'uploads'));
    await fs.writeFile(path.join(source, 'uploads', 'logo.png'), 'new');
    await fs.ensureDir(path.join(source, 'plugins', 'custom'));
    await fs.writeFile(path.join(source, 'plugins', 'custom', 'plugin.js'), 'new');

    const replacer = new FileReplacer({
      root,
      protectedPaths: ['.env', 'uploads', 'storage', 'plugins/custom'],
    });
    const result = await replacer.replaceFiles({ sourceDir: source });

    expect(result.updatedFiles).toBe(0);
    expect(await fs.readFile(path.join(root, '.env'), 'utf8')).toBe('SECRET=old');
    expect(await fs.readFile(path.join(root, 'uploads', 'logo.png'), 'utf8')).toBe('old');
    expect(await fs.readFile(path.join(root, 'plugins', 'custom', 'plugin.js'), 'utf8')).toBe(
      'old',
    );
  });
});
