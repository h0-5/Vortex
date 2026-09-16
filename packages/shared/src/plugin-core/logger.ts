import type { CoreMessage, PluginLogLevel, PluginLogSettings } from '@vortex/types';

import type {
  DashboardLogWriter,
  DiscordLogWriter,
  PluginLogEntry,
  PluginLogger,
  PluginLogSettingsReader,
  PluginMetadata,
  PluginScope,
} from '../plugin-contracts.js';

export class ScopedPluginLogger implements PluginLogger {
  constructor(
    private readonly scope: PluginScope,
    private readonly settingsReader: PluginLogSettingsReader,
    private readonly dashboardWriter: DashboardLogWriter,
    private readonly discordWriter: DiscordLogWriter,
  ) {}

  debug(message: string, metadata: PluginMetadata = {}): Promise<void> {
    return this.write('DEBUG', message, metadata);
  }

  info(message: string, metadata: PluginMetadata = {}): Promise<void> {
    return this.write('INFO', message, metadata);
  }

  warn(message: string, metadata: PluginMetadata = {}): Promise<void> {
    return this.write('WARN', message, metadata);
  }

  error(message: string, metadata: PluginMetadata = {}): Promise<void> {
    return this.write('ERROR', message, metadata);
  }

  audit(message: string, metadata: PluginMetadata = {}): Promise<void> {
    return this.write('AUDIT', message, metadata);
  }

  private async write(
    level: PluginLogLevel,
    message: string,
    metadata: PluginMetadata,
  ): Promise<void> {
    const settings = await this.settingsReader.get(this.scope);
    if (settings.destination === 'DISABLED') {
      return;
    }

    const entry: PluginLogEntry = {
      ...this.scope,
      level,
      message,
      metadata,
      destination: settings.destination,
      createdAt: new Date(),
    };
    if (settings.destination === 'DASHBOARD' || settings.destination === 'BOTH') {
      await this.dashboardWriter.write(entry);
    }
    if (settings.destination === 'DISCORD' || settings.destination === 'BOTH') {
      await this.discordWriter.write(entry, settings, buildLogMessage(entry, settings));
    }
  }
}

function buildLogMessage(entry: PluginLogEntry, settings: PluginLogSettings): CoreMessage {
  const content = `[${entry.level}] ${entry.message}`;
  if (settings.outputType === 'embed') {
    return {
      type: 'embed',
      description: content,
      fields: [],
      ...(settings.embedColor === null ? {} : { color: settings.embedColor }),
    };
  }
  if (settings.outputType === 'components_v2') {
    return {
      type: 'components_v2',
      components: [
        { type: 'container', spoiler: false, items: [{ type: 'text_display', content }] },
      ],
    };
  }
  return { type: 'text', content };
}
