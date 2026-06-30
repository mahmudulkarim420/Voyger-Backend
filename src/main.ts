import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Apply Helmet globally for secure HTTP headers (must be before CORS)
  app.use(helmet());

  // Enable CORS — allow every origin listed in TRUSTED_ORIGINS (comma-separated).
  // This keeps the CORS allowlist in sync with Better Auth's CSRF trustedOrigins,
  // so the same env var controls both layers. Defaults to localhost for dev.
  const corsOrigins = (
    configService.get<string>('TRUSTED_ORIGINS') ?? 'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true, // কুকি সেট হওয়ার জন্য এটি মাস্ট true হতে হবে!
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
