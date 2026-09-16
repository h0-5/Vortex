import { describe, expect, it } from 'vitest';

import { PluginDiscoveryService } from './plugin-discovery.service.js';

const validManifest = {
  id: 'example-plugin',
  name: 'Example Plugin',
  version: '1.0.0',
  description: 'Manifest validation fixture.',
  author: 'h05',
  minCoreVersion: '0.1.0',
  entry: 'index.js',
  permissions: [],
  capabilities: {
    commands: true,
    events: true,
    dashboard: false,
    database: false,
    templates: false,
    visualEditor: false,
    logs: false,
  },
};

describe('PluginDiscoveryService', () => {
  const service = new PluginDiscoveryService();

  it('validates a strict plugin manifest', () => {
    expect(service.validateManifest(validManifest)).toEqual(validManifest);
  });

  it('rejects unknown manifest fields', () => {
    expect(() => service.validateManifest({ ...validManifest, runtime: 'unsafe' })).toThrow();
  });

  it('rejects plugins that require a newer core version', () => {
    expect(() => service.validateManifest({ ...validManifest, minCoreVersion: '99.0.0' })).toThrow(
      /requires Vortex/u,
    );
  });
});
