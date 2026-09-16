import type { PluginEventName } from '@vortex/types';

import type {
  PluginEventHandler,
  PluginEventPayload,
  PluginLogger,
  PluginScope,
  PluginStateReader,
} from '../plugin-contracts.js';

interface EventSubscription extends PluginScope {
  handler: PluginEventHandler;
  logger: PluginLogger;
}

export class EventRegistry {
  private readonly subscriptions = new Map<PluginEventName, Set<EventSubscription>>();

  constructor(private readonly pluginState: PluginStateReader) {}

  on(
    scope: PluginScope,
    event: PluginEventName,
    handler: PluginEventHandler,
    logger: PluginLogger,
  ): () => void {
    const subscription = { ...scope, handler, logger };
    const eventSubscriptions = this.subscriptions.get(event) ?? new Set<EventSubscription>();
    eventSubscriptions.add(subscription);
    this.subscriptions.set(event, eventSubscriptions);
    return () => eventSubscriptions.delete(subscription);
  }

  async dispatch(event: PluginEventName, payload: PluginEventPayload): Promise<void> {
    const subscriptions = [...(this.subscriptions.get(event) ?? [])];
    await Promise.all(
      subscriptions.map(async (subscription) => {
        if (payload.guildId && payload.guildId !== subscription.guildId) {
          return;
        }
        if (!(await this.pluginState.isEnabled(subscription))) {
          return;
        }
        try {
          await subscription.handler(payload);
        } catch (error) {
          await subscription.logger.error(`Plugin event ${event} failed.`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
  }

  unregisterScope(scope: PluginScope): void {
    for (const subscriptions of this.subscriptions.values()) {
      for (const subscription of subscriptions) {
        if (
          subscription.guildId === scope.guildId &&
          subscription.pluginId === scope.pluginId
        ) {
          subscriptions.delete(subscription);
        }
      }
    }
  }
}
