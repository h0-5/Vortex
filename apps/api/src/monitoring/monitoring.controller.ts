import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { isDiscordSnowflake } from '@vortex/shared';
import type { PluginLogListResponse } from '@vortex/types';
import type { Request } from 'express';
import { z } from 'zod';

import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe.js';
import { GuildAccessService } from '../guilds/guild-access.service.js';
import { PluginManager } from '../plugins/plugin-manager.service.js';

@Controller('guilds')
@UseGuards(SessionAuthGuard)
export class MonitoringController {
  constructor(
    private readonly guildAccessService: GuildAccessService,
    private readonly pluginManager: PluginManager,
  ) {}

  @Get(':guildId/logs')
  async listGuildLogs(
    @Req() request: Request,
    @Param(
      'guildId',
      new ZodValidationPipe(
        z.string().refine(isDiscordSnowflake, 'Guild ID must be a Discord snowflake.'),
      ),
    )
    guildId: string,
  ): Promise<PluginLogListResponse> {
    await this.guildAccessService.getConnectedGuild(request.session.userId!, guildId);
    return { data: await this.pluginManager.listGuildLogs(guildId) };
  }
}
