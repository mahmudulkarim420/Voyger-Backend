import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Neon DB বা ক্লাউড ডেটাবেসের সিকিউর কানেকশনের জন্য SSL এনাবল করা হয়েছে
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? true : undefined,
      // সেশন রিলিজ করার পর যাতে কানেকশন হ্যাং হয়ে না থাকে
      allowExitOnIdle: true, 
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      // Execute a simple query to ensure the database connection is actually established
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✓ PostgreSQL connected successfully.');
    } catch (error) {
      this.logger.error('Database connection failed. Please check your DATABASE_URL in .env file.', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected gracefully');
  }
}