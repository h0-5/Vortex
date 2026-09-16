import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createDatabase, createDatabaseFromPool, type DatabasePool } from '@vortex/database';
import type { ApiEnvironment } from '@vortex/shared';

import { API_ENVIRONMENT, DATABASE, DATABASE_POOL } from '../config/tokens.js';

class DatabaseShutdown implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: DatabasePool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [API_ENVIRONMENT],
      useFactory: (environment: ApiEnvironment) => createDatabase(environment.DATABASE_URL).pool,
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: DatabasePool) => createDatabaseFromPool(pool),
    },
    DatabaseShutdown,
  ],
  exports: [DATABASE, DATABASE_POOL],
})
export class DatabaseModule {}
