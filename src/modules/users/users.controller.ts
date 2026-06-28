import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { User } from 'better-auth';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserResponseDto } from './dto/user-response.dto';

/**
 * UsersController exposes user-facing endpoints.
 *
 * All routes here are protected by `AuthGuard`, which validates the Better Auth
 * session and attaches the resolved `user`/`session` objects to the request.
 * The `@CurrentUser()` decorator then pulls the authenticated user out of the
 * request so handlers don't need to touch the raw `Request` object.
 *
 * Base path (with global prefix): `GET /api/v1/users/*`
 */
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  /**
   * Returns the profile of the currently authenticated user.
   *
   * The `AuthGuard` guarantees that a valid session exists before this handler
   * runs, so `@CurrentUser()` always resolves to a non-null `User`.
   *
   * Route: `GET /api/v1/users/profile`
   */
  @Get('profile')
  getProfile(@CurrentUser() user: User): UserResponseDto {
    // SECURITY: Never return the raw `user` object — it may contain sensitive
    // fields (tokens, account secrets, etc.). `UserResponseDto.fromUser`
    // whitelists only the safe, public fields before serializing.
    return UserResponseDto.fromUser(user);
  }

  /**
   * Admin-only endpoint demonstrating Role-Based Access Control (RBAC).
   *
   * Guard order matters: `AuthGuard` runs first (validates the session and
   * attaches `request.user`), then `RolesGuard` reads the `@Roles()`
   * metadata and verifies the user's role. Only users with `Role.ADMIN`
   * reach the handler; everyone else gets a `403 Forbidden`.
   *
   * Route: `GET /api/v1/users/admin`
   */
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  adminOnly(@CurrentUser() user: User) {
    return {
      message: `Welcome, ${user.name}. You have admin access.`,
      adminId: user.id,
    };
  }
}
