import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed: Database disconnected', error);
      return {
        status: 'error',
        database: 'disconnected',
        message:
          'Could not connect to the database. Please check DATABASE_URL.',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
