import type { PluginScope } from './runtime.js';

export interface PluginMigration {
  version: number;
  name: string;
  up(context: PluginMigrationContext): Promise<void> | void;
  down?(context: PluginMigrationContext): Promise<void> | void;
}

export interface PluginMigrationContext extends PluginScope {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

export interface PluginMigrationRegistry {
  register(migrations: PluginMigration[]): void;
  run(scope: PluginScope, targetVersion?: number): Promise<number>;
  getCurrentVersion(scope: PluginScope): Promise<number>;
}
