import { describe, expect, it } from 'vitest';

import { ScopedPluginDatabase, ScopedPluginStorage } from './storage.js';
import { MemoryStorageRepository, scope } from './test-helpers.js';

describe('ScopedPluginDatabase', () => {
  it('isolates values by collection and key', async () => {
    const repository = new MemoryStorageRepository();
    const storage = new ScopedPluginStorage(scope, repository);
    const database = new ScopedPluginDatabase(storage);

    await database.set('settings', 'theme', { dark: true });
    await database.set('settings', 'locale', 'en');
    await database.set('stats', 'invites', 42);

    await expect(database.get('settings', 'theme')).resolves.toEqual({ dark: true });
    await expect(database.get('settings', 'locale')).resolves.toBe('en');
    await expect(database.get('stats', 'invites')).resolves.toBe(42);
    await expect(database.get('settings', 'missing')).resolves.toBeNull();
  });

  it('lists entries within a collection', async () => {
    const repository = new MemoryStorageRepository();
    const storage = new ScopedPluginStorage(scope, repository);
    const database = new ScopedPluginDatabase(storage);

    await database.set('config', 'channelId', '123');
    await database.set('config', 'prefix', '!');
    await database.set('unrelated', 'key', 'ignored');

    const entries = await database.list<unknown>('config');
    const keys = entries.map((entry) => entry.key).sort();
    expect(keys).toEqual(['channelId', 'prefix']);
  });

  it('deletes entries from a collection', async () => {
    const repository = new MemoryStorageRepository();
    const storage = new ScopedPluginStorage(scope, repository);
    const database = new ScopedPluginDatabase(storage);

    await database.set('cache', 'entry', { cached: true });
    await database.delete('cache', 'entry');

    await expect(database.get('cache', 'entry')).resolves.toBeNull();
  });

  it('isolates data between different plugins in the same guild', async () => {
    const repository = new MemoryStorageRepository();
    const first = new ScopedPluginDatabase(new ScopedPluginStorage(scope, repository));
    const second = new ScopedPluginDatabase(
      new ScopedPluginStorage({ ...scope, pluginId: 'other' }, repository),
    );

    await first.set('config', 'key', 'first-value');
    await second.set('config', 'key', 'second-value');

    await expect(first.get('config', 'key')).resolves.toBe('first-value');
    await expect(second.get('config', 'key')).resolves.toBe('second-value');
  });

  it('rejects invalid collection names', () => {
    const repository = new MemoryStorageRepository();
    const storage = new ScopedPluginStorage(scope, repository);
    const database = new ScopedPluginDatabase(storage);

    expect(() => database.set('Invalid Name', 'key', true)).toThrow();
    expect(() => database.set('UPPERCASE', 'key', true)).toThrow();
    expect(() => database.set('', 'key', true)).toThrow();
  });
});
