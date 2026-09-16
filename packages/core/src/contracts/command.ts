import type {
  CommandPermissionConfig,
  PluginCommand,
  PluginCommandListResponse,
} from '@vortex/types';

export interface CommandInvocation {
  guildId: string;
  channelId: string;
  userId: string;
  memberRoleIds: string[];
  commandId: string;
  name: string;
  args: string[];
  options: Record<string, string | number | boolean>;
  respond(message: unknown): Promise<void>;
}

export type CommandHandler = (invocation: CommandInvocation) => Promise<void> | void;

export interface CommandOptionRegistration {
  name: string;
  description: string;
  type: 'STRING' | 'BOOLEAN' | 'INTEGER' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE';
  required?: boolean;
}

export interface CommandRegistration {
  commandId?: string;
  name: string;
  description: string;
  type: 'SLASH' | 'PREFIX' | 'BOTH';
  handler: CommandHandler;
  defaultPermissions?: string[];
  aliases?: string[];
  options?: CommandOptionRegistration[];
  autoDeleteReplyOnAuthorDelete?: boolean;
  autoDeleteAuthorMessage?: boolean;
}

export interface CommandCustomization {
  name?: string;
  description?: string;
  enabled?: boolean;
  aliases?: string[];
  permissions?: CommandPermissionConfig;
  autoDeleteReplyOnAuthorDelete?: boolean;
  autoDeleteAuthorMessage?: boolean;
}

export interface PluginCommands {
  register(registration: CommandRegistration, customization?: CommandCustomization): Promise<void>;
  createInvite(
    channelId: string,
    options?: { maxAgeSeconds?: number; maxUses?: number; unique?: boolean },
  ): Promise<string>;
}

export interface CommandConfigurationReader {
  getPermissions(scope: PluginScope, commandId: string): Promise<CommandPermissionConfig>;
}

export interface CommandRegistrationWriter {
  register(scope: PluginScope, command: CommandRegistration): Promise<CommandCustomization | undefined>;
}

export interface PluginCommandRepository {
  list(scope: PluginScope): Promise<PluginCommandListResponse['data']>;
  update(scope: PluginScope, commandId: string, update: Partial<PluginCommand>): Promise<PluginCommand>;
}

import type { PluginScope } from './runtime.js';
