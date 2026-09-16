import { describe, expect, it, vi } from 'vitest';

import { EventRegistry } from './event-registry.js';
import { createLogger, createPluginState, scope } from './test-helpers.js';

describe('EventRegistry', () => {
  it('dispatches only to the matching guild', async () => {
    const registry = new EventRegistry(createPluginState());
    const handler = vi.fn();
    registry.on(scope, 'guildMemberAdd', handler, createLogger());

    await registry.dispatch('guildMemberAdd', { guildId: scope.guildId, userId: 'user' });
    await registry.dispatch('guildMemberAdd', {
      guildId: '92345678901234567',
      userId: 'other',
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('blocks events for disabled plugins', async () => {
    const registry = new EventRegistry(createPluginState(false));
    const handler = vi.fn();
    registry.on(scope, 'messageCreate', handler, createLogger());

    await registry.dispatch('messageCreate', { guildId: scope.guildId });
    expect(handler).not.toHaveBeenCalled();
  });

  it('isolates handler errors and logs them', async () => {
    const registry = new EventRegistry(createPluginState());
    const logger = createLogger();
    registry.on(
      scope,
      'inviteCreate',
      () => {
        throw new Error('failure');
      },
      logger,
    );

    await expect(
      registry.dispatch('inviteCreate', { guildId: scope.guildId }),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
