import {
  Injectable,
  InternalServerErrorException,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import {
  pluginDashboardSchemaDocumentSchema,
  type GuildPlugin,
  type GuildPluginDetail,
  type PluginDashboard,
  type PluginDashboardSchemaDocument,
  type PluginLog,
  type PluginLogLevel,
  type PluginManifest,
} from '@vortex/types';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { PluginDiscoveryService } from './plugin-discovery.service.js';
import { PluginMigrationService } from './plugin-migration.service.js';
import { PluginRepository } from './plugin.repository.js';

@Injectable()
export class PluginManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(PluginManager.name);
  private readonly manifestMap = new Map<string, PluginManifest>();

  constructor(
    private readonly pluginDiscoveryService: PluginDiscoveryService,
    private readonly pluginRepository: PluginRepository,
    private readonly pluginMigrationService: PluginMigrationService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const manifests = await this.reloadManifests();
    await this.pluginMigrationService.apply(manifests);
  }

  async reloadManifests(): Promise<PluginManifest[]> {
    const manifests = await this.discoverInstalledPlugins();
    this.logger.log(`Registered ${manifests.length} plugin manifest(s).`);
    return manifests;
  }

  discoverInstalledPlugins(): Promise<PluginManifest[]> {
    return this.registerDiscoveredPlugins();
  }

  validatePluginManifest(value: unknown): PluginManifest {
    return this.pluginDiscoveryService.validateManifest(value);
  }

  getManifest(pluginId: string): PluginManifest | undefined {
    return this.manifestMap.get(pluginId);
  }

  async listPlugins(guildId: string): Promise<GuildPlugin[]> {
    const rows = await this.pluginRepository.listForGuild(guildId);
    return rows.map((row) => this.enrichWithDashboard(row));
  }

  async getPluginStatus(guildId: string, pluginId: string): Promise<GuildPlugin> {
    await this.pluginRepository.getPlugin(pluginId);
    const plugins = await this.listPlugins(guildId);
    const plugin = plugins.find((candidate) => candidate.id === pluginId);
    if (!plugin) {
      throw new InternalServerErrorException(
        `Plugin ${pluginId} was not returned by the registry.`,
      );
    }
    return plugin;
  }

  async getPluginDetail(guildId: string, pluginId: string): Promise<GuildPluginDetail> {
    const plugin = await this.getPluginStatus(guildId, pluginId);
    return {
      ...plugin,
      dashboardContent: await this.getDashboardContent(guildId, pluginId),
    };
  }

  async enablePlugin(guildId: string, pluginId: string): Promise<GuildPlugin> {
    await this.pluginRepository.getPlugin(pluginId);
    const manifest = this.getManifest(pluginId);
    if (manifest) {
      await this.pluginMigrationService.apply([manifest]);
    }
    await this.pluginRepository.setEnabled(guildId, pluginId, true);
    await this.writePluginLog(guildId, pluginId, 'INFO', 'Plugin enabled.', {});
    return this.getPluginStatus(guildId, pluginId);
  }

  async disablePlugin(guildId: string, pluginId: string): Promise<GuildPlugin> {
    await this.pluginRepository.getPlugin(pluginId);
    await this.pluginRepository.setEnabled(guildId, pluginId, false);
    await this.writePluginLog(guildId, pluginId, 'INFO', 'Plugin disabled.', {});
    return this.getPluginStatus(guildId, pluginId);
  }

  async listPluginLogs(guildId: string, pluginId: string): Promise<PluginLog[]> {
    await this.pluginRepository.getPlugin(pluginId);
    return this.pluginRepository.listLogs(guildId, pluginId);
  }

  async deletePlugin(guildId: string, pluginId: string, deleteData: boolean): Promise<void> {
    await this.pluginRepository.getPlugin(pluginId);
    await this.pluginRepository.setEnabled(guildId, pluginId, false);
    await this.writePluginLog(guildId, pluginId, 'INFO', 'Plugin deleted.', { deleteData });
    if (deleteData) {
      await this.pluginRepository.deletePluginData(guildId, pluginId);
    }
    await this.pluginRepository.deleteGuildPlugin(guildId, pluginId);
    const usedByOthers = await this.pluginRepository.isPluginUsedByOtherGuilds(pluginId, guildId);
    if (!usedByOthers) {
      const pluginDirs = [
        this.pluginDiscoveryService.getInstalledPluginDirectory(pluginId),
        this.pluginDiscoveryService.getPluginDirectory(pluginId),
      ];
      await Promise.all(
        pluginDirs.map((pluginDir) => rm(pluginDir, { recursive: true, force: true }).catch(() => {})),
      );
      this.manifestMap.delete(pluginId);
      await this.pluginRepository.deletePluginRecord(pluginId);
    }
    await this.reloadManifests();
  }

  listGuildLogs(guildId: string): Promise<PluginLog[]> {
    return this.pluginRepository.listGuildLogs(guildId);
  }

  writePluginLog(
    guildId: string,
    pluginId: string,
    level: PluginLogLevel,
    message: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    return this.pluginRepository.writeLog(guildId, pluginId, level, message, metadata);
  }

  private enrichWithDashboard(plugin: GuildPlugin): GuildPlugin {
    const manifest = this.manifestMap.get(plugin.id);
    if (!manifest?.dashboard) {
      return { ...plugin, dashboard: null };
    }
    const dashboard: PluginDashboard = {
      enabled: manifest.dashboard.enabled,
      route: manifest.dashboard.route,
      label: manifest.dashboard.label,
      icon: manifest.dashboard.icon,
      tabs: manifest.dashboard.tabs,
    };
    return { ...plugin, dashboard };
  }

  getPluginAssetPath(pluginId: string, filename: string): string[] {
    const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/gu, '');
    return [
      join(this.pluginDiscoveryService.getInstalledPluginDirectory(pluginId), 'assets', safeName),
      join(this.pluginDiscoveryService.getPluginDirectory(pluginId), 'assets', safeName),
    ];
  }

  private async getDashboardContent(guildId: string, pluginId: string): Promise<GuildPluginDetail['dashboardContent']> {
    const manifest = this.manifestMap.get(pluginId);
    if (!manifest?.dashboard?.enabled) {
      return { mode: 'none', schema: null, bundleUrl: null, assetsBaseUrl: null, errors: [] };
    }

    const schema = await this.readDashboardSchema(pluginId);
    if (schema) {
      return {
        mode: 'schema',
        schema,
        bundleUrl: null,
        assetsBaseUrl: `/api/v1/guilds/${guildId}/plugins/${pluginId}/assets`,
        errors: [],
      };
    }

    await this.pluginRepository.markBroken(
      pluginId,
      'This plugin package is incomplete. It declares a dashboard but does not include one.',
    );

    return {
      mode: 'none',
      schema: null,
      bundleUrl: null,
      assetsBaseUrl: null,
      errors: ['dashboard.schema.json missing'],
    };
  }

  private async readDashboardSchema(pluginId: string): Promise<GuildPluginDetail['dashboardContent']['schema']> {
    const candidatePaths = [
      join(this.pluginDiscoveryService.getInstalledPluginDirectory(pluginId), 'dashboard.schema.json'),
      join(this.pluginDiscoveryService.getPluginDirectory(pluginId), 'dashboard.schema.json'),
      join(this.pluginDiscoveryService.getBundledPluginDirectory(pluginId), 'dashboard.schema.json'),
    ];

    for (const schemaPath of candidatePaths) {
      try {
        const content = await readFile(schemaPath, 'utf8');
        return pluginDashboardSchemaDocumentSchema.parse(JSON.parse(content));
      } catch (error) {
        if (!isMissingFile(error)) {
          this.logger.warn(`Failed to load dashboard schema for ${pluginId}: ${(error as Error).message}`);
          return null;
        }
      }
    }

    return null;
  }

  private async registerDiscoveredPlugins(): Promise<PluginManifest[]> {
    const manifests = await this.pluginDiscoveryService.discoverManifests();
    await this.pluginRepository.removeMissingPlugins(manifests.map((manifest) => manifest.id));
    this.manifestMap.clear();
    for (const manifest of manifests) {
      this.manifestMap.set(manifest.id, manifest);
      await this.pluginRepository.registerManifest(manifest);
      if (manifest.dashboard?.enabled) {
        await this.auditDashboardSchema(manifest.id);
      }
    }
    return manifests;
  }

  private async auditDashboardSchema(pluginId: string): Promise<void> {
    const schema = await this.readDashboardSchema(pluginId);
    if (schema) {
      return;
    }
    await this.pluginRepository.markBroken(
      pluginId,
      'This plugin package is incomplete. It declares a dashboard but does not include one.',
    );
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
