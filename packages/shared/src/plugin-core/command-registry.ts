import {
  commandIdSchema,
  commandPermissionConfigSchema,
  discordCommandNameSchema,
  type CommandPermissionConfig,
} from '@vortex/types';

import type {
  CommandCustomization,
  CommandInvocation,
  CommandRegistration,
  PluginLogger,
  PluginPermissions,
  PluginScope,
  PluginStateReader,
} from '../plugin-contracts.js';

interface RegisteredCommand extends PluginScope {
  commandId: string;
  name: string;
  description: string;
  type: CommandRegistration['type'];
  aliases: string[];
  options: NonNullable<CommandRegistration['options']>;
  enabled: boolean;
  permissions: CommandPermissionConfig;
  handler: CommandRegistration['handler'];
  permissionApi: PluginPermissions;
  logger: PluginLogger;
  autoDeleteReplyOnAuthorDelete: boolean;
  autoDeleteAuthorMessage: boolean;
}

export class CommandRegistry {
  private readonly commands = new Map<string, RegisteredCommand>();
  private readonly names = new Map<string, string>();

  constructor(private readonly pluginState: PluginStateReader) {}

  register(
    scope: PluginScope,
    registration: CommandRegistration,
    permissionApi: PluginPermissions,
    logger: PluginLogger,
    customization: CommandCustomization = {},
  ): void {
    const command = toRegisteredCommand(scope, registration, permissionApi, logger, customization);
    const key = commandKey(command);
    if (this.commands.has(key)) {
      throw new Error(`Command ${command.commandId} is already registered for this plugin.`);
    }

    const names = [command.name, ...command.aliases];
    for (const name of names) {
      const existing = this.names.get(nameKey(scope.guildId, name));
      if (existing) {
        throw new Error(`Command name or alias "${name}" conflicts with ${existing}.`);
      }
    }

    this.commands.set(key, command);
    for (const name of names) {
      this.names.set(nameKey(scope.guildId, name), key);
    }
  }

  resolve(guildId: string, name: string): RegisteredCommand | null {
    const key = this.names.get(nameKey(guildId, name));
    return key ? (this.commands.get(key) ?? null) : null;
  }

  getConfiguration(
    guildId: string,
    name: string,
  ): Pick<
    RegisteredCommand,
    'autoDeleteAuthorMessage' | 'autoDeleteReplyOnAuthorDelete' | 'commandId' | 'pluginId'
  > | null {
    const command = this.resolve(guildId, name);
    if (!command) {
      return null;
    }
    return {
      commandId: command.commandId,
      pluginId: command.pluginId,
      autoDeleteAuthorMessage: command.autoDeleteAuthorMessage,
      autoDeleteReplyOnAuthorDelete: command.autoDeleteReplyOnAuthorDelete,
    };
  }

  unregisterScope(scope: PluginScope): void {
    for (const [key, command] of this.commands) {
      if (command.guildId !== scope.guildId || command.pluginId !== scope.pluginId) {
        continue;
      }
      this.commands.delete(key);
      for (const name of [command.name, ...command.aliases]) {
        this.names.delete(nameKey(command.guildId, name));
      }
    }
  }

  listSlashCommands(guildId: string): Array<{
    name: string;
    description: string;
    options: NonNullable<CommandRegistration['options']>;
  }> {
    return [...this.commands.values()]
      .filter(
        (command) =>
          command.guildId === guildId &&
          command.enabled &&
          (command.type === 'SLASH' || command.type === 'BOTH'),
      )
      .map((command) => ({
        name: command.name,
        description: command.description,
        options: command.options,
      }));
  }

  async execute(guildId: string, name: string, invocation: CommandInvocation): Promise<boolean> {
    const command = this.resolve(guildId, name);
    if (!command || !command.enabled || !(await this.pluginState.isEnabled(command))) {
      return false;
    }
    if (
      !(await command.permissionApi.canRunCommand(
        command.commandId,
        { userId: invocation.userId, roleIds: invocation.memberRoleIds },
        invocation.channelId,
      ))
    ) {
      await command.logger.audit('Command execution denied.', {
        commandId: command.commandId,
        userId: invocation.userId,
        channelId: invocation.channelId,
      });
      return false;
    }
    try {
      await command.handler({ ...invocation, commandId: command.commandId, name: command.name });
      await command.logger.info('Command executed.', {
        commandId: command.commandId,
        userId: invocation.userId,
      });
      return true;
    } catch (error) {
      await command.logger.error('Command execution failed.', {
        commandId: command.commandId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

function toRegisteredCommand(
  scope: PluginScope,
  registration: CommandRegistration,
  permissionApi: PluginPermissions,
  logger: PluginLogger,
  customization: CommandCustomization,
): RegisteredCommand {
  const commandId = commandIdSchema.parse(registration.commandId ?? registration.name);
  const name = discordCommandNameSchema.parse(customization.name ?? registration.name);
  const aliases = (customization.aliases ?? registration.aliases ?? []).map((alias) =>
    discordCommandNameSchema.parse(alias),
  );
  if (new Set([name, ...aliases]).size !== aliases.length + 1) {
    throw new Error('Command names and aliases must be unique.');
  }
  const description = customization.description ?? registration.description;
  if (description.length < 1 || description.length > 100) {
    throw new Error('Command descriptions must contain between 1 and 100 characters.');
  }
  return {
    ...scope,
    commandId,
    name,
    description,
    type: registration.type,
    aliases,
    options: registration.options ?? [],
    enabled: customization.enabled ?? true,
    permissions: commandPermissionConfigSchema.parse(customization.permissions ?? {}),
    handler: registration.handler,
    permissionApi,
    logger,
    autoDeleteReplyOnAuthorDelete:
      customization.autoDeleteReplyOnAuthorDelete ??
      registration.autoDeleteReplyOnAuthorDelete ??
      false,
    autoDeleteAuthorMessage:
      customization.autoDeleteAuthorMessage ?? registration.autoDeleteAuthorMessage ?? false,
  };
}

function commandKey(command: PluginScope & { commandId: string }): string {
  return `${command.guildId}:${command.pluginId}:${command.commandId}`;
}

function nameKey(guildId: string, name: string): string {
  return `${guildId}:${name}`;
}
