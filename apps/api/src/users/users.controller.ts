import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { User } from '@vortex/types';
import type { Request } from 'express';

import { SessionAuthGuard } from '../common/guards/session-auth.guard.js';
import { UsersService } from './users.service.js';

@Controller()
@UseGuards(SessionAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getCurrentUser(@Req() request: Request): Promise<User> {
    return this.usersService.getUser(request.session.userId!);
  }
}
