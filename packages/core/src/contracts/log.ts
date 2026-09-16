import type { PluginLogLevel, PluginLogSettings } from '@vortex/types';
import type { PluginMetadata, PluginScope } from './runtime.js';

export interface PluginLogEntry extends PluginScope {
  level: PluginLogLevel;
  message: string;
  metadata: PluginMetadata;
  destination: PluginLogSettings['destination'];
  createdAt: Date;
}

export interface PluginLogger {
  debug(this: void, message: string, metadata?: PluginMetadata): Promise<void>;
  info(this: void, message: string, metadata?: PluginMetadata): Promise<void>;
  warn(this: void, message: string, metadata?: PluginMetadata): Promise<void>;
  error(this: void, message: string, metadata?: PluginMetadata): Promise<void>;
  audit(this: void, message: string, metadata?: PluginMetadata): Promise<void>;
}

export interface PluginLogSettingsReader {
  get(scope: PluginScope): Promise<PluginLogSettings>;
}

export interface PluginLogRepository {
  list(scope: PluginScope): Promise<PluginLogEntry[]>;
  listByGuild(guildId: string): Promise<PluginLogEntry[]>;
  write(entry: PluginLogEntry): Promise<void>;
}

export interface DashboardLogWriter {
  write(entry: PluginLogEntry): Promise<void>;
}

export interface DiscordLogWriter {
  write(
    entry: PluginLogEntry,
    settings: PluginLogSettings,
    message: unknown,
  ): Promise<void>;
}
