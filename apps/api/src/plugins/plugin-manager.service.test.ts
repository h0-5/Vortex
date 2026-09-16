import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PluginManager } from './plugin-manager.service.js';

describe('PluginManager', () => {
  const tempPaths: string[] = [];

  afterEach(async () => {
    for (const path of tempPaths.splice(0)) {
      await rm(path, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('removes root and installed plugin folders on final uninstall', async () => {
    const root = await mkdtemp(join(tmpdir(), 'vortex-delete-'));
    tempPaths.push(root);
    const sourceDir = join(root, 'welcome');
    const installedDir = join(root, 'installed', 'welcome');
    await mkdir(sourceDir, { recursive: true });
    await mkdir(installedDir, { recursive: true });

    const discovery = {
      discoverManifests: vi.fn().mockResolvedValue([]),
      getInstalledPluginDirectory: vi.fn().mockReturnValue(installedDir),
      getPluginDirectory: vi.fn().mockReturnValue(sourceDir),
      validateManifest: vi.fn(),
    };
    const repository = {
      getPlugin: vi.fn().mockResolvedValue({ id: 'welcome' }),
      setEnabled: vi.fn().mockResolvedValue(undefined),
      writeLog: vi.fn().mockResolvedValue(undefined),
      deletePluginData: vi.fn().mockResolvedValue(undefined),
      deleteGuildPlugin: vi.fn().mockResolvedValue(undefined),
      isPluginUsedByOtherGuilds: vi.fn().mockResolvedValue(false),
      deletePluginRecord: vi.fn().mockResolvedValue(undefined),
      removeMissingPlugins: vi.fn().mockResolvedValue(undefined),
      registerManifest: vi.fn().mockResolvedValue(undefined),
    };
    const manager = new PluginManager(discovery as never, repository as never, { apply: vi.fn() } as never);

    await manager.deletePlugin('1111111111111111111', 'welcome', true);

    expect(existsSync(sourceDir)).toBe(false);
    expect(existsSync(installedDir)).toBe(false);
    expect(repository.deletePluginRecord).toHaveBeenCalledWith('welcome');
    expect(discovery.discoverManifests).toHaveBeenCalled();
  });

  it('marks a dashboard-enabled plugin broken when no dashboard schema exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'vortex-broken-'));
    tempPaths.push(root);
    const installedDir = join(root, 'installed', 'bad-plugin');
    await mkdir(installedDir, { recursive: true });

    const manifest = {
      id: 'bad-plugin',
      name: 'Bad Plugin',
      description: 'Missing dashboard',
      version: '1.0.0',
      author: 'Test',
      minCoreVersion: '0.0.0',
      entry: 'index.js',
      permissions: [],
      capabilities: {
        commands: false,
        events: false,
        dashboard: true,
        database: false,
        templates: false,
        visualEditor: false,
        logs: false,
      },
      dashboard: {
        enabled: true,
        route: '/plugins/bad-plugin',
        label: 'Bad Plugin',
        icon: 'Puzzle',
        tabs: ['overview'],
      },
    };

    const discovery = {
      discoverManifests: vi.fn().mockResolvedValue([manifest]),
      getInstalledPluginDirectory: vi.fn().mockReturnValue(installedDir),
      getPluginDirectory: vi.fn().mockReturnValue(join(root, 'bad-plugin')),
      getBundledPluginDirectory: vi.fn().mockReturnValue(join(root, 'bundled', 'bad-plugin')),
      validateManifest: vi.fn().mockReturnValue(manifest),
    };
    const markBroken = vi.fn().mockResolvedValue(undefined);
    const repository = {
      getPlugin: vi.fn().mockResolvedValue({ id: 'bad-plugin' }),
      setEnabled: vi.fn().mockResolvedValue(undefined),
      writeLog: vi.fn().mockResolvedValue(undefined),
      deletePluginData: vi.fn().mockResolvedValue(undefined),
      deleteGuildPlugin: vi.fn().mockResolvedValue(undefined),
      isPluginUsedByOtherGuilds: vi.fn().mockResolvedValue(false),
      deletePluginRecord: vi.fn().mockResolvedValue(undefined),
      removeMissingPlugins: vi.fn().mockResolvedValue(undefined),
      registerManifest: vi.fn().mockResolvedValue(undefined),
      markBroken,
    };
    const manager = new PluginManager(discovery as never, repository as never, { apply: vi.fn() } as never);

    await manager.reloadManifests();

    expect(markBroken).toHaveBeenCalledWith(
      'bad-plugin',
      'This plugin package is incomplete. It declares a dashboard but does not include one.',
    );
  });

  it('loads the bundled Welcome dashboard when the installed package lacks a schema', async () => {
    const root = await mkdtemp(join(tmpdir(), 'vortex-welcome-'));
    tempPaths.push(root);
    const installedDir = join(root, 'installed', 'welcome');
    const bundledDir = join(root, 'welcome');
    await mkdir(installedDir, { recursive: true });
    await mkdir(bundledDir, { recursive: true });
    await writeFile(
      join(bundledDir, 'dashboard.schema.json'),
      JSON.stringify({
        version: 1,
        contentMode: 'schema',
        tabs: [{ id: 'overview', label: 'Overview', sections: [{ id: 'overview.summary', title: 'Welcome', fields: [], actions: [] }] }],
        defaults: {},
        previewVariables: {},
        defaultMessages: {},
      }),
    );

    const manifest = {
      id: 'welcome',
      name: 'Welcome',
      description: 'Greet members',
      version: '1.0.0',
      author: 'h05',
      minCoreVersion: '0.0.0',
      entry: 'index.js',
      permissions: [],
      capabilities: {
        commands: false,
        events: false,
        dashboard: true,
        database: false,
        templates: false,
        visualEditor: false,
        logs: false,
      },
      dashboard: {
        enabled: true,
        route: '/plugins/welcome',
        label: 'Welcome',
        icon: 'Sparkles',
        tabs: ['overview'],
      },
    };

    const discovery = {
      discoverManifests: vi.fn().mockResolvedValue([manifest]),
      getInstalledPluginDirectory: vi.fn().mockReturnValue(installedDir),
      getPluginDirectory: vi.fn().mockReturnValue(join(root, 'other')),
      getBundledPluginDirectory: vi.fn().mockReturnValue(bundledDir),
      validateManifest: vi.fn().mockReturnValue(manifest),
    };
    const repository = {
      getPlugin: vi.fn().mockResolvedValue({ id: 'welcome' }),
      listForGuild: vi.fn().mockResolvedValue([
        {
          id: 'welcome',
          name: 'Welcome',
          version: '1.0.0',
          description: 'Greet members',
          author: 'h05',
          status: 'INSTALLED',
          brokenReason: null,
          enabled: true,
          guildStatus: 'ENABLED',
          installedAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          dashboard: null,
        },
      ]),
      setEnabled: vi.fn().mockResolvedValue(undefined),
      writeLog: vi.fn().mockResolvedValue(undefined),
      deletePluginData: vi.fn().mockResolvedValue(undefined),
      deleteGuildPlugin: vi.fn().mockResolvedValue(undefined),
      isPluginUsedByOtherGuilds: vi.fn().mockResolvedValue(false),
      deletePluginRecord: vi.fn().mockResolvedValue(undefined),
      removeMissingPlugins: vi.fn().mockResolvedValue(undefined),
      registerManifest: vi.fn().mockResolvedValue(undefined),
      markBroken: vi.fn().mockResolvedValue(undefined),
    };
    const manager = new PluginManager(discovery as never, repository as never, { apply: vi.fn() } as never);

    await manager.reloadManifests();
    const detail = await manager.getPluginDetail('1111111111111111111', 'welcome');
    expect(detail.dashboardContent.mode).toBe('schema');
    expect(detail.dashboardContent.schema?.tabs[0]?.label).toBe('Overview');
    expect(repository.markBroken).not.toHaveBeenCalled();
  });
});
