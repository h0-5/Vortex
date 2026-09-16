import { guildPlugins, pluginLogSettings, type Database } from '@vortex/database';
import {
  CommandRegistry,
  EventRegistry,
  InteractionRegistry,
  PluginRegistry,
  PluginRuntime,
  type PluginLogSettingsReader,
  type PluginEventName,
  type PluginEventPayload,
  type PluginScope,
  type PluginStateReader,
} from '@vortex/shared';
import type { PluginLogSettings } from '@vortex/types';
import type { Client, ClientEvents } from 'discord.js';
import { and, eq } from 'drizzle-orm';
import type { Logger } from 'pino';

export class DatabasePluginStateReader implements PluginStateReader {
  constructor(private readonly database: Database) {}

  async isEnabled(scope: PluginScope): Promise<boolean> {
    const [row] = await this.database
      .select({ enabled: guildPlugins.enabled })
      .from(guildPlugins)
      .where(
        and(eq(guildPlugins.guildId, scope.guildId), eq(guildPlugins.pluginId, scope.pluginId)),
      )
      .limit(1);
    return row?.enabled ?? false;
  }
}

export class DatabaseLogSettingsReader implements PluginLogSettingsReader {
  constructor(private readonly database: Database) {}

  async get(scope: PluginScope): Promise<PluginLogSettings> {
    const [row] = await this.database
      .select()
      .from(pluginLogSettings)
      .where(
        and(
          eq(pluginLogSettings.guildId, scope.guildId),
          eq(pluginLogSettings.pluginId, scope.pluginId),
        ),
      )
      .limit(1);
    if (!row) {
      return {
        ...scope,
        destination: 'DASHBOARD',
        channelId: null,
        outputType: 'text',
        embedColor: null,
        updatedAt: new Date(0).toISOString(),
      };
    }
    return { ...row, updatedAt: row.updatedAt.toISOString() };
  }
}

export interface BotPluginRuntime {
  commands: CommandRegistry;
  events: EventRegistry;
  interactions: InteractionRegistry;
  registry: PluginRegistry;
  runtime: PluginRuntime;
  pluginState: PluginStateReader;
  logSettingsReader: PluginLogSettingsReader;
}

export function createBotPluginRuntime(database: Database): BotPluginRuntime {
  const pluginState = new DatabasePluginStateReader(database);
  const commands = new CommandRegistry(pluginState);
  const events = new EventRegistry(pluginState);
  const interactions = new InteractionRegistry(pluginState);
  const registry = new PluginRegistry();
  const runtime = new PluginRuntime(registry, commands, events, interactions);
  const logSettingsReader = new DatabaseLogSettingsReader(database);
  return { commands, events, interactions, registry, runtime, pluginState, logSettingsReader };
}

