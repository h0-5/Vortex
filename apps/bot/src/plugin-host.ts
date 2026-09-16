import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { guildPlugins, type Database } from '@vortex/database';
import {
  PluginRegistry,
  PluginRuntime,
  type PluginContext,
  type PluginModule,
  type PluginScope,
} from '@vortex/shared';
import { pluginManifestSchema, type PluginManifest } from '@vortex/types';
import {
  ApplicationCommandOptionType,
  type Client,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import { eq } from 'drizzle-orm';
import type { Logger } from 'pino';

import { BotPluginContextFactory } from './plugin-core-adapters.js';
import type { BotPluginRuntime } from './plugin-runtime-bridge.js';

const PLUGINS_DIRECTORY = resolveWorkspacePath('plugins');
const INSTALLED_PLUGINS_DIRECTORY = join(PLUGINS_DIRECTORY, 'installed');

interface LoadedPlugin {
  manifest: PluginManifest;
  module: PluginModule;
}

export class PluginHost {
  private readonly registry = new PluginRegistry();
  private readonly runtime: PluginRuntime;
  private readonly contexts = new Map<string, PluginContext>();
  private readonly loaded = new Map<string, LoadedPlugin>();
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private refreshing = false;
  private refreshFailures = 0;
  private nextRefreshFailureLogAt = 0;

  constructor(
    private readonly database: Database,
    private readonly client: Client,
    private readonly core: BotPluginRuntime,
    private readonly logger: Logger,
  ) {
    this.runtime = new PluginRuntime(this.registry, core.commands, core.events, core.interactions);
  }

  async start(): Promise<void> {
    this.logger.info(
      { pluginsDir: PLUGINS_DIRECTORY, installedDir: INSTALLED_PLUGINS_DIRECTORY },
      'Plugin host starting',
    );
    await this.loadModules();
    await this.refresh();
    this.refreshTimer = setInterval(() => {
      void this.refresh().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        const cause =
          error instanceof Error && 'cause' in error
            ? ((error.cause as Error | undefined)?.message ?? '')
            : '';
        this.refreshFailures += 1;
        const now = Date.now();
        const delay = Math.min(1_000 * 2 ** (this.refreshFailures - 1), 60_000);
        if (now >= this.nextRefreshFailureLogAt) {
          this.logger.error({ err: message, cause }, 'Plugin host refresh failed');
          this.nextRefreshFailureLogAt = now + delay;
        }
      });
    }, 10_000);
    this.refreshTimer.unref();
  }

  async stop(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    for (const [key, context] of this.contexts) {
      await this.deactivate(key, context);
    }
  }

  private async loadModules(): Promise<void> {
    const directories = await listPluginDirectories(this.logger);
    let loadedNow = 0;
    let skipped = 0;
    for (const directory of directories) {
      try {
        const manifestRaw = JSON.parse(await readFile(join(directory, 'plugin.json'), 'utf8')) as unknown;
        const manifest = pluginManifestSchema.parse(manifestRaw);
        if (this.loaded.has(manifest.id)) {
          continue;
        }
        const runtimePath = await resolveRuntimePath(directory, manifest.entry);
        const imported = (await import(pathToFileURL(runtimePath).href)) as {
          default?: PluginModule;
        };
        if (!imported.default) {
          throw new Error(`Plugin ${manifest.id} does not export a default PluginModule.`);
        }
        this.registry.register(manifest.id, imported.default);
        this.loaded.set(manifest.id, { manifest, module: imported.default });
        loadedNow += 1;
      } catch (error) {
        skipped += 1;
        const err = error instanceof Error ? error.message : String(error);
        const code = error instanceof Error && 'code' in error ? (error as Error & { code: string }).code : undefined;
        this.logger.warn(
          { directory, err, code },
          'Plugin runtime module skipped',
        );
      }
    }
    this.logger.info(
      { count: this.loaded.size, scanned: directories.length, loadedNow, skipped, pluginsDir: PLUGINS_DIRECTORY, installedDir: INSTALLED_PLUGINS_DIRECTORY },
      'Plugin runtime modules loaded',
    );
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      await this.loadModules();
      const enabled = await this.database
        .select({ guildId: guildPlugins.guildId, pluginId: guildPlugins.pluginId })
        .from(guildPlugins)
        .where(eq(guildPlugins.enabled, true));
      const desired = new Set(
        enabled.map(({ guildId, pluginId }) => scopeKey({ guildId, pluginId })),
      );

      for (const scope of enabled) {
        const key = scopeKey(scope);
        if (!this.contexts.has(key) && this.loaded.has(scope.pluginId)) {
          await this.activate(scope);
        }
      }
      for (const [key, context] of this.contexts) {
        if (!desired.has(key)) {
          await this.deactivate(key, context);
        }
      }
      await this.syncSlashCommands(new Set(enabled.map((row) => row.guildId)));
      this.refreshFailures = 0;
      this.nextRefreshFailureLogAt = 0;
    } finally {
      this.refreshing = false;
    }
  }

  private async activate(scope: PluginScope): Promise<void> {
    const context = this.runtime.createContext(
      scope,
      new BotPluginContextFactory(this.database, this.client).create(scope),
    );
    await this.runtime.runLifecycle(scope, 'onInstall', context);
    await this.runtime.runLifecycle(scope, 'onEnable', context);
    this.contexts.set(scopeKey(scope), context);
    this.logger.info(scope, 'Plugin activated');
  }

  private async deactivate(key: string, context: PluginContext): Promise<void> {
    await this.runtime.runLifecycle(context, 'onDisable', context);
    context.scheduler.cancelAll();
    this.core.commands.unregisterScope(context);
    this.core.events.unregisterScope(context);
    this.core.interactions.unregisterScope(context);
    this.contexts.delete(key);
    this.logger.info(
      { guildId: context.guildId, pluginId: context.pluginId },
      'Plugin deactivated',
    );
  }

  private async syncSlashCommands(guildIds: Set<string>): Promise<void> {
    for (const guildId of guildIds) {
      const guild = await this.client.guilds.fetch(guildId);
      const commands = this.core.commands.listSlashCommands(guildId).map((command) => ({
        name: command.name,
        description: command.description,
        type: 1,
        options: command.options.map((option) => ({
          name: option.name,
          description: option.description,
          type: toDiscordOptionType(option.type),
          required: option.required ?? false,
        })),
      })) as unknown as RESTPostAPIChatInputApplicationCommandsJSONBody[];
      await guild.commands.set(commands);
    }
  }
}

