import type {
  PluginDatabase,
  PluginScope,
  PluginStorage,
  PluginStorageRepository,
} from '../plugin-contracts.js';

export class ScopedPluginStorage implements PluginStorage {
  constructor(
    private readonly scope: PluginScope,
    private readonly repository: PluginStorageRepository,
  ) {}

  get<T>(key: string): Promise<T | null> {
    return this.repository.get(this.scope, validateKey(key));
  }

  set<T>(key: string, value: T): Promise<void> {
    return this.repository.set(this.scope, validateKey(key), value);
  }

  delete(key: string): Promise<void> {
    return this.repository.delete(this.scope, validateKey(key));
  }

  list<T>(prefix = ''): Promise<Array<{ key: string; value: T }>> {
    return this.repository.list(this.scope, validatePrefix(prefix));
  }

  readOther<T>(pluginId: string, key: string): Promise<T | null> {
    return this.repository.get(
      { guildId: this.scope.guildId, pluginId },
      validateKey(key),
    );
  }

  writeOther<T>(pluginId: string, key: string, value: T): Promise<void> {
    return this.repository.set(
      { guildId: this.scope.guildId, pluginId },
      validateKey(key),
      value,
    );
  }
}

export class ScopedPluginDatabase implements PluginDatabase {
  constructor(private readonly storage: PluginStorage) {}

  get<T>(collection: string, key: string): Promise<T | null> {
    return this.storage.get(toDatabaseKey(collection, key));
  }

  set<T>(collection: string, key: string, value: T): Promise<void> {
    return this.storage.set(toDatabaseKey(collection, key), value);
  }

  delete(collection: string, key: string): Promise<void> {
    return this.storage.delete(toDatabaseKey(collection, key));
  }

  async list<T>(collection: string, prefix = ''): Promise<Array<{ key: string; value: T }>> {
    const namespace = `${validateSegment(collection)}/`;
    const rows = await this.storage.list<T>(`${namespace}${validatePrefix(prefix)}`);
    return rows.map((row) => ({ ...row, key: row.key.slice(namespace.length) }));
  }
}

function toDatabaseKey(collection: string, key: string): string {
  return `${validateSegment(collection)}/${validateKey(key)}`;
}

function validateSegment(value: string): string {
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(value)) {
    throw new Error('Collection names must use lowercase letters, digits, _ or -.');
  }
  return value;
}

function validateKey(value: string): string {
  if (!value || value.length > 255 || value.includes('..') || value.startsWith('/')) {
    throw new Error('Storage key is invalid.');
  }
  return value;
}

function validatePrefix(value: string): string {
  return value === '' ? value : validateKey(value);
}
