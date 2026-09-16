import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { oauthAccounts, users, type Database, type UserRecord } from '@vortex/database';
import { and, eq } from 'drizzle-orm';

import { DATABASE } from '../config/tokens.js';
import type { DiscordTokenResponse, DiscordUser } from './discord-api.client.js';
import { TokenCipher, type EncryptedToken } from './token-cipher.js';

interface StoredDiscordCredentials {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly tokenCipher: TokenCipher,
  ) {}

  async saveDiscordIdentity(
    profile: DiscordUser,
    tokens: DiscordTokenResponse,
  ): Promise<UserRecord> {
    const accessToken = this.tokenCipher.encrypt(tokens.access_token);
    const refreshToken = this.tokenCipher.encrypt(tokens.refresh_token);

    return this.database.transaction(async (transaction) => {
      const [user] = await transaction
        .insert(users)
        .values(toUserInsert(profile))
        .onConflictDoUpdate({
          target: users.discordId,
          set: {
            username: profile.username,
            avatar: profile.avatar,
            globalName: profile.global_name,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!user) {
        throw new Error('Discord user upsert did not return a user.');
      }

      await transaction
        .insert(oauthAccounts)
        .values(toOAuthAccountInsert(user.id, profile.id, tokens, accessToken, refreshToken))
        .onConflictDoUpdate({
          target: [oauthAccounts.userId, oauthAccounts.provider],
          set: toOAuthAccountUpdate(tokens, accessToken, refreshToken),
        });

      return user;
    });
  }

  async getDiscordCredentials(userId: string): Promise<StoredDiscordCredentials> {
    const [account] = await this.database
      .select()
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, 'discord')))
      .limit(1);

    if (!account) {
      throw new NotFoundException('Discord authorization was not found.');
    }

    return {
      accountId: account.id,
      accessToken: this.tokenCipher.decrypt({
        ciphertext: account.accessTokenCiphertext,
        iv: account.accessTokenIv,
        authTag: account.accessTokenAuthTag,
      }),
      refreshToken: this.tokenCipher.decrypt({
        ciphertext: account.refreshTokenCiphertext,
        iv: account.refreshTokenIv,
        authTag: account.refreshTokenAuthTag,
      }),
      expiresAt: account.expiresAt,
    };
  }

  async updateDiscordCredentials(accountId: string, tokens: DiscordTokenResponse): Promise<void> {
    const accessToken = this.tokenCipher.encrypt(tokens.access_token);
    const refreshToken = this.tokenCipher.encrypt(tokens.refresh_token);

    await this.database
      .update(oauthAccounts)
      .set(toOAuthAccountUpdate(tokens, accessToken, refreshToken))
      .where(eq(oauthAccounts.id, accountId));
  }
}

function toUserInsert(profile: DiscordUser) {
  return {
    discordId: profile.id,
    username: profile.username,
    avatar: profile.avatar,
    globalName: profile.global_name,
  };
}

function toOAuthAccountInsert(
  userId: string,
  providerAccountId: string,
  tokens: DiscordTokenResponse,
  accessToken: EncryptedToken,
  refreshToken: EncryptedToken,
) {
  return {
    userId,
    provider: 'discord',
    providerAccountId,
    ...toOAuthAccountUpdate(tokens, accessToken, refreshToken),
  };
}

function toOAuthAccountUpdate(
  tokens: DiscordTokenResponse,
  accessToken: EncryptedToken,
  refreshToken: EncryptedToken,
) {
  return {
    accessTokenCiphertext: accessToken.ciphertext,
    accessTokenIv: accessToken.iv,
    accessTokenAuthTag: accessToken.authTag,
    refreshTokenCiphertext: refreshToken.ciphertext,
    refreshTokenIv: refreshToken.iv,
    refreshTokenAuthTag: refreshToken.authTag,
    scopes: tokens.scope,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1_000),
    updatedAt: new Date(),
  };
}
