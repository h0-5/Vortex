'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { PluginDetector } = require('../plugin-detector');

describe('PluginDetector', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vortex-plugin-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('detects official and custom plugins', async () => {
    const pluginsDir = path.join(tempDir, 'plugins');

    await fs.ensureDir(path.join(pluginsDir, 'welcome'));
    await fs.writeFile(
      path.join(pluginsDir, 'welcome', 'manifest.json'),
      JSON.stringify({ id: 'welcome', version: '1.0.0' }),
    );

    await fs.ensureDir(path.join(pluginsDir, 'custom'));
    await fs.writeFile(
      path.join(pluginsDir, 'custom', 'manifest.json'),
      JSON.stringify({ id: 'custom', version: '1.0.0' }),
    );

    await fs.ensureDir(path.join(pluginsDir, 'third-party'));
    await fs.writeFile(
      path.join(pluginsDir, 'third-party', 'manifest.json'),
      JSON.stringify({ id: 'third-party', version: '2.0.0' }),
    );

    const detector = new PluginDetector({ pluginsDir });
    const plugins = await detector.detectPlugins();

    const welcome = plugins.find((p) => p.id === 'welcome');
    const custom = plugins.find((p) => p.id === 'custom');
    const thirdParty = plugins.find((p) => p.id === 'third-party');

    expect(welcome).toBeDefined();
    expect(welcome.official).toBe(true);
    expect(welcome.version).toBe('1.0.0');

    expect(custom).toBeDefined();
    expect(custom.official).toBe(false);

    expect(thirdParty).toBeDefined();
    expect(thirdParty.official).toBe(false);
  });

  it('computes official plugin updates and leaves custom untouched', async () => {
    const pluginsDir = path.join(tempDir, 'plugins');
    const sourcePluginsDir = path.join(tempDir, 'source', 'plugins');

    await fs.ensureDir(path.join(pluginsDir, 'welcome'));
    await fs.writeFile(
      path.join(pluginsDir, 'welcome', 'manifest.json'),
      JSON.stringify({ id: 'welcome', version: '1.0.0' }),
    );

    await fs.ensureDir(path.join(pluginsDir, 'custom'));
    await fs.writeFile(
      path.join(pluginsDir, 'custom', 'manifest.json'),
      JSON.stringify({ id: 'custom', version: '1.0.0' }),
    );

    await fs.ensureDir(path.join(sourcePluginsDir, 'welcome'));
    await fs.writeFile(
      path.join(sourcePluginsDir, 'welcome', 'manifest.json'),
      JSON.stringify({ id: 'welcome', version: '1.1.0' }),
    );

    const detector = new PluginDetector({ pluginsDir });
    const currentPlugins = await detector.detectPlugins();
    const updates = await detector.computeUpdates(currentPlugins, sourcePluginsDir);

    const welcome = updates.find((p) => p.id === 'welcome');
    const custom = updates.find((p) => p.id === 'custom');

    expect(welcome.updated).toBe(true);
    expect(welcome.version).toBe('1.1.0');
    expect(custom.updated).toBe(false);
  });
});
