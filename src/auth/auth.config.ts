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
  const baseUrl = process.env['BETTER_AUTH_URL'] ?? 'http://localhost:5000';

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

    // ── OAuth-only ──────────────────────────────────────────────────────
    // Email/password authentication has been removed.
    // Users authenticate exclusively via Google or Facebook OAuth.

    // Inject the custom `requiresDeviceManagement` flag into the user object
    // so Better Auth includes it in every session response to the frontend.
    user: {
      additionalFields: {
        requiresDeviceManagement: {
          type: 'boolean',
          required: false,
          defaultValue: false,
        },
      },
    },

    // Advanced session configuration.
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Refresh session once per day
    },

    // Database lifecycle hooks.
    //
    // `session.create.before` — Soft device-limit enforcement.
    //   When a user already has MAX_SESSIONS active sessions, we do NOT
    //   delete the oldest one. Instead we ALLOW the new session to be
    //   created and atomically flag the user with
    //   `requiresDeviceManagement: true`. The frontend middleware reads
    //   this flag and redirects the user to the /device-limit page where
    //   they can choose which device to keep.
    //
    // `session.delete.after` — Auto-unflag.
    //   After a session is revoked (either by the user on /device-limit
    //   or by expiry cleanup), we recount active sessions. If the user
    //   is back within limits we clear the flag so they can navigate
    //   freely again.
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const MAX_SESSIONS = 2;
            const userId = session.userId as string;

            // Count existing active (non-expired) sessions.
            const activeCount = await prisma.session.count({
              where: {
                userId,
                expiresAt: { gt: new Date() },
              },
            });

            // If the user already has MAX_SESSIONS or more, flag them
            // for device management but DO NOT delete any sessions.
            // The $transaction guarantees the flag update is atomic.
            if (activeCount >= MAX_SESSIONS) {
              await prisma.$transaction([
                prisma.user.update({
                  where: { id: userId },
                  data: { requiresDeviceManagement: true },
                }),
              ]);
            }

            // Return nothing — Better Auth proceeds to create the new session.
          },
        },
        delete: {
          after: async (session) => {
            if (!session) return;
            const MAX_SESSIONS = 2;
            const userId = session.userId as string;

            // Recount remaining active sessions after one was revoked.
            const activeCount = await prisma.session.count({
              where: {
                userId,
                expiresAt: { gt: new Date() },
              },
            });

            // If the user is back within limits, clear the flag.
            if (activeCount <= MAX_SESSIONS) {
              await prisma.$transaction([
                prisma.user.update({
                  where: { id: userId },
                  data: { requiresDeviceManagement: false },
                }),
              ]);
            }
          },
        },
      },
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
              mapProfileToUser: (profile: any) => {
                const email =
                  profile.email || `${profile.id}@facebook-user.local`;
                const emailVerified = !!profile.email;
                const image =
                  profile.picture?.data?.url || profile.picture || null;

                return {
                  name: profile.name || 'Facebook User',
                  email,
                  emailVerified,
                  image,
                };
              },
            },
          }
        : {}),
    },

    accountLinking: {
      enabled: true,
    },
  });
}

/**
 * The type of the Better Auth instance produced by `createAuth`.
 * Used to type the `AUTH` injection token across the application.
 */
export type Auth = ReturnType<typeof createAuth>;
