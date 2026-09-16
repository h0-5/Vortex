import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { GuildsModule } from '../guilds/guilds.module.js';
import { PluginsModule } from '../plugins/plugins.module.js';
import { MonitoringController } from './monitoring.controller.js';

@Module({
  imports: [AuthModule, GuildsModule, PluginsModule],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
