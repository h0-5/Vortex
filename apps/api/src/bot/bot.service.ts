import { Inject, Injectable } from '@nestjs/common';
import type { ApiEnvironment } from '@vortex/shared';
import type { BotProfile } from '@vortex/types';

import { API_ENVIRONMENT } from '../config/tokens.js';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

@Injectable()
export class BotService {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  async getProfile(): Promise<BotProfile> {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${this.environment.DISCORD_BOT_TOKEN}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error('Could not fetch bot profile from Discord.');
    }
    const user = (await response.json()) as DiscordUser;
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      discriminator: user.discriminator ?? null,
    };
  }
}
