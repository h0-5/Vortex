import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import type { ApiEnvironment } from '@vortex/shared';
import {
  guildChannelSchema,
  guildEmojiSchema,
  guildRoleSchema,
  type GuildChannel,
  type GuildEmoji,
  type GuildRole,
} from '@vortex/types';
import { z } from 'zod';

import { API_ENVIRONMENT } from '../config/tokens.js';

const discordEmojiSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  animated: z.boolean().optional().default(false),
});
const discordChannelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.number().int(),
});
const discordRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.number().int().optional().default(0),
  position: z.number().int().optional().default(0),
  managed: z.boolean().optional().default(false),
});

@Injectable()
export class GuildEmojiService {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  async list(guildId: string): Promise<GuildEmoji[]> {
    const response = await this.getGuildResource(guildId, 'emojis');
    return z
      .array(discordEmojiSchema)
      .parse(await response.json())
      .filter((emoji) => emoji.name !== null)
      .map((emoji) =>
        guildEmojiSchema.parse({
          id: emoji.id,
          name: emoji.name,
          animated: emoji.animated,
          imageUrl: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`,
        }),
      );
  }

  async listTextChannels(guildId: string): Promise<GuildChannel[]> {
    const response = await this.getGuildResource(guildId, 'channels');
    return z
      .array(discordChannelSchema)
      .parse(await response.json())
      .filter((channel) => channel.name && (channel.type === 0 || channel.type === 5))
      .map((channel) =>
        guildChannelSchema.parse({ id: channel.id, name: channel.name, type: channel.type }),
      );
  }

  async listCategories(guildId: string): Promise<GuildChannel[]> {
    const response = await this.getGuildResource(guildId, 'channels');
    return z
      .array(discordChannelSchema)
      .parse(await response.json())
      .filter((channel) => channel.name && channel.type === 4)
      .map((channel) =>
        guildChannelSchema.parse({ id: channel.id, name: channel.name, type: channel.type }),
      );
  }

  async listRoles(guildId: string): Promise<GuildRole[]> {
    const response = await this.getGuildResource(guildId, 'roles');
    return z
      .array(discordRoleSchema)
      .parse(await response.json())
      .filter(
        (role) => role.name.trim().length > 0 && role.name !== '@everyone' && !role.managed,
      )
      .map((role) =>
        guildRoleSchema.parse({
          id: role.id,
          name: role.name,
          color: role.color,
          position: role.position,
          managed: role.managed,
        }),
      );
  }

  private async getGuildResource(guildId: string, resource: string): Promise<Response> {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/${resource}`, {
      headers: { Authorization: `Bot ${this.environment.DISCORD_BOT_TOKEN}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new BadGatewayException('Discord guild resources are temporarily unavailable.');
    }
    return response;
  }
}