function scopeKey(scope: PluginScope): string {
  return `${scope.guildId}:${scope.pluginId}`;
}

function toDiscordOptionType(
  type: 'STRING' | 'BOOLEAN' | 'INTEGER' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE',
): ApplicationCommandOptionType {
  if (type === 'BOOLEAN') return ApplicationCommandOptionType.Boolean;
  if (type === 'INTEGER') return ApplicationCommandOptionType.Integer;
  if (type === 'USER') return ApplicationCommandOptionType.User;
  if (type === 'CHANNEL') return ApplicationCommandOptionType.Channel;
  if (type === 'ROLE') return ApplicationCommandOptionType.Role;
  if (type === 'MENTIONABLE') return ApplicationCommandOptionType.Mentionable;
  return ApplicationCommandOptionType.String;
}

async function listPluginDirectories(logger: Logger): Promise<string[]> {
  const officialDirectories = await listChildDirectories(PLUGINS_DIRECTORY, new Set(['installed']), logger);
  const installedDirectories = await listChildDirectories(INSTALLED_PLUGINS_DIRECTORY, new Set(), logger);
  if (installedDirectories.length === 0) {
    const listing = await safeReaddir(INSTALLED_PLUGINS_DIRECTORY);
    logger.info({ installedDir: INSTALLED_PLUGINS_DIRECTORY, listing }, 'Installed plugin directory listing');
  }
  const combined = [...new Set([...officialDirectories, ...installedDirectories])].sort();
  logger.info(
    { officialCount: officialDirectories.length, installedCount: installedDirectories.length, total: combined.length },
    'Plugin directories discovered',
  );
  return combined;
}

async function resolveRuntimePath(pluginDirectory: string, entry: string): Promise<string> {
  const jsEntry = entry.replace(/\.ts$/u, '.js');
  const candidates = [
    join(pluginDirectory, 'dist', jsEntry),
    join(pluginDirectory, jsEntry),
    join(pluginDirectory, entry),
  ];

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) {
        return candidate;
      }
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    }
  }

  throw new Error(`Plugin runtime entry was not found. Checked: ${candidates.join(', ')}`);
}

async function listChildDirectories(root: string, exclude = new Set<string>(), logger?: Logger): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const dirs = entries
      .filter((entry) => entry.isDirectory() && !exclude.has(entry.name))
      .map((entry) => join(root, entry.name));
    logger?.debug({ root, found: dirs.length }, 'Scanned plugin directory');
    return dirs;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      logger?.debug({ root }, 'Plugin directory does not exist');
      return [];
    }
    throw error;
  }
}

async function safeReaddir(root: string): Promise<Array<{ name: string; isDirectory: boolean; isFile: boolean }>> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory(), isFile: entry.isFile() }));
  } catch {
    return [];
  }
}

function resolveWorkspacePath(...segments: string[]): string {
  const envRoot = process.env.VORTEX_ROOT;
  if (envRoot) {
    return resolve(envRoot, ...segments);
  }

  let current = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(join(current, 'pnpm-workspace.yaml')) || existsSync(join(current, 'turbo.json'))) {
      return resolve(current, ...segments);
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return resolve(dirname(new URL(import.meta.url).pathname), '..', '..', '..', ...segments);
}
