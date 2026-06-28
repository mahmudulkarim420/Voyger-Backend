/**
 * Injection token for the configured Better Auth instance.
 *
 * Using a Symbol-based token keeps the DI registry clean and avoids name
 * collisions with the `Auth` type. The factory provider in `AuthModule`
 * resolves this token to a `betterAuth(...)` instance.
 */
export const AUTH = Symbol('AUTH');
