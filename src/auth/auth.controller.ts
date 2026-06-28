import {
  All,
  Controller,
  Req,
  Res,
  Logger,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AUTH } from './auth.constants';
import type { Auth } from './auth.config';

/**
 * Catch-all controller that forwards every request under the `auth` prefix
 * to Better Auth's native Node handler.
 *
 * Because Better Auth ships its own router (sign-in, sign-up, session, etc.),
 * we delegate the full request/response lifecycle to `toNodeHandler` instead
 * of re-implementing each route in NestJS.
 *
 * The global API prefix (`api/v1`) means auth routes are reachable at:
 *   `GET  /api/v1/auth/*`
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  /**
   * Catch-all route for every method and sub-path.
   * `@All('/*path')` matches GET/POST/PUT/DELETE/PATCH on any nested path.
   */
  @All('/*path')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    try {
      // `toNodeHandler` expects Node's IncomingMessage/ServerResponse,
      // which Express's req/res are compatible with.
      const handler = toNodeHandler(this.auth);
      await handler(req as never, res as never);
    } catch (error) {
      this.logger.error('Better Auth handler failed', error);
      if (!res.headersSent) {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Authentication service error' });
      }
    }
  }
}
