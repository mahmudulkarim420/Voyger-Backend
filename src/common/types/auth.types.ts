import type { User, Session } from 'better-auth';

/**
 * Augment Express's Request with the authenticated user/session objects
 * populated by the `AuthGuard`. This gives type-safety to downstream
 * controllers and the `@CurrentUser()` decorator.
 */
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    session?: Session;
  }
}

export type { User, Session };
