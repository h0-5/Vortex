import { Injectable } from '@nestjs/common';

import { AuthRepository } from './auth.repository.js';
import { DiscordApiClient } from './discord-api.client.js';

const TOKEN_REFRESH_WINDOW_MS = 60_000;

@Injectable()
export class DiscordTokenService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly discordApiClient: DiscordApiClient,
  ) {}

  async getAccessToken(userId: string): Promise<string> {
    const credentials = await this.authRepository.getDiscordCredentials(userId);
    if (credentials.expiresAt.getTime() > Date.now() + TOKEN_REFRESH_WINDOW_MS) {
      return credentials.accessToken;
    }

    const tokens = await this.discordApiClient.refreshAccessToken(credentials.refreshToken);
    await this.authRepository.updateDiscordCredentials(credentials.accountId, tokens);
    return tokens.access_token;
  }
}
