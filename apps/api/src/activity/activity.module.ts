import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { ActivityController } from './activity.controller.js';
import { ActivityRepository } from './activity.repository.js';
import { ActivityService } from './activity.service.js';

@Module({
  imports: [UsersModule],
  controllers: [ActivityController],
  providers: [ActivityRepository, ActivityService],
  exports: [ActivityRepository, ActivityService],
})
export class ActivityModule {}
