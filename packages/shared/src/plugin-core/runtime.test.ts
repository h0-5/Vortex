import { describe, expect, it, vi } from 'vitest';

import { CommandRegistry } from './command-registry.js';
import { EventRegistry } from './event-registry.js';
import { InteractionRegistry } from './interaction-registry.js';
import { pluginComponents, pluginEmbeds, pluginMessages } from './message-builder.js';
import { PluginRegistry, PluginRuntime } from './runtime.js';
import { ScopedPluginDatabase, ScopedPluginStorage } from './storage.js';
import { createLogger, createPluginState, MemoryStorageRepository, scope } from './test-helpers.js';
import { VariableRegistry } from './variable-registry.js';

describe('PluginRuntime', () => {
  it('provides only controlled Core APIs and isolates lifecycle failures', async () => {
    const registry = new PluginRegistry();
    registry.register(scope.pluginId, {
      onEnable: () => {
        throw new Error('failure');
      },
    });
    const runtime = new PluginRuntime(
      registry,
      new CommandRegistry(createPluginState()),
      new EventRegistry(createPluginState()),
      new InteractionRegistry(createPluginState()),
    );
    const logger = createLogger();
    const storage = new ScopedPluginStorage(scope, new MemoryStorageRepository());
    const context = runtime.createContext(scope, {
      logger,
      permissions: {
        canManagePlugin: vi.fn().mockResolvedValue(true),
        canRunCommand: vi.fn().mockResolvedValue(true),
      },
      variables: new VariableRegistry(),
      templates: {
        save: vi.fn(),
        get: vi.fn(),
        list: vi.fn(),
      },
      messages: pluginMessages,
      embeds: pluginEmbeds,
      components: pluginComponents,
      storage,
      database: new ScopedPluginDatabase(storage),
    });

    expect(context).not.toHaveProperty('client');
    expect(context).not.toHaveProperty('environment');
    expect(context).not.toHaveProperty('filesystem');
    await expect(runtime.runLifecycle(scope, 'onEnable', context)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
