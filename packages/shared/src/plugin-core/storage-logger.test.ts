import { describe, expect, it } from 'vitest';

import { ScopedPluginLogger } from './logger.js';
import { ScopedPluginStorage } from './storage.js';
import { createLogHarness, MemoryStorageRepository, scope } from './test-helpers.js';

describe('scoped storage and logging', () => {
  it('isolates values by guild and plugin', async () => {
    const repository = new MemoryStorageRepository();
    const first = new ScopedPluginStorage(scope, repository);
    const other = new ScopedPluginStorage({ ...scope, pluginId: 'other-plugin' }, repository);
    await first.set('settings', { enabled: true });

    await expect(first.get('settings')).resolves.toEqual({ enabled: true });
    await expect(other.get('settings')).resolves.toBeNull();
  });

  it('writes dashboard-only logs only to the dashboard destination', async () => {
    const harness = createLogHarness({
      ...scope,
      destination: 'DASHBOARD',
      channelId: null,
      outputType: 'text',
      embedColor: null,
      updatedAt: new Date().toISOString(),
    });
    const logger = new ScopedPluginLogger(
      scope,
      harness.settingsReader,
      harness.dashboard,
      harness.discord,
    );
    await logger.info('Enabled');

    expect(harness.dashboard.write).toHaveBeenCalledOnce();
    expect(harness.discord.write).not.toHaveBeenCalled();
  });

  it('writes Discord logs through the mocked destination', async () => {
    const harness = createLogHarness({
      ...scope,
      destination: 'DISCORD',
      channelId: '62345678901234567',
      outputType: 'components_v2',
      embedColor: null,
      updatedAt: new Date().toISOString(),
    });
    const logger = new ScopedPluginLogger(
      scope,
      harness.settingsReader,
      harness.dashboard,
      harness.discord,
    );
    await logger.audit('Configuration changed');

    expect(harness.dashboard.write).not.toHaveBeenCalled();
    expect(harness.discord.write).toHaveBeenCalledOnce();
    expect(harness.discord.write).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'AUDIT' }),
      expect.any(Object),
      expect.objectContaining({ type: 'components_v2' }),
    );
  });
});
