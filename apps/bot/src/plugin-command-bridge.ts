import {
  type Client,
  type GuildMember,
} from 'discord.js';
import type { CoreMessage } from '@vortex/types';
import type { Logger } from 'pino';

import { toDiscordReply } from './discord-message.js';
import type { BotPluginRuntime } from './plugin-runtime-bridge.js';

export function registerPluginCommandBridge(
  client: Client,
  runtime: BotPluginRuntime,
  logger: Logger,
  prefix: string,
): void {
  const repliesByAuthorMessage = new Map<string, { channelId: string; replyId: string }>();

  client.on('interactionCreate', (interaction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.channelId) {
      return;
    }
    const roleIds = getInteractionRoleIds(interaction.member);
    void runtime.commands
      .execute(interaction.guildId, interaction.commandName, {
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userId: interaction.user.id,
        memberRoleIds: roleIds,
        commandId: interaction.commandName,
        name: interaction.commandName,
        args: [],
        options: Object.fromEntries(
          interaction.options.data
            .filter((option) => option.value !== undefined)
            .map((option) => [option.name, option.value as string | number | boolean]),
        ),
        respond: async (message: CoreMessage) => {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(toDiscordReply(message));
          } else {
            await interaction.reply(toDiscordReply(message));
          }
        },
      })
      .catch((error: unknown) => logger.error({ error }, 'Slash command dispatch failed'));
  });

  client.on('messageCreate', (message) => {
    if (!message.guildId || message.author.bot || !message.content.startsWith(prefix)) {
      return;
    }
    const [name, ...args] = message.content.slice(prefix.length).trim().split(/\s+/u);
    if (!name) {
      return;
    }
    const configuration = runtime.commands.getConfiguration(message.guildId, name);
    void runtime.commands
      .execute(message.guildId, name, {
        guildId: message.guildId,
        channelId: message.channelId,
        userId: message.author.id,
        memberRoleIds: [...(message.member?.roles.cache.keys() ?? [])],
        commandId: configuration?.commandId ?? name,
        name,
        args,
        options: {},
        respond: async (output: CoreMessage) => {
          const reply = await message.reply(toDiscordReply(output));
          if (configuration?.autoDeleteReplyOnAuthorDelete) {
            repliesByAuthorMessage.set(message.id, {
              channelId: reply.channelId,
              replyId: reply.id,
            });
          }
        },
      })
      .then(async (executed) => {
        if (executed && configuration?.autoDeleteAuthorMessage && message.deletable) {
          await message.delete();
        }
      })
      .catch((error: unknown) =>
        logger.error({ error, messageId: message.id }, 'Prefix command dispatch failed'),
      );
  });

  client.on('messageDelete', (message) => {
    const tracked = repliesByAuthorMessage.get(message.id);
    if (!tracked) {
      return;
    }
    repliesByAuthorMessage.delete(message.id);
    void deleteTrackedReply(client, tracked.channelId, tracked.replyId).catch((error: unknown) =>
      logger.warn({ error, replyId: tracked.replyId }, 'Unable to delete tracked command reply'),
    );
  });
}

function getInteractionRoleIds(member: GuildMember | { roles: string[] } | null): string[] {
  if (!member) {
    return [];
  }
  return Array.isArray(member.roles) ? member.roles : [...member.roles.cache.keys()];
}

async function deleteTrackedReply(
  client: Client,
  channelId: string,
  replyId: string,
): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (channel?.isTextBased() && 'messages' in channel) {
    await channel.messages.delete(replyId);
  }
}
