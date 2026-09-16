import { Controller, Get, Param, Redirect, Req, UseGuards } from '@nestjs/common';
import { isDiscordSnowflake } from '@vortex/shared';
import type {
  GuildChannelListResponse,
  GuildDetail,
  GuildEmojiListResponse,
  GuildListResponse,
  GuildRoleListResponse,
} from '@vortex/types';
import type { Request } from 'express';
import { z } from 'zod';

import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe.js';
import { DiscordBotInviteService } from './discord-bot-invite.service.js';
import { GuildAccessService } from './guild-access.service.js';
import { GuildEmojiService } from './guild-emoji.service.js';
import { GuildsService } from './guilds.service.js';

@Controller('guilds')
@UseGuards(SessionAuthGuard)
export class GuildsController {
  constructor(
    private readonly guildsService: GuildsService,
    private readonly guildAccessService: GuildAccessService,
    private readonly discordBotInviteService: DiscordBotInviteService,
    private readonly guildEmojiService: GuildEmojiService,
  ) {}

  @Get()
  listGuilds(@Req() request: Request): Promise<GuildListResponse> {
    return this.guildsService.listGuilds(request.session.userId!);
  }

  @Get(':guildId/emojis')
  async listEmojis(
    @Req() request: Request,
    @Param(
      'guildId',
      new ZodValidationPipe(
        z.string().refine(isDiscordSnowflake, 'Guild ID must be a Discord snowflake.'),
      ),
    )
    guildId: string,
  ): Promise<GuildEmojiListResponse> {
    await this.guildAccessService.getConnectedGuild(request.session.userId!, guildId);
    return { data: await this.guildEmojiService.list(guildId) };
  }

  @Get(':guildId/channels')
  async listChannels(
    @Req() request: Request,
    @Param(
      'guildId',
      new ZodValidationPipe(
        z.string().refine(isDiscordSnowflake, 'Guild ID must be a Discord snowflake.'),
      ),
    )
    guildId: string,
  ): Promise<GuildChannelListResponse> {
    await this.guildAccessService.getConnectedGuild(request.session.userId!, guildId);
    return { data: await this.guildEmojiService.listTextChannels(guildId) };
  }

  @Get(':guildId/categories')
  async listCategories(
    @Req() request: Request,
    @Param(
      'guildId',
      new ZodValidationPipe(
        z.string().refine(isDiscordSnowflake, 'Guild ID must be a Discord snowflake.'),
      ),
    )
    guildId: string,
  ): Promise<GuildChannelListResponse> {
    await this.guildAccessService.getConnectedGuild(request.session.userId!, guildId);
    return { data: await this.guildEmojiService.listCategories(guildId) };
  }

  @Get(':guildId/roles')
  async listRoles(
    @Req() request: Request,
    @Param(
      'guildId',
      new ZodValidationPipe(
        z.string().refine(isDiscordSnowflake, 'Guild ID must be a Discord snowflake.'),
      ),
    )
    guildId: string,
  ): Promise<GuildRoleListResponse> {
    await this.guildAccessService.getConnectedGuild(request.session.userId!, guildId);
    return { data: await this.guildEmojiService.listRoles(guildId) };
  }

  @Get(':guildId')
  getGuild(
    @Req() request: Request,
    @Param(
      'guildId',
      new ZodValidationPipe(
        z.string().refine(isDiscordSnowflake, 'Guild ID must be a Discord snowflake.'),
      ),
    )
    guildId: string,
  ): Promise<GuildDetail> {
    return this.guildsService.getGuild(request.session.userId!, guildId);
  }

  @Get(':guildId/bot-invite')
  @Redirect()
  async inviteBot(
    @Req() request: Request,
    @Param(
      'guildId',
      new ZodValidationPipe(
        z.string().refine(isDiscordSnowflake, 'Guild ID must be a Discord snowflake.'),
      ),
    )
    guildId: string,
  ) {
    await this.guildAccessService.getManageableGuild(request.session.userId!, guildId);
    return { url: this.discordBotInviteService.createInviteUrl(guildId) };
  }
}
