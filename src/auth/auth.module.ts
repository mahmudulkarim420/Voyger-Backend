import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { createAuth } from './auth.config';
import { AUTH } from './auth.constants';

/**
 * AuthModule wires Better Auth into the NestJS dependency graph.
 *
 * The `AUTH` token is resolved by a factory that builds a Better Auth instance
 * using the shared `PrismaService`, so auth operations reuse the same
 * database connection pool as the rest of the application.
 *
 * `PrismaModule` is `@Global()`, so it does not need to be re-imported here.
 */
@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => createAuth(prisma),
    },
  ],
  exports: [AUTH],
})
export class AuthModule {}
