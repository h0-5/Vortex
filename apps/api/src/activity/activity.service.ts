import { Injectable } from '@nestjs/common';
import { activityEventListResponseSchema, type ActivityEventListResponse, type ActivityQuery } from '@vortex/types';

import { UsersService } from '../users/users.service.js';
import { ActivityRepository, type CreateActivityEvent } from './activity.repository.js';

@Injectable()
export class ActivityService {
  constructor(
    private readonly repository: ActivityRepository,
    private readonly usersService: UsersService,
  ) {}

  async listForUser(userId: string, query: ActivityQuery): Promise<ActivityEventListResponse> {
    const result = await this.repository.list({
      actorId: userId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      action: query.action,
      resourceType: query.resourceType,
      guildId: query.guildId,
      pluginId: query.pluginId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return activityEventListResponseSchema.parse({
      data: result.rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actorName: row.actorName,
        guildId: row.guildId,
        pluginId: row.pluginId,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        type: row.type,
        message: row.message,
        oldValue: row.oldValue,
        newValue: row.newValue,
        metadata: row.metadata ?? {},
        createdAt: row.createdAt.toISOString(),
      })),
      meta: result.meta,
    });
  }

  async record(userId: string, event: Omit<CreateActivityEvent, 'actorId' | 'actorName'>) {
    const user = await this.usersService.getUser(userId);
    const actorName = user.globalName ?? user.username ?? 'Unknown';
    await this.repository.create({ actorId: userId, actorName, ...event });
  }
}
