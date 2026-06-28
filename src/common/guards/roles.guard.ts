import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { User } from 'better-auth';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Role } from '@prisma/client';

/**
 * RolesGuard enforces Role-Based Access Control (RBAC).
 *
 * It is designed to run **after** `AuthGuard`. `AuthGuard` validates the
 * session and attaches the authenticated `user` object to the Express
 * `Request`; `RolesGuard` then reads the required roles from the route
 * metadata (set by the `@Roles()` decorator) and verifies that the user's
 * role is permitted.
 *
 * Usage:
 *   @UseGuards(AuthGuard, RolesGuard)
 *   @Roles(Role.ADMIN)
 *   @Get('admin-only')
 *   adminOnly() { ... }
 *
 * If no `@Roles()` metadata is present on the route, the guard allows access
 * (the route is simply authenticated, not role-restricted). This makes the
 * guard safe to apply at the controller level alongside `AuthGuard` without
 * forcing every route to declare roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read the roles declared by @Roles() on the handler (and fall back to
    // the controller class). `getAllAndOverride` merges both levels and
    // prefers the most specific (handler) value.
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() metadata => no role restriction, just allow (AuthGuard
    // already ensured the user is authenticated).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as (User & { role?: Role }) | undefined;

    // AuthGuard should have populated `request.user`. If it's missing, the
    // guard was applied without AuthGuard (misconfiguration) — deny access.
    if (!user) {
      throw new UnauthorizedException(
        'Authentication is required to access this resource.',
      );
    }

    // The `role` field is a custom column on the User model. If it's absent
    // for any reason, treat the user as having no privileged role.
    const userRole = user.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      this.logger.warn(
        `Access denied for user ${user.id} (role: ${userRole ?? 'none'}) — required: [${requiredRoles.join(', ')}]`,
      );
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    return true;
  }
}
