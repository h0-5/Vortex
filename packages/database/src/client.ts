import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export function createDatabase(databaseUrl: string) {
  const url = databaseUrl.replace(/sslmode=(require|verify-full|verify-ca|prefer)/iu, 'sslmode=no-verify');
  const pool = new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    db: createDatabaseFromPool(pool),
    pool,
  };
}

export function createDatabaseFromPool(pool: Pool) {
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDatabase>['db'];
export type DatabasePool = ReturnType<typeof createDatabase>['pool'];
