import { Inject, Injectable } from '@nestjs/common';
import { appSettings, type Database } from '@vortex/database';
import type { AppSettings } from '@vortex/types';
import { eq } from 'drizzle-orm';

import { DATABASE } from '../config/tokens.js';

@Injectable()
export class SettingsRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async get(): Promise<AppSettings | null> {
    const [row] = await this.database.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
    return row ? (row.value as AppSettings) : null;
  }

  async upsert(value: AppSettings): Promise<AppSettings> {
    const [row] = await this.database
      .insert(appSettings)
      .values({ id: 1, value })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return row!.value as AppSettings;
  }
}
