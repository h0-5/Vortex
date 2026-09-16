import { Inject, Injectable } from '@nestjs/common';
import type { ApiEnvironment } from '@vortex/shared';

import { API_ENVIRONMENT } from '../config/tokens.js';

/**
 * Discord permission bitfield for the bot invite URL.
 * VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | ATTACH_FILES | READ_MESSAGE_HISTORY
 * | USE_EXTERNAL_EMOJIS | CREATE_INSTANT_INVITE | MANAGE_ROLES
 */
const REQUIRED_BOT_PERMISSIONS = '268815361';

@Injectable()
export class DiscordBotInviteService {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  createInviteUrl(guildId: string): string {
    const url = new URL('https://discord.com/oauth2/authorize');
    url.search = new URLSearchParams({
      client_id: this.environment.DISCORD_CLIENT_ID,
      scope: 'bot applications.commands',
      permissions: REQUIRED_BOT_PERMISSIONS,
      guild_id: guildId,
      disable_guild_select: 'true',
      integration_type: '0',
    }).toString();
    return url.toString();
  }
}
