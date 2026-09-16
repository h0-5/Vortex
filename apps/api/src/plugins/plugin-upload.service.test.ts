import { BadRequestException } from '@nestjs/common';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginUploadService } from './plugin-upload.service.js';
import { PluginOperationException } from './plugin-operation.exception.js';
import type { PluginDiscoveryService } from './plugin-discovery.service.js';
import type { PluginManager } from './plugin-manager.service.js';
import type { PluginMigrationService } from './plugin-migration.service.js';
import type { PluginRepository } from './plugin.repository.js';
import type { OfficialPluginRegistry } from './official-plugin.registry.js';
import type { PluginManifest } from '@vortex/types';

const validManifest: PluginManifest = {
  id: 'test-plugin',
  name: 'Test Plugin',
  description: 'A test plugin',
  version: '1.0.0',
  author: 'h05',
  minCoreVersion: '0.0.0',
  entry: 'index.js',
  permissions: [],
  capabilities: {
    commands: false,
    events: false,
    dashboard: false,
    database: false,
    templates: false,
    visualEditor: false,
    logs: false,
  },
};

const validDashboardSchema = {
  version: 1,
  contentMode: 'schema',
  tabs: [
    {
      id: 'settings',
      label: 'Settings',
      sections: [
        {
          id: 'settings.main',
          title: 'Settings',
          fields: [],
          actions: [],
        },
      ],
    },
  ],
  defaults: {},
  previewVariables: {},
  defaultMessages: {},
};

const dashboardManifest: PluginManifest = {
  ...validManifest,
  capabilities: { ...validManifest.capabilities, dashboard: true },
  dashboard: {
    enabled: true,
    route: '/plugins/test-plugin',
    label: 'Test Plugin',
    icon: 'Puzzle',
    tabs: ['settings'],
  },
};

function createMockDeps(overrides?: {
  pluginDir?: string;
  existingPlugin?: boolean;
}) {
  const pluginDir = overrides?.pluginDir ?? join(tmpdir(), `vortex-test-${Date.now()}`);
  return {
    pluginDiscoveryService: {
      validateManifest: vi.fn((manifest: unknown) => manifest as PluginManifest),
      getInstalledPluginDirectory: vi.fn(() => pluginDir),
      getInstalledPluginsDirectory: vi.fn(() => tmpdir()),
      getBundledPluginDirectory: vi.fn(() => tmpdir()),
    } as unknown as PluginDiscoveryService,
    pluginManager: {
      reloadManifests: vi.fn().mockResolvedValue(undefined),
    } as unknown as PluginManager,
    pluginRepository: {
      getPlugin: vi.fn().mockResolvedValue(overrides?.existingPlugin ? { version: '1.0.0' } : null),
      registerManifest: vi.fn().mockResolvedValue(undefined),
      setEnabled: vi.fn().mockResolvedValue(undefined),
    } as unknown as PluginRepository,
    pluginMigrationService: {
      apply: vi.fn().mockResolvedValue(undefined),
    } as unknown as PluginMigrationService,
    officialPluginRegistry: {
      isOfficial: vi.fn().mockReturnValue(false),
      getById: vi.fn().mockReturnValue(undefined),
      getDashboardMode: vi.fn().mockReturnValue('none'),
      isSupported: vi.fn().mockReturnValue(true),
      getExpectedManifestId: vi.fn().mockReturnValue(undefined),
      getSchemaPath: vi.fn().mockReturnValue(undefined),
    } as unknown as OfficialPluginRegistry,
  };
}

async function createZipBuffer(files: Record<string, string>): Promise<Buffer> {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(content, 'utf8'));
  }
  return zip.toBuffer();
}

async function createZipBufferWithUnsafeEntry(entryName: string): Promise<Buffer> {
  const zip = new AdmZip();
  zip.addFile('plugin.json', Buffer.from(JSON.stringify(validManifest), 'utf8'));
  zip.addFile('index.js', Buffer.from('module.exports = {};', 'utf8'));
  zip.addFile('unsafe-entry', Buffer.from(JSON.stringify(validDashboardSchema), 'utf8'));
  const entry = zip.getEntry('unsafe-entry');
  if (!entry) {
    throw new Error('Failed to create unsafe test entry.');
  }
  entry.entryName = entryName;
  return zip.toBuffer();
}

