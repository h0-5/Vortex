import { guildMembers, guilds, users, type Database } from '@vortex/database';
import type { Guild } from 'discord.js';
import { eq } from 'drizzle-orm';

const ABSENT_DEBOUNCE_MS = 5_000;

export class GuildStore {
  private readonly pendingAbsent = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly database: Database) {}

  async markPresent(guild: Guild): Promise<void> {
    const timeout = this.pendingAbsent.get(guild.id);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingAbsent.delete(guild.id);
    }

    await this.database
      .insert(guilds)
      .values({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        botPresent: true,
      })
      .onConflictDoUpdate({
        target: guilds.id,
        set: {
          name: guild.name,
          icon: guild.icon,
          ownerId: guild.ownerId,
          botPresent: true,
          updatedAt: new Date(),
        },
      });

    await this.synchronizeKnownOwner(guild);
  }

  markAbsent(guildId: string): void {
    this.pendingAbsent.set(
      guildId,
      setTimeout(async () => {
        this.pendingAbsent.delete(guildId);
        await this.database
          .update(guilds)
          .set({ botPresent: false, updatedAt: new Date() })
          .where(eq(guilds.id, guildId));
      }, ABSENT_DEBOUNCE_MS),
    );
  }

  private async synchronizeKnownOwner(guild: Guild): Promise<void> {
    const [owner] = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.discordId, guild.ownerId))
      .limit(1);

    if (!owner) {
      return;
    }

    await this.database
      .insert(guildMembers)
      .values({ guildId: guild.id, userId: owner.id, role: 'OWNER' })
      .onConflictDoUpdate({
        target: [guildMembers.guildId, guildMembers.userId],
        set: { role: 'OWNER', updatedAt: new Date() },
      });
  }
}
