import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { validateEnv } from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Validate the parsed .env against the Zod schema at startup. If any
      // required secret is missing or malformed, Zod throws and the server
      // fails to boot — preventing production from running with bad config.
      validate: validateEnv,
    }),
    // Rate limiting: 100 requests per minute per IP (Throttler v6+ syntax)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guard: protects all API endpoints with rate limiting by default
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
