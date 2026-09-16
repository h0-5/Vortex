import { Module } from '@nestjs/common';

import { SameOriginGuard } from '../common/guards/same-origin.guard.js';
import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { DiscordApiClient } from './discord-api.client.js';
import { DiscordTokenService } from './discord-token.service.js';
import { TokenCipher } from './token-cipher.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    DiscordApiClient,
    DiscordTokenService,
    SameOriginGuard,
    SessionAuthGuard,
    TokenCipher,
  ],
  exports: [DiscordApiClient, DiscordTokenService, SessionAuthGuard],
})
export class AuthModule {}
