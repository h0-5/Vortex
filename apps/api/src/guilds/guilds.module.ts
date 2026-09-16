import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DiscordBotInviteService } from './discord-bot-invite.service.js';
import { GuildAccessService } from './guild-access.service.js';
import { GuildEmojiService } from './guild-emoji.service.js';
import { GuildsController } from './guilds.controller.js';
import { GuildsService } from './guilds.service.js';

@Module({
  imports: [AuthModule],
  controllers: [GuildsController],
  providers: [DiscordBotInviteService, GuildAccessService, GuildEmojiService, GuildsService],
  exports: [GuildAccessService, GuildsService],
})
export class GuildsModule {}
