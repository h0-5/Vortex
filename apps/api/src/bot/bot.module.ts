import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { BotController } from './bot.controller.js';
import { BotService } from './bot.service.js';

@Module({
  imports: [AuthModule],
  controllers: [BotController],
  providers: [BotService],
})
export class BotModule {}
