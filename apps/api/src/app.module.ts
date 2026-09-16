import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { ActivityModule } from './activity/activity.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BotModule } from './bot/bot.module.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { GuildsModule } from './guilds/guilds.module.js';
import { HealthController } from './health/health.controller.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';
import { PluginsModule } from './plugins/plugins.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp:
        process.env.NODE_ENV === 'development'
          ? {
              autoLogging: false,
              transport: { target: 'pino-pretty', options: { singleLine: true } },
            }
          : { autoLogging: false },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    GuildsModule,
    MonitoringModule,
    BotModule,
    PluginsModule,
    SettingsModule,
    ActivityModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
