import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '@prisma/client';

/**
 * Factory that builds a configured Better Auth instance bound to the given
 * Prisma client. Kept as a factory (rather than a singleton at module scope)
 * so the NestJS DI container can inject the shared `PrismaService`.
 *
 * @param prisma - The application's Prisma client instance.
 * @returns A configured Better Auth instance.
 */
export function createAuth(prisma: PrismaClient) {
  // Base URL of the backend (scheme + host + port only — NO path).
  const baseUrl =
    process.env['BETTER_AUTH_URL'] ?? 'http://localhost:5000';

  // Parse the comma-separated TRUSTED_ORIGINS env var into a clean list.
  // Always include the backend's own base URL so same-origin requests pass
  // Better Auth's CSRF check.
  const trustedOrigins = [
    baseUrl,
    ...(process.env['TRUSTED_ORIGINS'] ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];

  // Social login credentials read from the environment. Each provider is
  // only enabled when its credentials are present, so the app still boots in
  // environments where a provider isn't configured (e.g. CI / local tests).
  const googleClientId = process.env['GOOGLE_CLIENT_ID'];
  const googleClientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  const facebookClientId = process.env['FACEBOOK_CLIENT_ID'];
  const facebookClientSecret = process.env['FACEBOOK_CLIENT_SECRET'];

  return betterAuth({
    // Bind Better Auth to the existing Prisma client so auth tables
    // (User, Session, Account, Verification) share the same connection.
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),

    // Base URL of the application (scheme + host + port only).
    baseURL: baseUrl,

    // Better Auth is mounted under the global API prefix at `/api/v1/auth`
    // (see AuthController's `@Controller('auth')` + `app.setGlobalPrefix('api/v1')`).
    // Telling Better Auth its basePath lets it build correct internal URLs.
    basePath: '/api/v1/auth',

    // Email & password based authentication.
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },

    // Advanced session configuration.
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Refresh session once per day
    },

    // Trusted application origins for CSRF protection. Better Auth rejects
    // state-changing requests (sign-in, sign-out, etc.) whose `Origin`
    // header is not in this list, so every client origin must be included.
    trustedOrigins,

    // Social login providers. Each provider is conditionally enabled only
    // when both its client ID and secret are present in the environment,
    // preventing runtime errors when a provider isn't configured.
    socialProviders: {
      ...(googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : {}),
      ...(facebookClientId && facebookClientSecret
        ? {
            facebook: {
              clientId: facebookClientId,
              clientSecret: facebookClientSecret,
            },
          }
        : {}),
    },
  });
}

/**
 * The type of the Better Auth instance produced by `createAuth`.
 * Used to type the `AUTH` injection token across the application.
 */
export type Auth = ReturnType<typeof createAuth>;
