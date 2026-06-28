import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from 'better-auth';

/**
 * Parameter decorator that extracts the authenticated user from the
 * Express `Request` object populated by `AuthGuard`.
 *
 * Usage:
 *   @UseGuards(AuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: User) {
 *     return user;
 *   }
 *
 * Optionally pass `false` to allow unauthenticated requests (returns `null`
 * when no session is present) — useful for optional-auth endpoints.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user) {
      return null;
    }

    // When a specific field is requested, return only that field.
    return data ? (request.user as User)[data] : (request.user as User);
  },
);
