import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DatabasePool } from '@vortex/database';
import type { PluginManifest } from '@vortex/types';

import { DATABASE_POOL } from '../config/tokens.js';
import { PluginDiscoveryService } from './plugin-discovery.service.js';

@Injectable()
export class PluginMigrationService {
  private readonly logger = new Logger(PluginMigrationService.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: DatabasePool,
    private readonly discovery: PluginDiscoveryService,
  ) {}

  async apply(manifests: PluginManifest[]): Promise<void> {
    for (const manifest of manifests) {
      await this.applyPluginMigrations(manifest.id);
    }
  }

  private async applyPluginMigrations(pluginId: string): Promise<void> {
    const directory = join(this.discovery.getPluginDirectory(pluginId), 'migrations');
    const migrationNames = await listSqlFiles(directory);
    for (const migrationName of migrationNames) {
      const rawSql = await readFile(join(directory, migrationName), 'utf8');
      const normalizedSql = normalizeSqlContent(rawSql);
      const checksum = sqlChecksum(normalizedSql);
      await this.applyMigration(pluginId, migrationName, checksum, rawSql);
    }
  }

  private async applyMigration(
    pluginId: string,
    migrationName: string,
    checksum: string,
    sql: string,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      const existing = await client.query<{ checksum: string }>(
        'SELECT checksum FROM plugin_migrations WHERE plugin_id = $1 AND migration_name = $2',
        [pluginId, migrationName],
      );

      await client.query('BEGIN');

      if (existing.rowCount) {
        const storedChecksum = existing.rows[0]!.checksum;

        if (storedChecksum === checksum) {
          await client.query('COMMIT');
          return;
        }

        this.logger.warn(
          `Plugin migration ${pluginId}/${migrationName} checksum changed; re-applying.`,
        );
      }

      await client.query(sql);
      if (existing.rowCount) {
        await client.query(
          'UPDATE plugin_migrations SET checksum = $1 WHERE plugin_id = $2 AND migration_name = $3',
          [checksum, pluginId, migrationName],
        );
      } else {
        await client.query(
          'INSERT INTO plugin_migrations (plugin_id, migration_name, checksum) VALUES ($1, $2, $3)',
          [pluginId, migrationName, checksum],
        );
      }
      await client.query('COMMIT');
      this.logger.log(`Applied plugin migration ${pluginId}/${migrationName}.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function sqlChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeSqlContent(content: string): string {
  return content.replace(/\r\n/gu, '\n').trimEnd();
}

async function listSqlFiles(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory))
      .filter((entry) => /^\d+_[a-z0-9_-]+\.sql$/u.test(entry))
      .sort();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
