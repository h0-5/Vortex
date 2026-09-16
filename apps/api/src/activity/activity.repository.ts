import { Inject, Injectable } from '@nestjs/common';
import { activityEvents, type Database } from '@vortex/database';
import { and, desc, eq, gt, ilike, lt, sql } from 'drizzle-orm';

import { DATABASE } from '../config/tokens.js';

export interface ActivityFilter {
  actorId?: string | undefined;
  guildId?: string | undefined;
  pluginId?: string | undefined;
  action?: string | undefined;
  resourceType?: string | undefined;
  search?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface CreateActivityEvent {
  actorId: string;
  actorName: string;
  guildId?: string | null;
  pluginId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  type: string;
  message: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async list(filter: ActivityFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.max(1, Math.min(100, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(filter);

    const [rows, countResult] = await Promise.all([
      this.database
        .select()
        .from(activityEvents)
        .where(conditions)
        .orderBy(desc(activityEvents.createdAt))
        .limit(limit)
        .offset(offset),
      this.database
        .select({ count: sql<number>`count(*)::int` })
        .from(activityEvents)
        .where(conditions),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(event: CreateActivityEvent) {
    const [row] = await this.database
      .insert(activityEvents)
      .values({
        actorId: event.actorId,
        actorName: event.actorName,
        guildId: event.guildId ?? null,
        pluginId: event.pluginId ?? null,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        type: event.type,
        message: event.message,
        oldValue: event.oldValue ?? null,
        newValue: event.newValue ?? null,
        metadata: event.metadata ?? {},
      })
      .returning();
    return row;
  }

  private buildConditions(filter: ActivityFilter) {
    const conditions: Array<ReturnType<typeof eq>> = [];

    if (filter.actorId) {
      conditions.push(eq(activityEvents.actorId, filter.actorId));
    }
    if (filter.guildId) {
      conditions.push(eq(activityEvents.guildId, filter.guildId));
    }
    if (filter.pluginId) {
      conditions.push(eq(activityEvents.pluginId, filter.pluginId));
    }
    if (filter.action) {
      conditions.push(eq(activityEvents.action, filter.action));
    }
    if (filter.resourceType) {
      conditions.push(eq(activityEvents.resourceType, filter.resourceType));
    }
    if (filter.search) {
      conditions.push(ilike(activityEvents.message, `%${filter.search}%`));
    }
    if (filter.from) {
      conditions.push(gt(activityEvents.createdAt, filter.from));
    }
    if (filter.to) {
      conditions.push(lt(activityEvents.createdAt, filter.to));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
