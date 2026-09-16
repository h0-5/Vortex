import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { Session, SessionData } from 'express-session';

import { AuthRepository } from './auth.repository.js';
import { createOAuthProof, DiscordApiClient } from './discord-api.client.js';
import type { DiscordCallbackQuery } from './auth.schemas.js';

const OAUTH_FLOW_MAX_AGE_MS = 10 * 60 * 1_000;
type AppSession = Session & Partial<SessionData>;

@Injectable()
export class AuthService {
  constructor(
    private readonly discordApiClient: DiscordApiClient,
    private readonly authRepository: AuthRepository,
  ) {}

  beginDiscordLogin(session: AppSession): string {
    const proof = createOAuthProof();
    session.discordOAuth = {
      state: proof.state,
      verifier: proof.verifier,
      createdAt: Date.now(),
    };
    return this.discordApiClient.createAuthorizationUrl(proof.state, proof.challenge);
  }

  async completeDiscordLogin(query: DiscordCallbackQuery, request: Request): Promise<void> {
    const oauthFlow = request.session.discordOAuth;
    delete request.session.discordOAuth;
    this.assertOAuthFlow(query, oauthFlow);

    const tokens = await this.discordApiClient.exchangeAuthorizationCode(
      query.code,
      oauthFlow.verifier,
    );
    const profile = await this.discordApiClient.getCurrentUser(tokens.access_token);
    const user = await this.authRepository.saveDiscordIdentity(profile, tokens);

    const session = await regenerateSession(request);
    session.userId = user.id;
    await saveSession(session);
  }

  async logout(session: AppSession): Promise<void> {
    await destroySession(session);
  }

  private assertOAuthFlow(
    query: DiscordCallbackQuery,
    oauthFlow: AppSession['discordOAuth'],
  ): asserts oauthFlow is NonNullable<AppSession['discordOAuth']> {
    const isExpired =
      oauthFlow !== undefined && Date.now() - oauthFlow.createdAt > OAUTH_FLOW_MAX_AGE_MS;
    if (!oauthFlow || oauthFlow.state !== query.state || isExpired) {
      throw new UnauthorizedException('The Discord OAuth state is invalid or expired.');
    }
  }
}

function regenerateSession(request: Request): Promise<AppSession> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => {
      if (error) {
        reject(toError(error));
        return;
      }
      resolve(request.session);
    });
  });
}

function saveSession(session: AppSession): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((error) => (error ? reject(toError(error)) : resolve()));
  });
}

function destroySession(session: AppSession): Promise<void> {
  return new Promise((resolve, reject) => {
    session.destroy((error) => (error ? reject(toError(error)) : resolve()));
  });
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
