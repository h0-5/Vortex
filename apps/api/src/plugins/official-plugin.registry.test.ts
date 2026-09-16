import { describe, expect, it } from 'vitest';

import { OfficialPluginRegistry } from './official-plugin.registry.js';

describe('OfficialPluginRegistry', () => {
  const registry = new OfficialPluginRegistry();

  it('recognizes welcome as an official plugin', () => {
    expect(registry.isOfficial('welcome')).toBe(true);
    expect(registry.isOfficial('unknown')).toBe(false);
  });

  it('returns metadata for official plugins without embedding plugin UI or settings', () => {
    const definition = registry.getById('welcome');
    expect(definition).toBeDefined();
    expect(definition!.id).toBe('welcome');
    expect(definition!.expectedManifestId).toBe('welcome');
    expect(definition!.dashboardMode).toBe('schema');
    expect(definition!.schemaPath).toBe('dashboard.schema.json');
  });

  it('returns null dashboard mode for unknown plugins', () => {
    expect(registry.getDashboardMode('unknown')).toBe('none');
  });

  it('checks core version compatibility for official plugins', () => {
    expect(registry.isSupported('welcome', '0.2.5')).toBe(true);
    expect(registry.isSupported('welcome', '0.2.4')).toBe(false);
  });

  it('returns the expected manifest id for official plugins', () => {
    expect(registry.getExpectedManifestId('welcome')).toBe('welcome');
    expect(registry.getExpectedManifestId('unknown')).toBeUndefined();
  });

  it('returns the expected schema path for official plugins', () => {
    expect(registry.getSchemaPath('welcome')).toBe('dashboard.schema.json');
    expect(registry.getSchemaPath('unknown')).toBeUndefined();
  });
});