async function createTempFile(content: Buffer): Promise<{ filePath: string; dir: string }> {
  const tempDir = await mkdtemp(join(tmpdir(), 'vortex-upload-'));
  const filePath = join(tempDir, 'plugin.vortex');
  await writeFile(filePath, content);
  return { filePath, dir: tempDir };
}

describe('PluginUploadService', () => {
  let tempPaths: string[] = [];

  beforeEach(() => {
    tempPaths = [];
  });

  afterEach(async () => {
    for (const path of tempPaths) {
      await rm(path, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('uploads a valid plugin and returns the manifest', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(validManifest),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'test-plugin.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('test-plugin');
    expect(deps.pluginMigrationService.apply).toHaveBeenCalled();
    expect(deps.pluginManager.reloadManifests).toHaveBeenCalled();
  });

  it('uploads a dashboard-capable .vortex plugin when dashboard.schema.json is present', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(dashboardManifest),
      'dashboard.schema.json': JSON.stringify(validDashboardSchema),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'test-plugin.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.dashboard?.enabled).toBe(true);
  });

  it('uploads a valid .codenexus plugin package', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(validManifest),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'test-plugin.codenexus',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.codenexus',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('test-plugin');
  });

  it('uploads a dashboard-capable plugin from a single root folder', async () => {
    const zip = await createZipBuffer({
      'welcome/plugin.json': JSON.stringify(dashboardManifest),
      'welcome/dashboard.schema.json': JSON.stringify(validDashboardSchema),
      'welcome/index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'test-plugin.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('test-plugin');
  });

  it('uploads a dashboard-capable plugin from a nested plugins folder', async () => {
    const zip = await createZipBuffer({
      'plugins/welcome/plugin.json': JSON.stringify(dashboardManifest),
      'plugins/welcome/dashboard.schema.json': JSON.stringify(validDashboardSchema),
      'plugins/welcome/index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'test-plugin.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('test-plugin');
  });

  it('rejects dashboard-enabled plugins without dashboard.schema.json', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(dashboardManifest),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'PLUGIN_DASHBOARD_MISSING',
          message: 'This plugin package is incomplete. It declares a dashboard but does not include one.',
        },
      },
    });
    expect(deps.pluginRepository.registerManifest).not.toHaveBeenCalled();
  });

  it('accepts plugins without dashboard.schema.json when dashboard is disabled', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(validManifest),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'plugin.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.dashboard).toBeUndefined();
    expect(deps.pluginRepository.registerManifest).toHaveBeenCalled();
  });

  it('rejects unsupported archive extensions', async () => {
    const { filePath, dir } = await createTempFile(Buffer.from('not a zip'));
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.zip',
          encoding: '7bit',
          mimetype: 'text/plain',
          size: 10,
          destination: '',
          filename: 'plugin.zip',
          path: filePath,
          buffer: Buffer.from('not a zip'),
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an archive missing plugin.json', async () => {
    const zip = await createZipBuffer({ 'index.js': 'module.exports = {};' });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow('missing plugin.json');
  });

  it('rejects archives containing path traversal entries', async () => {
    const zip = await createZipBufferWithUnsafeEntry('../dashboard.schema.json');
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow('unsafe file paths');
  });

  it('rejects archives containing absolute paths', async () => {
    const zip = await createZipBufferWithUnsafeEntry('/dashboard.schema.json');
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow('unsafe file paths');
  });

  it('rejects archives containing executables', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(validManifest),
      'index.js': 'module.exports = {};',
      'install.sh': '#!/bin/bash',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow('executables');
  });

  it('rejects archives containing .env files', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(validManifest),
      'index.js': 'module.exports = {};',
      '.env': 'SECRET=value',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow('.env files');
  });

  it('rejects a plugin that is already installed', async () => {
    const pluginDir = await mkdtemp(join(tmpdir(), 'vortex-existing-'));
    tempPaths.push(pluginDir);

    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(validManifest),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps({ pluginDir });
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow(PluginOperationException);
  });

  it('installs a registered plugin when the install folder is missing', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(validManifest),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps({ existingPlugin: true });
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'plugin.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('test-plugin');
    expect(deps.pluginRepository.setEnabled).toHaveBeenCalledWith('1111111111111111111', 'test-plugin', false);
  });

  it('returns a structured conflict when a different plugin version is registered', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify({ ...validManifest, version: '2.0.0' }),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps({ existingPlugin: true });
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'PLUGIN_VERSION_CONFLICT',
          message: 'Plugin "test-plugin" is already registered with version 1.0.0.',
          details: { pluginId: 'test-plugin', existingVersion: '1.0.0', uploadedVersion: '2.0.0' },
        },
      },
    });
  });

  it('throws PluginOperationException when file.path is undefined', async () => {
    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: 100,
          destination: '',
          filename: 'plugin.vortex',
          path: undefined as unknown as string,
          buffer: Buffer.from(''),
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow(PluginOperationException);
  });

  it('accepts a TypeScript plugin without compiled JavaScript output', async () => {
    const tsManifest = { ...validManifest, entry: 'index.ts' };
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(tsManifest),
      'index.ts': 'export default {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'plugin.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('test-plugin');
  });

  it('rejects a plugin when no runtime entry exists', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(validManifest),
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toThrow('Plugin entry "index.js" was not found');
  });

  it('accepts the official Welcome plugin when dashboard.schema.json is included', async () => {
    const welcomeManifest = {
      id: 'welcome',
      name: 'Welcome',
      description: 'Advanced welcome plugin',
      version: '1.0.0',
      author: 'h05',
      minCoreVersion: '0.0.0',
      entry: 'index.ts',
      permissions: [],
      capabilities: {
        commands: true,
        events: true,
        dashboard: true,
        database: true,
        templates: true,
        visualEditor: true,
        logs: true,
      },
      dashboard: {
        enabled: true,
        route: '/plugins/welcome',
        label: 'Welcome',
        icon: 'Sparkles',
        tabs: ['overview', 'welcome'],
      },
      packageMetadata: {
        packageVersion: '1.1.0',
        builtAt: '2026-06-20T16:00:00.000Z',
      },
    };
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(welcomeManifest),
      'dashboard.schema.json': JSON.stringify(validDashboardSchema),
      'index.ts': 'export default {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'welcome.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'welcome.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('welcome');
    expect(result.dashboard?.enabled).toBe(true);
    expect(deps.pluginRepository.registerManifest).toHaveBeenCalled();
  });

  it('rejects the official Welcome plugin when dashboard.schema.json is missing', async () => {
    const welcomeManifest = {
      id: 'welcome',
      name: 'Welcome',
      description: 'Advanced welcome plugin',
      version: '1.0.0',
      author: 'h05',
      minCoreVersion: '0.0.0',
      entry: 'index.ts',
      permissions: [],
      capabilities: {
        commands: true,
        events: true,
        dashboard: true,
        database: true,
        templates: true,
        visualEditor: true,
        logs: true,
      },
      dashboard: {
        enabled: true,
        route: '/plugins/welcome',
        label: 'Welcome',
        icon: 'Sparkles',
        tabs: ['overview', 'welcome'],
      },
      packageMetadata: {
        packageVersion: '1.1.0',
        builtAt: '2026-06-20T16:00:00.000Z',
      },
    };
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(welcomeManifest),
      'index.ts': 'export default {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    deps.officialPluginRegistry.isOfficial = vi.fn().mockReturnValue(true);
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'welcome.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'welcome.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'PLUGIN_DASHBOARD_MISSING',
          message: 'This plugin package is incomplete. It declares a dashboard but does not include one.',
        },
      },
    });
    expect(deps.pluginRepository.registerManifest).not.toHaveBeenCalled();
  });

  it('does not register a plugin when validation fails', async () => {
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(dashboardManifest),
      'index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'plugin.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'plugin.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toBeDefined();

    expect(deps.pluginRepository.registerManifest).not.toHaveBeenCalled();
    expect(deps.pluginMigrationService.apply).not.toHaveBeenCalled();
  });

  it('accepts a TypeScript plugin when dist/ contains the compiled JS entry', async () => {
    const tsManifest = { ...validManifest, entry: 'src/index.ts' };
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(tsManifest),
      'src/index.ts': 'export default {};',
      'dist/src/index.js': 'module.exports = {};',
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'plugin.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'plugin.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('test-plugin');
  });

  it('rejects an outdated Welcome plugin package without packageMetadata', async () => {
    const oldWelcomeManifest = {
      id: 'welcome',
      name: 'Welcome',
      version: '1.0.0',
      author: 'h05',
      minCoreVersion: '0.2.5',
      entry: 'index.ts',
      permissions: [],
      capabilities: {
        commands: true,
        events: true,
        dashboard: true,
        database: true,
        templates: true,
        visualEditor: true,
        logs: true,
      },
      dashboard: {
        enabled: true,
        route: '/plugins/welcome',
        label: 'Welcome',
        icon: 'Sparkles',
        tabs: ['overview', 'welcome'],
      },
    };
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(oldWelcomeManifest),
      'index.ts': 'export default {};',
      'dashboard.schema.json': JSON.stringify(validDashboardSchema),
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    deps.officialPluginRegistry.isOfficial = vi.fn().mockReturnValue(true);
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'welcome.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'welcome.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'PLUGIN_PACKAGE_OUTDATED',
          message: 'This Welcome plugin package is outdated. Please build or download the latest package.',
        },
      },
    });
  });

  it('rejects an outdated Welcome plugin package with version < 1.1.0', async () => {
    const oldWelcomeManifest = {
      id: 'welcome',
      name: 'Welcome',
      version: '1.0.0',
      author: 'h05',
      minCoreVersion: '0.2.5',
      entry: 'index.ts',
      permissions: [],
      capabilities: {
        commands: true,
        events: true,
        dashboard: true,
        database: true,
        templates: true,
        visualEditor: true,
        logs: true,
      },
      dashboard: {
        enabled: true,
        route: '/plugins/welcome',
        label: 'Welcome',
        icon: 'Sparkles',
        tabs: ['overview', 'welcome'],
      },
      packageMetadata: {
        packageVersion: '1.0.0',
        builtAt: '2026-01-01T00:00:00.000Z',
      },
    };
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(oldWelcomeManifest),
      'index.ts': 'export default {};',
      'dashboard.schema.json': JSON.stringify(validDashboardSchema),
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    deps.officialPluginRegistry.isOfficial = vi.fn().mockReturnValue(true);
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    await expect(
      service.upload(
        {
          fieldname: 'file',
          originalname: 'welcome.vortex',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          size: zip.length,
          destination: '',
          filename: 'welcome.vortex',
          path: filePath,
          buffer: zip,
        },
        '1111111111111111111',
      ),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'PLUGIN_PACKAGE_OUTDATED',
          message: 'This Welcome plugin package is outdated. Please build or download the latest package.',
        },
      },
    });
  });

  it('accepts a current Welcome plugin package with packageMetadata >= 1.1.0', async () => {
    const newWelcomeManifest = {
      id: 'welcome',
      name: 'Welcome',
      version: '1.1.0',
      author: 'h05',
      minCoreVersion: '0.2.5',
      entry: 'index.ts',
      permissions: [],
      capabilities: {
        commands: true,
        events: true,
        dashboard: true,
        database: true,
        templates: true,
        visualEditor: true,
        logs: true,
      },
      dashboard: {
        enabled: true,
        route: '/plugins/welcome',
        label: 'Welcome',
        icon: 'Sparkles',
        tabs: ['overview', 'welcome'],
      },
      packageMetadata: {
        packageVersion: '1.1.0',
        builtAt: '2026-06-20T16:00:00.000Z',
        sourceCommit: 'abc1234',
        coreCompatibility: '0.2.5',
      },
    };
    const zip = await createZipBuffer({
      'plugin.json': JSON.stringify(newWelcomeManifest),
      'index.ts': 'export default {};',
      'dashboard.schema.json': JSON.stringify(validDashboardSchema),
    });
    const { filePath, dir } = await createTempFile(zip);
    tempPaths.push(dir);

    const deps = createMockDeps();
    deps.officialPluginRegistry.isOfficial = vi.fn().mockReturnValue(true);
    const service = new PluginUploadService(
      deps.pluginDiscoveryService,
      deps.pluginManager,
      deps.pluginRepository,
      deps.pluginMigrationService,
      deps.officialPluginRegistry,
    );

    const result = await service.upload(
      {
        fieldname: 'file',
        originalname: 'welcome.vortex',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: zip.length,
        destination: '',
        filename: 'welcome.vortex',
        path: filePath,
        buffer: zip,
      },
      '1111111111111111111',
    );

    expect(result.id).toBe('welcome');
    expect(result.version).toBe('1.1.0');
  });
});
