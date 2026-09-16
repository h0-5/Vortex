import type { Client } from 'discord.js';
import type { Logger } from 'pino';

import type { GuildStore } from './guild-store.js';

export function registerCoreEvents(client: Client, guildStore: GuildStore, logger: Logger): void {
  client.once('clientReady', (readyClient) => {
    void handleReady(readyClient, guildStore, logger).catch((error: unknown) => {
      logger.error({ error }, 'Initial guild sync failed');
    });
  });

  client.on('guildCreate', (guild) => {
    void guildStore
      .markPresent(guild)
      .then(() => logger.info({ guildId: guild.id, guildName: guild.name }, 'Bot joined a guild'))
      .catch((error: unknown) => {
        logger.error({ error, guildId: guild.id }, 'Guild sync failed');
      });
  });

  client.on('guildDelete', (guild) => {
    guildStore.markAbsent(guild.id);
    logger.info({ guildId: guild.id, guildName: guild.name }, 'Bot left a guild');
  });

  client.on('error', (error) => {
    logger.error({ error }, 'Discord client error');
  });
}

async function handleReady(
  readyClient: Client<true>,
  guildStore: GuildStore,
  logger: Logger,
): Promise<void> {
  logger.info(
    { botUser: readyClient.user.tag, guildCount: readyClient.guilds.cache.size },
    'Discord client is ready',
  );

  await Promise.all(
    readyClient.guilds.cache.map(async (guild) => {
      await guildStore.markPresent(guild);
    }),
  );
  logger.info({ guildCount: readyClient.guilds.cache.size }, 'Initial guild sync completed');
}
