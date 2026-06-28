import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Metadata key under which the required roles are stored on a route.
 * `RolesGuard` reads this key via `Reflector` to know which roles a handler
 * or controller allows.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator that declares which roles are allowed to access a route.
 *
 * It simply attaches the list of roles to the route's metadata — the actual
 * enforcement is performed by `RolesGuard`, which must be applied after
 * `AuthGuard` (so the user object is already populated on the request).
 *
 * Usage:
 *   @UseGuards(AuthGuard, RolesGuard)
 *   @Roles(Role.ADMIN)
 *   @Get('admin-only')
 *   adminOnly() { ... }
 *
 * The decorator accepts multiple roles; access is granted if the user has
 * ANY of them:
 *   @Roles(Role.ADMIN, Role.AUTHOR)
 *
 * @param roles - One or more `Role` enum values allowed to access the route.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
