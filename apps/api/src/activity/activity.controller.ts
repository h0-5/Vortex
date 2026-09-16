import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { activityEventListResponseSchema, activityQuerySchema, type ActivityEventListResponse, type ActivityQuery } from '@vortex/types';
import type { Request } from 'express';

import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe.js';
import { ActivityService } from './activity.service.js';

@Controller('activity')
@UseGuards(SessionAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async listActivity(
    @Req() request: Request,
    @Query(new ZodValidationPipe(activityQuerySchema)) query: ActivityQuery,
  ): Promise<ActivityEventListResponse> {
    const events = await this.activityService.listForUser(request.session.userId!, query);
    return activityEventListResponseSchema.parse(events);
  }
}
