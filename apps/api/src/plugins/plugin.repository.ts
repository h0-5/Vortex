import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  guildPlugins,
  commandAliases,
  commandLogs,
  commandPermissions,
  guildPluginCommands,
  pluginCommands,
  pluginLogs,
  pluginStorage,
  pluginTemplates,
  plugins,
  type Database,
  type PluginRecord,
} from '@vortex/database';
import type {
  GuildPlugin,
  PluginLog,
  PluginLogDestination,
  PluginLogLevel,
  PluginManifest,
} from '@vortex/types';
import { and, desc, eq, ne, notInArray, sql } from 'drizzle-orm';

import { DATABASE } from '../config/tokens.js';

@Injectable()
export class PluginRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async registerManifest(manifest: PluginManifest): Promise<void> {
    await this.database
      .insert(plugins)
      .values(toPluginInsert(manifest))
      .onConflictDoUpdate({
        target: plugins.id,
        set: {
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          author: manifest.author,
          status: 'INSTALLED',
          brokenReason: null,
          updatedAt: new Date(),
        },
      });
  }

  async markBroken(pluginId: string, reason: string): Promise<void> {
    await this.database
      .update(plugins)
      .set({ status: 'BROKEN', brokenReason: reason, updatedAt: new Date() })
      .where(eq(plugins.id, pluginId));
  }

  async removeMissingPlugins(pluginIds: string[]): Promise<void> {
    if (pluginIds.length === 0) {
      await this.database.delete(plugins);
      return;
    }
    await this.database.delete(plugins).where(notInArray(plugins.id, pluginIds));
  }

  async listForGuild(guildId: string): Promise<GuildPlugin[]> {
    const rows = await this.database
      .select({
        plugin: plugins,
        guildPluginId: guildPlugins.id,
        enabled: guildPlugins.enabled,
        guildInstalledAt: guildPlugins.installedAt,
        guildUpdatedAt: guildPlugins.updatedAt,
      })
      .from(plugins)
      .innerJoin(
        guildPlugins,
        and(eq(guildPlugins.pluginId, plugins.id), eq(guildPlugins.guildId, guildId)),
      )
      .orderBy(plugins.name);

    return rows.map(toGuildPlugin);
  }

  async getPlugin(pluginId: string): Promise<PluginRecord> {
    const [plugin] = await this.database
      .select()
      .from(plugins)
      .where(eq(plugins.id, pluginId))
      .limit(1);
    if (!plugin) {
      throw new NotFoundException(`Plugin ${pluginId} is not installed.`);
    }
    return plugin;
  }

  async setEnabled(guildId: string, pluginId: string, enabled: boolean): Promise<void> {
    await this.database
      .insert(guildPlugins)
      .values({ guildId, pluginId, enabled })
      .onConflictDoUpdate({
        target: [guildPlugins.guildId, guildPlugins.pluginId],
        set: { enabled, updatedAt: new Date() },
      });
  }

  async writeLog(
    guildId: string,
    pluginId: string,
    level: PluginLogLevel,
    message: string,
    metadata: Record<string, unknown>,
    destination: PluginLogDestination = 'DASHBOARD',
  ): Promise<void> {
    await this.database
      .insert(pluginLogs)
      .values({ guildId, pluginId, level, message, metadata, destination });
  }

  async listLogs(guildId: string, pluginId: string): Promise<PluginLog[]> {
    const rows = await this.database
      .select()
      .from(pluginLogs)
      .where(and(eq(pluginLogs.guildId, guildId), eq(pluginLogs.pluginId, pluginId)))
      .orderBy(desc(pluginLogs.createdAt))
      .limit(100);

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ?? {},
      destination: row.destination,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async listGuildLogs(guildId: string): Promise<PluginLog[]> {
    const rows = await this.database
      .select()
      .from(pluginLogs)
      .where(eq(pluginLogs.guildId, guildId))
      .orderBy(desc(pluginLogs.createdAt))
      .limit(200);
    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ?? {},
      destination: row.destination,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async deleteGuildPlugin(guildId: string, pluginId: string): Promise<void> {
    await this.database
      .delete(guildPlugins)
      .where(and(eq(guildPlugins.guildId, guildId), eq(guildPlugins.pluginId, pluginId)));
  }

  async deletePluginData(guildId: string, pluginId: string): Promise<void> {
    await this.database
      .delete(commandAliases)
      .where(and(eq(commandAliases.guildId, guildId), eq(commandAliases.pluginId, pluginId)));
    await this.database
      .delete(commandLogs)
      .where(and(eq(commandLogs.guildId, guildId), eq(commandLogs.pluginId, pluginId)));
    await this.database
      .delete(commandPermissions)
      .where(and(eq(commandPermissions.guildId, guildId), eq(commandPermissions.pluginId, pluginId)));
    await this.database
      .delete(guildPluginCommands)
      .where(and(eq(guildPluginCommands.guildId, guildId), eq(guildPluginCommands.pluginId, pluginId)));
    await this.database
      .delete(pluginCommands)
      .where(and(eq(pluginCommands.guildId, guildId), eq(pluginCommands.pluginId, pluginId)));
    await this.database
      .delete(pluginLogs)
      .where(and(eq(pluginLogs.guildId, guildId), eq(pluginLogs.pluginId, pluginId)));
    await this.database
      .delete(pluginStorage)
      .where(and(eq(pluginStorage.guildId, guildId), eq(pluginStorage.pluginId, pluginId)));
    await this.database
      .delete(pluginTemplates)
      .where(and(eq(pluginTemplates.guildId, guildId), eq(pluginTemplates.pluginId, pluginId)));
  }

  async isPluginUsedByOtherGuilds(pluginId: string, excludeGuildId: string): Promise<boolean> {
    const rows = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(guildPlugins)
      .where(and(eq(guildPlugins.pluginId, pluginId), ne(guildPlugins.guildId, excludeGuildId)));
    return (rows[0]?.count ?? 0) > 0;
  }

  async deletePluginRecord(pluginId: string): Promise<void> {
    await this.database.delete(plugins).where(eq(plugins.id, pluginId));
  }
}

function toPluginInsert(manifest: PluginManifest) {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    status: 'INSTALLED' as const,
  };
}

function toGuildPlugin(row: {
  plugin: PluginRecord;
  guildPluginId: string;
  enabled: boolean;
  guildInstalledAt: Date;
  guildUpdatedAt: Date;
}): GuildPlugin {
  const enabled = row.enabled;
  return {
    id: row.plugin.id,
    name: row.plugin.name,
    version: row.plugin.version,
    description: row.plugin.description,
    author: row.plugin.author,
    status: row.plugin.status,
    brokenReason: row.plugin.brokenReason,
    enabled,
    guildStatus: enabled ? 'ENABLED' : 'DISABLED',
    installedAt: row.guildInstalledAt.toISOString(),
    updatedAt: (row.guildUpdatedAt ?? row.plugin.updatedAt).toISOString(),
    dashboard: null,
  };
}
