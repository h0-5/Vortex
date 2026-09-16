import { Injectable } from '@nestjs/common';
import semver from 'semver';

import { CORE_VERSION } from './plugin-discovery.service.js';

export type OfficialDashboardMode = 'schema' | 'bundle' | 'none';

export interface OfficialPluginDefinition {
  id: string;
  expectedManifestId: string;
  minCoreVersion: string;
  /** How the plugin intends to render its dashboard. Core does not implement the UI; it only routes to the plugin's own dashboard provider or schema. */
  dashboardMode: OfficialDashboardMode;
  /** Identifier of a bundled dashboard renderer when dashboardMode is 'bundle' (future use). */
  dashboardProvider?: string;
  /** Relative path inside the plugin package where the dashboard schema is expected. */
  schemaPath?: string;
}

const OFFICIAL_PLUGINS: Record<string, OfficialPluginDefinition> = {
  welcome: {
    id: 'welcome',
    expectedManifestId: 'welcome',
    minCoreVersion: '0.2.5',
    dashboardMode: 'schema',
    dashboardProvider: 'welcomeDashboardProvider',
    schemaPath: 'dashboard.schema.json',
  },
  tickets: {
    id: 'tickets',
    expectedManifestId: 'tickets',
    minCoreVersion: '0.3.0',
    dashboardMode: 'schema',
    dashboardProvider: 'ticketsDashboardProvider',
    schemaPath: 'dashboard.schema.json',
  },
};

@Injectable()
export class OfficialPluginRegistry {
  isOfficial(pluginId: string): boolean {
    return pluginId in OFFICIAL_PLUGINS;
  }

  getById(pluginId: string): OfficialPluginDefinition | undefined {
    return OFFICIAL_PLUGINS[pluginId];
  }

  getDashboardMode(pluginId: string): OfficialDashboardMode {
    return OFFICIAL_PLUGINS[pluginId]?.dashboardMode ?? 'none';
  }

  isSupported(pluginId: string, coreVersion: string = CORE_VERSION): boolean {
    const definition = OFFICIAL_PLUGINS[pluginId];
    if (!definition) {
      return false;
    }
    return semver.gte(coreVersion, definition.minCoreVersion);
  }

  getExpectedManifestId(pluginId: string): string | undefined {
    return OFFICIAL_PLUGINS[pluginId]?.expectedManifestId;
  }

  getSchemaPath(pluginId: string): string | undefined {
    return OFFICIAL_PLUGINS[pluginId]?.schemaPath;
  }
}
