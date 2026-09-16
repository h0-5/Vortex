import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsRepository } from './settings.repository.js';
import { SettingsService } from './settings.service.js';
import { SettingsUploadService } from './settings-upload.service.js';

@Module({
  imports: [DatabaseModule, ActivityModule],
  controllers: [SettingsController],
  providers: [SettingsRepository, SettingsService, SettingsUploadService],
})
export class SettingsModule {}
