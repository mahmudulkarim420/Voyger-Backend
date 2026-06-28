import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH } from '../../auth/auth.constants';
import type { Auth } from '../../auth/auth.config';
import '../types/auth.types';

/**
 * AuthGuard validates the current session using Better Auth's
 * `auth.api.getSession` endpoint.
 *
 * It reads the request headers (cookies / bearer token) and asks Better Auth
 * to resolve the session. When a valid session exists, the `user` and
 * `session` objects are attached to the Express `Request` so downstream
 * handlers and the `@CurrentUser()` decorator can access them.
 *
 * Usage:
 *   @UseGuards(AuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: User) { ... }
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Better Auth's getSession expects the raw request headers to read
      // cookies / authorization headers.
      const session = await this.auth.api.getSession({
        headers: request.headers as never,
      });

      if (!session) {
        throw new UnauthorizedException(
          'You are not authenticated. Please sign in.',
        );
      }

      // Attach the resolved session/user for downstream use.
      request.user = session.user;
      request.session = session.session;

      return true;
    } catch (error) {
      // Re-throw NestJS exceptions as-is so the exception filter maps them.
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Session validation failed', error);
      throw new UnauthorizedException('Invalid or expired session.');
    }
  }
}
