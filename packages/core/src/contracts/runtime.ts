import type { PluginEventName } from '@vortex/types';

import type {
  PluginChannels,
  PluginCommands,
  PluginComponents,
  PluginDatabase,
  PluginEmbeds,
  PluginEvents,
  PluginGuild,
  PluginInteractions,
  PluginLogger,
  PluginMessages,
  PluginPermissions,
  PluginScheduler,
  PluginStorage,
  PluginTemplates,
  PluginVariables,
} from './index.js';

export type PluginMetadata = Record<string, unknown>;
export type PluginScope = Readonly<{ guildId: string; pluginId: string }>;

export interface PluginContext extends PluginScope {
  logger: PluginLogger;
  commands: PluginCommands;
  events: PluginEvents;
  channels: PluginChannels;
  interactions: PluginInteractions;
  variables: PluginVariables;
  templates: PluginTemplates;
  messages: PluginMessages;
  embeds: PluginEmbeds;
  components: PluginComponents;
  guild: PluginGuild;
  permissions: PluginPermissions;
  storage: PluginStorage;
  database: PluginDatabase;
  scheduler: PluginScheduler;
}

export interface PluginModule {
  onInstall?(context: PluginContext): Promise<void> | void;
  onEnable?(context: PluginContext): Promise<void> | void;
  onDisable?(context: PluginContext): Promise<void> | void;
  onUpdate?(context: PluginContext): Promise<void> | void;
  onUninstall?(context: PluginContext): Promise<void> | void;
}

export interface PluginStateReader {
  isEnabled(scope: PluginScope): Promise<boolean>;
}

export interface PluginManagementReader {
  canManage(scope: PluginScope, userId: string): Promise<boolean>;
}

export type { PluginEventName };
