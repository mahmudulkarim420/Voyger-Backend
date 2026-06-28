import { plainToInstance } from 'class-transformer';
import type { User } from 'better-auth';

/**
 * Better Auth's base `User` type only ships the core fields. The `role` column
 * is a custom field added to the Prisma `User` model, so we extend the type
 * locally to access it in a type-safe way without disabling type-checking.
 */
type UserWithRole = User & { role?: string };

/**
 * Safe representation of a user returned by any public-facing endpoint.
 *
 * SECURITY: We never echo back the raw Better Auth `User` object. Instead we
 * explicitly whitelist the fields that are safe to expose to the client. This
 * guarantees that sensitive/internal fields (e.g. session tokens, account
 * secrets, or anything Better Auth may add to the `User` type in the future)
 * can never leak through a response.
 *
 * The fields mirror the public columns of the `User` Prisma model.
 */
export class UserResponseDto {
  id: string;

  name: string;

  email: string;

  emailVerified: boolean;

  image: string | null;

  role: string;

  createdAt: Date;

  updatedAt: Date;

  /**
   * Builds a `UserResponseDto` from a Better Auth `User`, copying only the
   * whitelisted fields. Any other property on the source object is dropped.
   */
  static fromUser(user: UserWithRole): UserResponseDto {
    return plainToInstance(UserResponseDto, {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
