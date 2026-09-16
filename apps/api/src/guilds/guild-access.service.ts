import { ConflictException, Injectable } from '@nestjs/common';
import type { GuildDetail } from '@vortex/types';

import { GuildsService } from './guilds.service.js';

@Injectable()
export class GuildAccessService {
  constructor(private readonly guildsService: GuildsService) {}

  getManageableGuild(userId: string, guildId: string): Promise<GuildDetail> {
    return this.guildsService.getGuild(userId, guildId);
  }

  async getConnectedGuild(userId: string, guildId: string): Promise<GuildDetail> {
    const guild = await this.getManageableGuild(userId, guildId);
    if (!guild.botConnected) {
      throw new ConflictException('The Vortex bot must be connected to this guild.');
    }
    return guild;
  }
}
