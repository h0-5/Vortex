import { createHash, randomBytes } from 'node:crypto';

import { BadGatewayException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ApiEnvironment } from '@vortex/shared';
import { z } from 'zod';

import { API_ENVIRONMENT } from '../config/tokens.js';

const DISCORD_REQUEST_TIMEOUT_MS = 10_000;
const DISCORD_RETRY_DELAYS_MS = [500, 1_000];

const discordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  global_name: z.string().nullable(),
});

const discordGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  approximate_member_count: z.number().int().nullable().optional(),
  owner: z.boolean(),
  permissions: z.string(),
});

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().positive(),
  scope: z.string(),
  token_type: z.literal('Bearer'),
});

export type DiscordUser = z.infer<typeof discordUserSchema>;
export type DiscordGuild = z.infer<typeof discordGuildSchema>;
export type DiscordTokenResponse = z.infer<typeof tokenResponseSchema>;

@Injectable()
export class DiscordApiClient {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  createAuthorizationUrl(state: string, challenge: string): string {
    const url = new URL('https://discord.com/oauth2/authorize');
    url.search = new URLSearchParams({
      client_id: this.environment.DISCORD_CLIENT_ID,
      redirect_uri: this.environment.DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  }

  async exchangeAuthorizationCode(code: string, verifier: string): Promise<DiscordTokenResponse> {
    return this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.environment.DISCORD_REDIRECT_URI,
      code_verifier: verifier,
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<DiscordTokenResponse> {
    return this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  async getCurrentUser(accessToken: string): Promise<DiscordUser> {
    return this.getDiscordResource('/users/@me', accessToken, discordUserSchema);
  }

  async getCurrentUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
    return this.getDiscordResource('/users/@me/guilds?with_counts=true', accessToken, z.array(discordGuildSchema));
  }

  private async requestToken(parameters: Record<string, string>): Promise<DiscordTokenResponse> {
    const response = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${this.environment.DISCORD_CLIENT_ID}:${this.environment.DISCORD_CLIENT_SECRET}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(parameters),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Discord rejected the OAuth authorization.');
    }

    return tokenResponseSchema.parse(await response.json());
  }

  private async getDiscordResource<T>(
    path: string,
    accessToken: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const response = await this.fetchDiscordResource(path, accessToken);

    if (response.status === 401) {
      throw new UnauthorizedException('The Discord authorization has expired.');
    }
    if (!response.ok) {
      throw new BadGatewayException('Discord API is temporarily unavailable.');
    }
    return schema.parse(await response.json());
  }

  private async fetchDiscordResource(path: string, accessToken: string): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= DISCORD_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const response = await fetch(`https://discord.com/api/v10${path}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS),
        });

        if (!shouldRetryDiscordResponse(response) || attempt === DISCORD_RETRY_DELAYS_MS.length) {
          return response;
        }
      } catch (error) {
        lastError = error;
        if (attempt === DISCORD_RETRY_DELAYS_MS.length || !isRetryableDiscordError(error)) {
          break;
        }
      }

      await sleep(DISCORD_RETRY_DELAYS_MS[attempt]!);
    }

    throw new BadGatewayException('Discord API is temporarily unavailable.', {
      cause: lastError,
    });
  }
}

export function createOAuthProof(): {
  state: string;
  verifier: string;
  challenge: string;
} {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { state, verifier, challenge };
}

function shouldRetryDiscordResponse(response: Response): boolean {
  return response.status === 429 || response.status >= 500;
}

function isRetryableDiscordError(error: unknown): boolean {
  return error instanceof Error;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
