import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { ApiEnvironment } from '@vortex/shared';
import type { Request, Response } from 'express';

import { SameOriginGuard } from '../common/guards/same-origin.guard.js';
import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { ZodValidationPipe } from '../common/http/zod-validation.pipe.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { discordCallbackQuerySchema, type DiscordCallbackQuery } from './auth.schemas.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  @Get('discord')
  @Redirect()
  login(@Req() request: Request) {
    return { url: this.authService.beginDiscordLogin(request.session) };
  }

  @Get('discord/callback')
  async callback(
    @Query(new ZodValidationPipe(discordCallbackQuerySchema)) query: DiscordCallbackQuery,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.authService.completeDiscordLogin(query, request);
    response.redirect(`${this.environment.DASHBOARD_URL}/dashboard`);
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard, SameOriginGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(request.session);
    response.clearCookie('vortex.sid');
  }
}
