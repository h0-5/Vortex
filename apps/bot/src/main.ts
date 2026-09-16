import { createDatabase } from '@vortex/database';
import { parseBotEnvironment } from '@vortex/shared';
import { Client, GatewayIntentBits } from 'discord.js';
import pino, { type LoggerOptions } from 'pino';

import { GuildStore } from './guild-store.js';
import { registerPluginCommandBridge } from './plugin-command-bridge.js';
import { PluginHost } from './plugin-host.js';
import { registerPluginInteractionBridge } from './plugin-interaction-bridge.js';
import { createBotPluginRuntime, registerPluginEventBridge } from './plugin-runtime-bridge.js';
import { registerCoreEvents } from './register-core-events.js';

async function bootstrap(): Promise<void> {
  const environment = parseBotEnvironment(process.env);
  const loggerOptions: LoggerOptions = { level: environment.LOG_LEVEL };
  if (environment.NODE_ENV === 'development') {
    loggerOptions.transport = {
      target: 'pino-pretty',
      options: { singleLine: true },
    };
  }
  const logger = pino(loggerOptions);
  try {
    const { db, pool } = createDatabase(environment.DATABASE_URL);
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildMessageReactions,
    ];
    if (environment.DISCORD_GUILD_MEMBERS_INTENT) {
      intents.push(GatewayIntentBits.GuildMembers);
    }
    if (environment.DISCORD_MESSAGE_CONTENT_INTENT) {
      intents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent);
    }
    const client = new Client({ intents });

    registerCoreEvents(client, new GuildStore(db), logger);
    const pluginRuntime = createBotPluginRuntime(db);
    registerPluginEventBridge(client, pluginRuntime, logger);
    registerPluginCommandBridge(client, pluginRuntime, logger, environment.COMMAND_PREFIX);
    registerPluginInteractionBridge(client, pluginRuntime, logger);
    const pluginHost = new PluginHost(db, client, pluginRuntime, logger);
    client.once('clientReady', () => {
      void pluginHost.start().catch((error: unknown) =>
        logger.error({ error }, 'Plugin host failed to start'),
      );
    });
    registerShutdownHandlers(client, pool.end.bind(pool), pluginHost, logger);
    logger.info('Connecting bot to Discord');
    await client.login(environment.DISCORD_BOT_TOKEN);
  } catch (error) {
    logger.error({ error }, 'Bot bootstrap failed');
    process.exit(1);
  }
}

function registerShutdownHandlers(
  client: Client,
  closeDatabase: () => Promise<void>,
  pluginHost: PluginHost,
  logger: pino.Logger,
): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down bot');
    await pluginHost.stop();
    await client.destroy();
    await closeDatabase();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT').catch((error: unknown) => logger.error({ error }, 'Shutdown failed'));
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM').catch((error: unknown) => logger.error({ error }, 'Shutdown failed'));
  });
}

void bootstrap();
