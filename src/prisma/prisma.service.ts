import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * NestJS-injectable Prisma client with lifecycle hooks.
 * Connects on module init and disconnects on module destroy to avoid connection leaks.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url || url.trim() === '') {
      throw new Error('DATABASE_URL environment variable is required');
    }
    super();
  }

  /**
   * Connects to the database when the module is initialized.
   * @throws PrismaClientInitializationError if connection fails (e.g. invalid DATABASE_URL)
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Disconnects from the database when the module is destroyed (e.g. app shutdown).
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
