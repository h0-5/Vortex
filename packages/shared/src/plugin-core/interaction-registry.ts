import type {
  PluginComponentHandler,
  PluginComponentInteraction,
  PluginInteractionKind,
  PluginLogger,
  PluginScope,
  PluginStateReader,
} from '@vortex/core';

interface InteractionSubscription extends PluginScope {
  kind: PluginInteractionKind;
  customId: string;
  handler: PluginComponentHandler;
  logger: PluginLogger;
}

export class InteractionRegistry {
  private readonly subscriptions = new Map<string, InteractionSubscription>();

  constructor(private readonly pluginState: PluginStateReader) {}

  register(
    scope: PluginScope,
    kind: PluginInteractionKind,
    customId: string,
    handler: PluginComponentHandler,
    logger: PluginLogger,
  ): () => void {
    const key = this.key(scope.guildId, kind, customId);
    const existing = this.subscriptions.get(key);
    if (existing && existing.pluginId !== scope.pluginId) {
      throw new Error(
        `Interaction ${kind}:${customId} already belongs to plugin ${existing.pluginId}.`,
      );
    }
    const subscription = { ...scope, kind, customId, handler, logger };
    this.subscriptions.set(key, subscription);
    return () => this.subscriptions.delete(key);
  }

  resolve(
    guildId: string,
    kind: PluginInteractionKind,
    customId: string,
  ): InteractionSubscription | null {
    const exact = this.subscriptions.get(this.key(guildId, kind, customId));
    if (exact) {
      return exact;
    }
    let best: InteractionSubscription | null = null;
    for (const subscription of this.subscriptions.values()) {
      if (subscription.kind !== kind || subscription.guildId !== guildId) {
        continue;
      }
      if (customId.startsWith(`${subscription.customId}:`)) {
        if (!best || subscription.customId.length > best.customId.length) {
          best = subscription;
        }
      }
    }
    return best;
  }

  async dispatch(
    guildId: string,
    kind: PluginInteractionKind,
    customId: string,
    interaction: PluginComponentInteraction,
  ): Promise<boolean> {
    const subscription = this.resolve(guildId, kind, customId);
    if (!subscription) {
      return false;
    }
    if (!(await this.pluginState.isEnabled(subscription))) {
      return false;
    }
    try {
      await subscription.handler(interaction);
      await subscription.logger.info(`Plugin interaction ${kind}:${customId} handled.`, {
        userId: interaction.userId,
        channelId: interaction.channelId,
      });
      return true;
    } catch (error) {
      await subscription.logger.error(`Plugin interaction ${kind}:${customId} failed.`, {
        userId: interaction.userId,
        channelId: interaction.channelId,
        error: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
  }

  unregisterScope(scope: PluginScope): void {
    for (const [key, subscription] of this.subscriptions) {
      if (
        subscription.guildId === scope.guildId &&
        subscription.pluginId === scope.pluginId
      ) {
        this.subscriptions.delete(key);
      }
    }
  }

  private key(guildId: string, kind: PluginInteractionKind, customId: string): string {
    return `${guildId}:${kind}:${customId}`;
  }
}