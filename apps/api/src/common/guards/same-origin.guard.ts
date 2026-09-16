import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ApiEnvironment } from '@vortex/shared';
import type { Request } from 'express';

import { API_ENVIRONMENT } from '../../config/tokens.js';

@Injectable()
export class SameOriginGuard implements CanActivate {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.header('origin');
    const dashboardUrl = this.environment.DASHBOARD_URL.replace(/\/+$/u, '');
    if (origin !== dashboardUrl) {
      throw new ForbiddenException('The request origin is not allowed.');
    }
    return true;
  }
}
