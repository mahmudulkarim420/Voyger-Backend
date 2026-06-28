import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UsersController } from './users.controller';

/**
 * UsersModule groups all user-facing routes.
 *
 * `AuthModule` is imported because `AuthGuard` (applied at the controller
 * level in `UsersController`) injects the `AUTH` token that `AuthModule`
 * provides and exports. Without this import the guard's dependency could
 * not be resolved by the NestJS DI container.
 *
 * `PrismaModule` is `@Global()`, so it is already available without import.
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
})
export class UsersModule {}
