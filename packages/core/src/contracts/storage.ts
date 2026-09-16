import type { PluginScope } from './runtime.js';

export interface PluginStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list<T>(prefix?: string): Promise<Array<{ key: string; value: T }>>;
  readOther<T>(pluginId: string, key: string): Promise<T | null>;
  writeOther<T>(pluginId: string, key: string, value: T): Promise<void>;
}

export interface PluginDatabase {
  get<T>(collection: string, key: string): Promise<T | null>;
  set<T>(collection: string, key: string, value: T): Promise<void>;
  delete(collection: string, key: string): Promise<void>;
  list<T>(collection: string, prefix?: string): Promise<Array<{ key: string; value: T }>>;
}

export interface PluginStorageRepository {
  get<T>(scope: PluginScope, key: string): Promise<T | null>;
  set<T>(scope: PluginScope, key: string, value: T): Promise<void>;
  delete(scope: PluginScope, key: string): Promise<void>;
  list<T>(scope: PluginScope, prefix: string): Promise<Array<{ key: string; value: T }>>;
}
