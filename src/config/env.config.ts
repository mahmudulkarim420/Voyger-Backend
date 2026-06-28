import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(5001),
  DATABASE_URL: Joi.string().required(),

  // Better Auth
  BETTER_AUTH_SECRET: Joi.string().required(),
  // Base URL of the backend (scheme + host + port only — NO path).
  // Better Auth derives the trusted origin and base URL from this value.
  BETTER_AUTH_URL: Joi.string()
    .uri()
    .default('http://localhost:5000'),
  // Comma-separated list of origins allowed by Better Auth's CSRF check.
  TRUSTED_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Social login — Google
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),

  // Social login — Facebook
  FACEBOOK_CLIENT_ID: Joi.string().optional(),
  FACEBOOK_CLIENT_SECRET: Joi.string().optional(),
});
