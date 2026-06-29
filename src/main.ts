import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Apply Helmet globally for secure HTTP headers (must be before CORS)
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3000', // আপনার ফ্রন্টএন্ডের ইউআরএল
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

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 5001;

  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}/api/v1`);
}
bootstrap();
