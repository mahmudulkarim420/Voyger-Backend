import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Apply Helmet globally for secure HTTP headers (must be before CORS).
  // Override crossOriginResourcePolicy to "cross-origin" so it does NOT
  // conflict with the CORS allowlist — helmet's default "same-origin"
  // blocks cross-origin requests between Vercel (frontend) and Render (backend).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Strict CORS allowlist — NEVER use origin: '*' because it breaks Better Auth
  // (credentials cannot be sent when origin is a wildcard).
  // These two origins are the only trusted frontends:
  //   - local dev:  http://localhost:3000
  //   - production: https://voyger-frontend.vercel.app
  // TRUSTED_ORIGINS (comma-separated) may extend the list to stay in sync with
  // Better Auth's CSRF trustedOrigins, but the two defaults are always allowed.
  const defaultOrigins = [
    'http://localhost:3000',
    'https://voyger-frontend.vercel.app',
  ];

  const corsOrigins = Array.from(
    new Set(
      [
        ...defaultOrigins,
        ...(configService.get<string>('TRUSTED_ORIGINS') ?? '')
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ],
    ),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true, // Mandatory for Better Auth cookies/sessions
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Prefix all APIs
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? 5001;

  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}/api/v1`);
}
bootstrap();
