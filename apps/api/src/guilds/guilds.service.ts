import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { guildMembers, guilds, users, type Database } from '@vortex/database';
import type { GuildDetail, GuildListResponse, GuildSummary, PermissionRole } from '@vortex/types';
import { and, eq, inArray, notInArray } from 'drizzle-orm';

import { DiscordApiClient, type DiscordGuild } from '../auth/discord-api.client.js';
import { DiscordTokenService } from '../auth/discord-token.service.js';
import { DATABASE } from '../config/tokens.js';
import { getGuildPermissionState, type GuildPermissionState } from './guild-permissions.js';

interface DiscordGuildWithPermission {
  guild: DiscordGuild;
  permission: GuildPermissionState;
}

type ManageableDiscordGuild = DiscordGuildWithPermission & {
  permission: GuildPermissionState & { permissionRole: PermissionRole };
};

interface CachedDiscordGuilds {
  fetchedAt: number;
  guilds: DiscordGuildWithPermission[];
}

const MANAGEABLE_GUILDS_CACHE_TTL_MS = 15_000;
const MANAGEABLE_GUILDS_STALE_TTL_MS = 5 * 60_000;

@Injectable()
export class GuildsService {
  private readonly guildCache = new Map<string, CachedDiscordGuilds>();

  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly discordTokenService: DiscordTokenService,
    private readonly discordApiClient: DiscordApiClient,
  ) {}

  async listGuilds(userId: string): Promise<GuildListResponse> {
    try {
      const discordGuilds = await this.getDiscordGuilds(userId);
      const manageableGuilds = discordGuilds.filter(isManageableDiscordGuild);
      await this.synchronizePermissionMappings(userId, manageableGuilds);
      const connectedGuildIds = await this.getConnectedGuildIds(discordGuilds);

      return {
        data: discordGuilds
          .map(({ guild, permission }) =>
            this.toGuildSummary(guild, permission, connectedGuildIds.has(guild.id)),
          )
          .sort((left, right) => left.name.localeCompare(right.name)),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException(
          'Discord authorization was not found. Please log in again.',
        );
      }
      if (error instanceof UnauthorizedException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to load guild list.');
    }
  }

  async getGuild(userId: string, guildId: string): Promise<GuildDetail> {
    const guild = (await this.listGuilds(userId)).data.find((item) => item.id === guildId);
    if (!guild || !guild.canManage) {
      throw new NotFoundException('The guild was not found or cannot be managed by this account.');
    }
    return guild;
  }

  private getCachedGuilds(userId: string, maxAgeMs: number): DiscordGuildWithPermission[] | null {
    const cacheEntry = this.guildCache.get(userId);
    if (!cacheEntry || !isCacheFresh(cacheEntry, maxAgeMs)) {
      return null;
    }
    return cacheEntry.guilds;
  }

  private async getDiscordGuilds(userId: string): Promise<DiscordGuildWithPermission[]> {
    const freshGuilds = this.getCachedGuilds(userId, MANAGEABLE_GUILDS_CACHE_TTL_MS);
    if (freshGuilds) {
      return freshGuilds;
    }

    const accessToken = await this.discordTokenService.getAccessToken(userId);
    try {
      const discordGuilds = await this.discordApiClient.getCurrentUserGuilds(accessToken);
      const guildsWithPermissions = discordGuilds.map((guild) => ({
        guild,
        permission: getGuildPermissionState(guild.owner, guild.permissions),
      }));

      this.guildCache.set(userId, {
        fetchedAt: Date.now(),
        guilds: guildsWithPermissions,
      });
      return guildsWithPermissions;
    } catch (error) {
      const staleGuilds = this.getCachedGuilds(userId, MANAGEABLE_GUILDS_STALE_TTL_MS);
      if (staleGuilds) {
        return staleGuilds;
      }
      throw error;
    }
  }

  private async getConnectedGuildIds(
    discordGuilds: DiscordGuildWithPermission[],
  ): Promise<Set<string>> {
    const guildIds = discordGuilds.map(({ guild }) => guild.id);
    if (guildIds.length === 0) {
      return new Set();
    }

    const rows = await this.database.select().from(guilds).where(inArray(guilds.id, guildIds));
    return new Set(rows.filter((guild) => guild.botPresent).map((guild) => guild.id));
  }

  private toGuildSummary(
    guild: DiscordGuild,
    permission: DiscordGuildWithPermission['permission'],
    botConnected: boolean,
  ): GuildSummary {
    const canManage = permission.permissionRole !== null;
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      memberCount: guild.approximate_member_count ?? null,
      canManage,
      isOwner: permission.isOwner,
      hasAdmin: permission.hasAdmin,
      hasManager: permission.hasManager,
      botConnected,
      action: canManage ? (botConnected ? 'manage' : 'add_bot') : null,
      permissionRole: permission.permissionRole,
    };
  }

  private async synchronizePermissionMappings(
    userId: string,
    manageableGuilds: ManageableDiscordGuild[],
  ): Promise<void> {
    await this.removeStalePermissionMappings(userId, manageableGuilds);
    const discordId = await this.getUserDiscordId(userId);

    for (const manageableGuild of manageableGuilds) {
      await this.synchronizePermissionMapping(userId, discordId, manageableGuild);
    }
  }

  private async removeStalePermissionMappings(
    userId: string,
    manageableGuilds: ManageableDiscordGuild[],
  ): Promise<void> {
    const guildIds = manageableGuilds.map(({ guild }) => guild.id);
    const condition =
      guildIds.length === 0
        ? eq(guildMembers.userId, userId)
        : and(eq(guildMembers.userId, userId), notInArray(guildMembers.guildId, guildIds));

    await this.database.delete(guildMembers).where(condition);
  }

  private async getUserDiscordId(userId: string): Promise<string> {
    const [user] = await this.database
      .select({ discordId: users.discordId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) {
      throw new NotFoundException('The authenticated user no longer exists.');
    }
    return user.discordId;
  }

  private async synchronizePermissionMapping(
    userId: string,
    discordId: string,
    manageableGuild: ManageableDiscordGuild,
  ): Promise<void> {
    if (manageableGuild.permission.isOwner) {
      await this.upsertOwnedGuild(manageableGuild.guild, discordId);
    }

    const guildExists = await this.guildExists(manageableGuild.guild.id);
    if (!guildExists) {
      return;
    }

    await this.database
      .insert(guildMembers)
      .values({
        guildId: manageableGuild.guild.id,
        userId,
        role: manageableGuild.permission.permissionRole,
      })
      .onConflictDoUpdate({
        target: [guildMembers.guildId, guildMembers.userId],
        set: {
          role: manageableGuild.permission.permissionRole,
          updatedAt: new Date(),
        },
      });
  }

  private async guildExists(guildId: string): Promise<boolean> {
    const [guild] = await this.database
      .select({ id: guilds.id })
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1);
    return guild !== undefined;
  }

  private async upsertOwnedGuild(guild: DiscordGuild, ownerId: string): Promise<void> {
    await this.database
      .insert(guilds)
      .values({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId,
        botPresent: false,
      })
      .onConflictDoUpdate({
        target: guilds.id,
        set: {
          name: guild.name,
          icon: guild.icon,
          ownerId,
          updatedAt: new Date(),
        },
      });
  }
}

function isManageableDiscordGuild(candidate: {
  guild: DiscordGuild;
  permission: GuildPermissionState;
}): candidate is ManageableDiscordGuild {
  return candidate.permission.permissionRole !== null;
}

function isCacheFresh(entry: CachedDiscordGuilds, maxAgeMs: number): boolean {
  return Date.now() - entry.fetchedAt <= maxAgeMs;
}
