import type { PluginComponentInteraction } from '@vortex/core';
import { describe, expect, it, vi } from 'vitest';

import { InteractionRegistry } from './interaction-registry.js';
import { createLogger, createPluginState, scope } from './test-helpers.js';

function interaction(
  customId: string,
  kind: PluginComponentInteraction['kind'] = 'button',
): PluginComponentInteraction {
  return {
    guildId: scope.guildId,
    channelId: '12345678901234567',
    userId: '98765432109876543',
    memberRoleIds: [],
    messageId: null,
    customId,
    kind,
    respond: vi.fn(),
  };
}

describe('InteractionRegistry', () => {
  it('registers and resolves an exact custom id', () => {
    const registry = new InteractionRegistry(createPluginState());
    const handler = vi.fn();
    registry.register(scope, 'button', 'tickets:open', handler, createLogger());

    const resolved = registry.resolve(scope.guildId, 'button', 'tickets:open');
    expect(resolved?.handler).toBe(handler);
  });

  it('resolves a prefixed custom id by longest prefix', () => {
    const registry = new InteractionRegistry(createPluginState());
    const general = vi.fn();
    const specific = vi.fn();
    registry.register(scope, 'button', 'tickets', general, createLogger());
    registry.register(scope, 'button', 'tickets:open', specific, createLogger());

    const resolved = registry.resolve(scope.guildId, 'button', 'tickets:open:support');
    expect(resolved?.handler).toBe(specific);
  });

  it('does not match a custom id outside its prefix', () => {
    const registry = new InteractionRegistry(createPluginState());
    registry.register(scope, 'button', 'tickets:open', vi.fn(), createLogger());

    expect(registry.resolve(scope.guildId, 'button', 'tickets:closed')).toBeNull();
  });

  it('keeps kinds separate', () => {
    const registry = new InteractionRegistry(createPluginState());
    registry.register(scope, 'button', 'tickets:open', vi.fn(), createLogger());

    expect(registry.resolve(scope.guildId, 'select', 'tickets:open')).toBeNull();
  });

  it('filters by guild', () => {
    const registry = new InteractionRegistry(createPluginState());
    registry.register(scope, 'button', 'tickets:open', vi.fn(), createLogger());

    expect(registry.resolve('11111111111111111', 'button', 'tickets:open')).toBeNull();
  });

  it('rejects a conflicting custom id from another plugin', () => {
    const registry = new InteractionRegistry(createPluginState());
    registry.register(scope, 'button', 'shared:id', vi.fn(), createLogger());

    expect(() =>
      registry.register(
        { guildId: scope.guildId, pluginId: 'other-plugin' },
        'button',
        'shared:id',
        vi.fn(),
        createLogger(),
      ),
    ).toThrow(/already belongs/);
  });

  it('allows a plugin to re-register its own custom id', () => {
    const registry = new InteractionRegistry(createPluginState());
    const first = vi.fn();
    const second = vi.fn();
    registry.register(scope, 'button', 'tickets:open', first, createLogger());
    registry.register(scope, 'button', 'tickets:open', second, createLogger());

    expect(registry.resolve(scope.guildId, 'button', 'tickets:open')?.handler).toBe(second);
  });

  it('dispatches to the enabled handler and returns true', async () => {
    const registry = new InteractionRegistry(createPluginState(true));
    const handler = vi.fn();
    registry.register(scope, 'button', 'tickets:open', handler, createLogger());

    const handled = await registry.dispatch(scope.guildId, 'button', 'tickets:open', interaction('tickets:open'));
    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not dispatch to a disabled plugin', async () => {
    const registry = new InteractionRegistry(createPluginState(false));
    const handler = vi.fn();
    registry.register(scope, 'button', 'tickets:open', handler, createLogger());

    const handled = await registry.dispatch(scope.guildId, 'button', 'tickets:open', interaction('tickets:open'));
    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns false when no handler matches', async () => {
    const registry = new InteractionRegistry(createPluginState());

    const handled = await registry.dispatch(scope.guildId, 'button', 'unknown:action', interaction('unknown:action'));
    expect(handled).toBe(false);
  });

  it('logs the error but counts the interaction as handled', async () => {
    const registry = new InteractionRegistry(createPluginState());
    const logger = createLogger();
    registry.register(scope, 'button', 'tickets:open', () => {
      throw new Error('boom');
    }, logger);

    const handled = await registry.dispatch(scope.guildId, 'button', 'tickets:open', interaction('tickets:open'));
    expect(handled).toBe(true);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('removes subscriptions for a scope', () => {
    const registry = new InteractionRegistry(createPluginState());
    registry.register(scope, 'button', 'tickets:open', vi.fn(), createLogger());
    registry.register(scope, 'select', 'tickets:category', vi.fn(), createLogger());
    registry.unregisterScope(scope);

    expect(registry.resolve(scope.guildId, 'button', 'tickets:open')).toBeNull();
    expect(registry.resolve(scope.guildId, 'select', 'tickets:category')).toBeNull();
  });

  it('keeps subscriptions of other plugins after scope removal', () => {
    const registry = new InteractionRegistry(createPluginState());
    registry.register(scope, 'button', 'tickets:open', vi.fn(), createLogger());
    const other = { guildId: scope.guildId, pluginId: 'other-plugin' };
    registry.register(other, 'button', 'other:open', vi.fn(), createLogger());
    registry.unregisterScope(scope);

    expect(registry.resolve(scope.guildId, 'button', 'tickets:open')).toBeNull();
    expect(registry.resolve(scope.guildId, 'button', 'other:open')).not.toBeNull();
  });
});