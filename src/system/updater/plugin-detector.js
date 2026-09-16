'use strict';

const fs = require('fs-extra');
const path = require('path');
const { OFFICIAL_PLUGIN_IDS } = require('./constants');

class PluginDetector {
  /**
   * @param {object} options
   * @param {string} options.pluginsDir
   */
  constructor({ pluginsDir }) {
    this.pluginsDir = pluginsDir;
  }

  /**
   * @returns {Promise<Array<{ id: string; path: string; version: string | null; official: boolean; manifest: object | null }>>}
   */
  async detectPlugins() {
    const exists = await fs.pathExists(this.pluginsDir);
    if (!exists) {
      return [];
    }

    const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
    const plugins = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }

      const pluginPath = path.join(this.pluginsDir, entry.name);
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const manifest = await fs.readJson(manifestPath).catch(() => null);

      plugins.push({
        id: entry.name,
        path: pluginPath,
        version: manifest?.version ?? null,
        official: OFFICIAL_PLUGIN_IDS.has(entry.name) || manifest?.official === true,
        manifest,
      });
    }

    return plugins;
  }

  /**
   * @param {Array<{ id: string; path: string; version: string | null; official: boolean; manifest: object | null }>} currentPlugins
   * @param {string} sourcePluginsDir
   * @returns {Promise<Array<{ id: string; path: string; version: string | null; official: boolean; updated: boolean }>>}
   */
  async computeUpdates(currentPlugins, sourcePluginsDir) {
    const result = [];

    for (const plugin of currentPlugins) {
      if (!plugin.official) {
        result.push({ ...plugin, updated: false });
        continue;
      }

      const sourceManifestPath = path.join(sourcePluginsDir, plugin.id, 'manifest.json');
      const sourceManifest = await fs.readJson(sourceManifestPath).catch(() => null);
      const updated = sourceManifest !== null && sourceManifest.version !== plugin.version;

      result.push({
        ...plugin,
        version: sourceManifest?.version ?? plugin.version,
        updated,
      });
    }

    return result;
  }
}

module.exports = { PluginDetector };
