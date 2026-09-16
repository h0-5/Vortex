import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Injectable } from '@nestjs/common';
import { pluginManifestSchema, type PluginManifest } from '@vortex/types';

export const CORE_VERSION = '0.3.0';
const PLUGIN_DIRECTORY = resolveWorkspacePath('plugins');
const INSTALLED_PLUGIN_DIRECTORY = join(PLUGIN_DIRECTORY, 'installed');

@Injectable()
export class PluginDiscoveryService {
  async discoverManifests(): Promise<PluginManifest[]> {
    const pluginDirectories = await this.getPluginDirectories();
    return Promise.all(pluginDirectories.map((directory) => this.readManifest(directory)));
  }

  validateManifest(value: unknown): PluginManifest {
    const manifest = pluginManifestSchema.parse(value);
    if (compareVersions(manifest.minCoreVersion, CORE_VERSION) > 0) {
      throw new Error(
        `Plugin ${manifest.id} requires Vortex ${manifest.minCoreVersion}, current version is ${CORE_VERSION}.`,
      );
    }
    return manifest;
  }

  getPluginDirectory(pluginId: string): string {
    if (!/^[a-z][a-z0-9-]{1,63}$/u.test(pluginId)) {
      throw new Error('Plugin ID is invalid.');
    }
    return join(PLUGIN_DIRECTORY, pluginId);
  }

  getInstalledPluginDirectory(pluginId: string): string {
    if (!/^[a-z][a-z0-9-]{1,63}$/u.test(pluginId)) {
      throw new Error('Plugin ID is invalid.');
    }
    return join(INSTALLED_PLUGIN_DIRECTORY, pluginId);
  }

  getBundledPluginDirectory(pluginId: string): string {
    if (!/^[a-z][a-z0-9-]{1,63}$/u.test(pluginId)) {
      throw new Error('Plugin ID is invalid.');
    }
    return join(PLUGIN_DIRECTORY, pluginId);
  }

  private async getPluginDirectories(): Promise<string[]> {
    const directories: string[] = [];

    const scan = async (root: string, exclude?: Set<string>): Promise<void> => {
      try {
        const entries = await readdir(root, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !exclude?.has(entry.name)) {
            directories.push(join(root, entry.name));
          }
        }
      } catch (error) {
        if (!isMissingDirectory(error)) {
          throw error;
        }
      }
    };

    await scan(PLUGIN_DIRECTORY, new Set(['installed']));
    await scan(INSTALLED_PLUGIN_DIRECTORY);

    return [...new Set(directories)].sort();
  }

  private async readManifest(pluginDirectory: string): Promise<PluginManifest> {
    const manifestPath = join(pluginDirectory, 'plugin.json');
    try {
      const content = await readFile(manifestPath, 'utf8');
      return this.validateManifest(JSON.parse(content));
    } catch (error) {
      throw new Error(`Failed to load plugin manifest at ${manifestPath}.`, {
        cause: error,
      });
    }
  }
}

function compareVersions(left: string, right: string): number {
  const leftParts = getVersionParts(left);
  const rightParts = getVersionParts(right);

  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = leftParts[index]! - rightParts[index]!;
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

function getVersionParts(version: string): [number, number, number] {
  const [major, minor, patch] = version.split(/[+-]/u)[0]!.split('.').map(Number);
  return [major!, minor!, patch!];
}

function isMissingDirectory(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
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

  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', ...segments);
}
