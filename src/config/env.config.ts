import { z } from 'zod/v3';

/**
 * Zod schema that strictly defines every environment variable the
 * application expects.
 *
 * `@nestjs/config` runs this schema against the parsed `.env` file at
 * startup (via the `validate` option in `ConfigModule.forRoot`). If any
 * *required* variable is missing or any value fails its rule, Zod throws a
 * `ZodError` which NestJS surfaces as a fatal startup error — the server
 * refuses to boot. This guarantees that no production instance ever runs
 * with an incomplete or malformed configuration.
 *
 * Variable categories:
 *  - Runtime:        NODE_ENV, PORT
 *  - Database:       DATABASE_URL
 *  - Better Auth:    BETTER_AUTH_SECRET, BETTER_AUTH_URL, TRUSTED_ORIGINS
 *  - Social (Google):  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *  - Social (Facebook): FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET
 *
 * Social provider credentials are optional so the app can still boot in
 * environments where a provider isn't configured (e.g. CI / local dev).
 * When a provider's ID is present, its secret is required too — this is
 * enforced with a `superRefine` cross-field check below.
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test', 'provision'])
      .default('development'),

    PORT: z.coerce.number().int().positive().default(5001),

    // --- Database ---------------------------------------------------------
    // Required: the app cannot function without a database connection.
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .url('DATABASE_URL must be a valid connection string'),

    // --- Better Auth ------------------------------------------------------
    // Required: used to sign session cookies. A missing secret is a fatal
    // security error in production.
    BETTER_AUTH_SECRET: z
      .string()
      .min(1, 'BETTER_AUTH_SECRET is required'),

    // Base URL of the backend (scheme + host + port only — NO path).
    BETTER_AUTH_URL: z
      .string()
      .url('BETTER_AUTH_URL must be a valid URL')
      .default('http://localhost:5000'),

    // Comma-separated list of origins allowed by Better Auth's CSRF check.
    TRUSTED_ORIGINS: z.string().default('http://localhost:3000'),

    // --- Social login — Google ------------------------------------------
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // --- Social login — Facebook ----------------------------------------
    FACEBOOK_CLIENT_ID: z.string().optional(),
    FACEBOOK_CLIENT_SECRET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Cross-field validation: if a social provider's client ID is set, its
    // secret must also be set (and vice-versa). This catches half-configured
    // providers at startup instead of at runtime.
    const pairs: Array<[keyof typeof env, keyof typeof env, string]> = [
      ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'Google'],
      ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET', 'Facebook'],
    ];

    for (const [idKey, secretKey, label] of pairs) {
      const id = env[idKey];
      const secret = env[secretKey];

      if ((id && !secret) || (!id && secret)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `When ${String(idKey)} is set, ${String(secretKey)} must also be set (and vice-versa) for ${label} login.`,
          path: [secretKey],
        });
      }
    }
  });

/**
 * The fully-typed, validated environment object.
 * Inject `ConfigService` and call `.get<T>('KEY')`, or use this type directly
 * for type-safe access to the validated config.
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validation function consumed by `@nestjs/config`'s `validate` option.
 *
 * It parses the raw `process.env`-merged config object against `envSchema`.
 * On success it returns the validated (and coerced/ defaulted) config so
 * `ConfigService` serves the normalized values. On failure Zod throws,
 * which crashes the bootstrap process — exactly what we want when a required
 * secret is missing.
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  return envSchema.parse(config);
}
