import type { CommandPermissionConfig, PluginLogSettings } from '@vortex/types';
import type {
  CommandConfigurationReader,
  PluginLogger,
  PluginManagementReader,
  PluginScope,
  PluginStateReader,
  PluginStorageRepository,
} from '../plugin-contracts.js';
import { vi } from 'vitest';

export const scope: PluginScope = {
  guildId: '12345678901234567',
  pluginId: 'test-plugin',
};

export const permissions: CommandPermissionConfig = {
  allowedRoleIds: [],
  ignoredRoleIds: [],
  ignoredChannelIds: [],
  enabledChannelIds: [],
};

export function createLogger(): PluginLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
  };
}

export function createPluginState(enabled = true): PluginStateReader {
  return { isEnabled: vi.fn().mockResolvedValue(enabled) };
}

export function createPermissionReaders(config = permissions): {
  management: PluginManagementReader;
  commands: CommandConfigurationReader;
} {
  return {
    management: { canManage: vi.fn().mockResolvedValue(true) },
    commands: { getPermissions: vi.fn().mockResolvedValue(config) },
  };
}

export class MemoryStorageRepository implements PluginStorageRepository {
  readonly rows = new Map<string, unknown>();

  get<T>(target: PluginScope, key: string): Promise<T | null> {
    return Promise.resolve((this.rows.get(this.key(target, key)) as T | undefined) ?? null);
  }

  set<T>(target: PluginScope, key: string, value: T): Promise<void> {
    this.rows.set(this.key(target, key), value);
    return Promise.resolve();
  }

  delete(target: PluginScope, key: string): Promise<void> {
    this.rows.delete(this.key(target, key));
    return Promise.resolve();
  }

  list<T>(target: PluginScope, prefix: string): Promise<Array<{ key: string; value: T }>> {
    const scopePrefix = this.key(target, prefix);
    return Promise.resolve(
      [...this.rows.entries()]
        .filter(([key]) => key.startsWith(scopePrefix))
        .map(([key, value]) => ({
          key: key.slice(`${target.guildId}:${target.pluginId}:`.length),
          value: value as T,
        })),
    );
  }

  private key(target: PluginScope, key: string): string {
    return `${target.guildId}:${target.pluginId}:${key}`;
  }
}

export function createLogHarness(settings: PluginLogSettings) {
  return {
    settingsReader: { get: vi.fn((_scope: PluginScope) => Promise.resolve(settings)) },
    dashboard: { write: vi.fn(() => Promise.resolve()) },
    discord: { write: vi.fn(() => Promise.resolve()) },
  };
}
