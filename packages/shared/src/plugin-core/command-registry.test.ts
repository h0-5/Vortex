import { describe, expect, it, vi } from 'vitest';

import type { CommandInvocation } from '../plugin-contracts.js';
import { CommandRegistry } from './command-registry.js';
import { ScopedPluginPermissions } from './permission-service.js';
import { createLogger, createPermissionReaders, createPluginState, scope } from './test-helpers.js';

function createRegistry() {
  const registry = new CommandRegistry(createPluginState());
  const readers = createPermissionReaders();
  const permissionApi = new ScopedPluginPermissions(scope, readers.management, readers.commands);
  return { registry, permissionApi, logger: createLogger() };
}

const invocation: CommandInvocation = {
  guildId: scope.guildId,
  channelId: '22345678901234567',
  userId: '32345678901234567',
  memberRoleIds: [],
  commandId: 'ignored',
  name: 'ignored',
  args: [],
  options: {},
  respond: vi.fn(),
};

describe('CommandRegistry', () => {
  it('registers and executes a command owned by a plugin', async () => {
    const { registry, permissionApi, logger } = createRegistry();
    const handler = vi.fn();
    registry.register(
      scope,
      { name: 'status', description: 'Show status', type: 'BOTH', handler },
      permissionApi,
      logger,
    );

    await expect(registry.execute(scope.guildId, 'status', invocation)).resolves.toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('prevents duplicate final names across plugins in one guild', () => {
    const { registry, permissionApi, logger } = createRegistry();
    registry.register(
      scope,
      { name: 'status', description: 'First', type: 'SLASH', handler: vi.fn() },
      permissionApi,
      logger,
    );

    expect(() =>
      registry.register(
        { ...scope, pluginId: 'other-plugin' },
        { name: 'status', description: 'Second', type: 'SLASH', handler: vi.fn() },
        permissionApi,
        logger,
      ),
    ).toThrow(/conflicts/);
  });

  it('resolves prefix aliases', () => {
    const { registry, permissionApi, logger } = createRegistry();
    registry.register(
      scope,
      {
        name: 'configuration',
        description: 'Configure',
        type: 'PREFIX',
        aliases: ['config', 'cfg'],
        handler: vi.fn(),
      },
      permissionApi,
      logger,
    );

    expect(registry.resolve(scope.guildId, 'cfg')?.commandId).toBe('configuration');
  });

  it('validates slash command overrides', () => {
    const { registry, permissionApi, logger } = createRegistry();
    expect(() =>
      registry.register(
        scope,
        { name: 'status', description: 'Show status', type: 'SLASH', handler: vi.fn() },
        permissionApi,
        logger,
        { name: 'Invalid Name' },
      ),
    ).toThrow();
  });
});