export function registerPluginEventBridge(
  client: Client,
  runtime: BotPluginRuntime,
  logger: Logger,
): void {
  bridge(
    client,
    'guildCreate',
    'guildCreate',
    (guild) => ({
      guildId: guild.id,
      guildName: guild.name,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'guildDelete',
    'guildDelete',
    (guild) => ({
      guildId: guild.id,
      guildName: guild.name,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'guildMemberAdd',
    'guildMemberAdd',
    (member) => ({
      guildId: member.guild.id,
      serverId: member.guild.id,
      serverName: member.guild.name,
      serverIcon: member.guild.iconURL({ size: 128 }) ?? null,
      memberCount: member.guild.memberCount,
      userId: member.id,
      userName: member.user.username,
      userDisplayName: member.user.globalName ?? member.user.displayName ?? member.user.username,
      userAvatar: member.user.displayAvatarURL({ size: 128 }),
      userCreatedAt: member.user.createdAt.toISOString(),
      userBot: member.user.bot,
      roleIds: [...member.roles.cache.keys()],
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'guildMemberRemove',
    'guildMemberRemove',
    (member) => ({
      guildId: member.guild.id,
      serverId: member.guild.id,
      serverName: member.guild.name,
      serverIcon: member.guild.iconURL({ size: 128 }) ?? null,
      memberCount: member.guild.memberCount,
      userId: member.id,
      userName: member.user.username,
      userDisplayName: member.user.globalName ?? member.user.displayName ?? member.user.username,
      userAvatar: member.user.displayAvatarURL({ size: 128 }),
      userCreatedAt: member.user.createdAt.toISOString(),
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'interactionCreate',
    'interactionCreate',
    (interaction) => ({
      guildId: interaction.guildId ?? undefined,
      channelId: interaction.channelId ?? undefined,
      userId: interaction.user.id,
      interactionType: interaction.type,
      commandName: interaction.isCommand() ? interaction.commandName : undefined,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'messageCreate',
    'messageCreate',
    (message) => ({
      guildId: message.guildId ?? undefined,
      serverId: message.guildId ?? undefined,
      serverName: message.guild?.name ?? undefined,
      serverIcon: message.guild?.iconURL({ size: 128 }) ?? undefined,
      memberCount: message.guild?.memberCount ?? undefined,
      channelId: message.channelId,
      messageId: message.id,
      authorId: message.author.id,
      userName: message.author.username,
      userDisplayName: message.member?.displayName ?? message.author.displayName ?? message.author.username,
      userAvatar: message.author.displayAvatarURL({ size: 128 }),
      userBot: message.author.bot,
      memberRoleIds: message.member ? [...message.member.roles.cache.keys()] : undefined,
      content: message.content,
      replyToAuthorId: message.mentions.repliedUser?.id ?? undefined,
      replyToAuthorName: message.mentions.repliedUser?.username ?? undefined,
      replyToAuthorDisplayName:
        message.mentions.repliedUser?.globalName ??
        message.mentions.repliedUser?.displayName ??
        message.mentions.repliedUser?.username ??
        undefined,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'guildBanAdd',
    'guildBanAdd',
    (ban) => ({
      guildId: ban.guild.id,
      serverId: ban.guild.id,
      serverName: ban.guild.name,
      userId: ban.user.id,
      userName: ban.user.username,
      userDisplayName: ban.user.globalName ?? ban.user.displayName ?? ban.user.username,
      userAvatar: ban.user.displayAvatarURL({ size: 128 }),
      reason: ban.reason,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'guildBanRemove',
    'guildBanRemove',
    (ban) => ({
      guildId: ban.guild.id,
      serverId: ban.guild.id,
      serverName: ban.guild.name,
      userId: ban.user.id,
      userName: ban.user.username,
      userDisplayName: ban.user.globalName ?? ban.user.displayName ?? ban.user.username,
      userAvatar: ban.user.displayAvatarURL({ size: 128 }),
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'messageDelete',
    'messageDelete',
    (message) => ({
      guildId: message.guildId ?? undefined,
      channelId: message.channelId,
      messageId: message.id,
      authorId: message.author?.id,
      authorName: message.author?.username,
      authorDisplayName: message.author?.globalName ?? message.author?.displayName ?? message.author?.username,
      content: message.content,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'messageUpdate',
    'messageUpdate',
    (oldMessage, newMessage) => ({
      guildId: newMessage.guildId ?? undefined,
      channelId: newMessage.channelId,
      messageId: newMessage.id,
      authorId: newMessage.author?.id,
      authorName: newMessage.author?.username,
      authorDisplayName: newMessage.author?.globalName ?? newMessage.author?.displayName ?? newMessage.author?.username,
      oldContent: oldMessage.content,
      newContent: newMessage.content,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'channelCreate',
    'channelCreate',
    (channel) => ({
      guildId: 'guildId' in channel ? channel.guildId : undefined,
      serverId: 'guildId' in channel ? channel.guildId : undefined,
      serverName: 'guild' in channel && channel.guild ? channel.guild.name : undefined,
      channelId: channel.id,
      channelName: 'name' in channel ? channel.name : undefined,
      channelType: channel.type,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'channelDelete',
    'channelDelete',
    (channel) => ({
      guildId: 'guildId' in channel ? channel.guildId : undefined,
      channelId: channel.id,
      channelName: 'name' in channel ? channel.name : undefined,
      channelType: channel.type,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'roleCreate',
    'roleCreate',
    (role) => ({
      guildId: role.guild.id,
      serverId: role.guild.id,
      serverName: role.guild.name,
      roleId: role.id,
      roleName: role.name,
      roleColor: role.color,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'roleDelete',
    'roleDelete',
    (role) => ({
      guildId: role.guild.id,
      serverId: role.guild.id,
      serverName: role.guild.name,
      roleId: role.id,
      roleName: role.name,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'guildMemberUpdate',
    'guildMemberUpdate',
    (oldMember, newMember) => ({
      guildId: newMember.guild.id,
      serverId: newMember.guild.id,
      serverName: newMember.guild.name,
      userId: newMember.id,
      userBot: newMember.user?.bot ?? false,
      oldRoleIds: 'roles' in oldMember ? [...oldMember.roles.cache.keys()] : [],
      newRoleIds: [...newMember.roles.cache.keys()],
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'inviteCreate',
    'inviteCreate',
    (invite) => ({
      guildId: invite.guild?.id,
      channelId: invite.channel?.id,
      inviteCode: invite.code,
      inviterId: invite.inviter?.id,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'inviteDelete',
    'inviteDelete',
    (invite) => ({
      guildId: invite.guild?.id,
      channelId: invite.channel?.id,
      inviteCode: invite.code,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'webhooksUpdate',
    'webhooksUpdate',
    (channel) => ({
      guildId: channel.guildId,
      channelId: channel.id,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'messageReactionAdd',
    'messageReactionAdd',
    (reaction, user) => ({
      guildId: reaction.message.guildId ?? undefined,
      channelId: reaction.message.channelId,
      messageId: reaction.message.id,
      userId: user.id,
      userName: user.username,
      emojiName: reaction.emoji.name ?? null,
      emojiId: reaction.emoji.id ?? null,
    }),
    runtime,
    logger,
  );
  bridge(
    client,
    'messageReactionRemove',
    'messageReactionRemove',
    (reaction, user) => ({
      guildId: reaction.message.guildId ?? undefined,
      channelId: reaction.message.channelId,
      messageId: reaction.message.id,
      userId: user.id,
      userName: user.username,
      emojiName: reaction.emoji.name ?? null,
      emojiId: reaction.emoji.id ?? null,
    }),
    runtime,
    logger,
  );
}

function bridge<K extends keyof ClientEvents>(
  client: Client,
  discordEvent: K,
  pluginEvent: PluginEventName,
  map: (...args: ClientEvents[K]) => PluginEventPayload,
  runtime: BotPluginRuntime,
  logger: Logger,
): void {
  client.on(discordEvent, (...args) => {
    void runtime.events.dispatch(pluginEvent, compact(map(...args))).catch((error: unknown) => {
      logger.error({ error, pluginEvent }, 'Core plugin event dispatch failed');
    });
  });
}

function compact(payload: PluginEventPayload): PluginEventPayload {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}
