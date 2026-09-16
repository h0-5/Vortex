import { Controller, Get, UseGuards } from '@nestjs/common';
import { botProfileSchema } from '@vortex/types';

import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { BotService } from './bot.service.js';

@Controller('bot')
@UseGuards(SessionAuthGuard)
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Get('profile')
  async getProfile() {
    return botProfileSchema.parse(await this.botService.getProfile());
  }
}
