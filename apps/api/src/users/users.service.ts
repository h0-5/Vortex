import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { users, type Database } from '@vortex/database';
import type { User } from '@vortex/types';
import { eq } from 'drizzle-orm';

import { DATABASE } from '../config/tokens.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async getUser(userId: string): Promise<User> {
    const [user] = await this.database.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundException('The authenticated user no longer exists.');
    }

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
