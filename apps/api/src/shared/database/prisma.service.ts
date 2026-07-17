import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PinoLogger } from 'nestjs-pino';

import type { Environment } from '../../config/environment';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly applicationLogger: PinoLogger;

  public constructor(
    @Inject(ConfigService)
    configService: ConfigService<Environment, true>,
    @Inject(PinoLogger) logger: PinoLogger,
  ) {
    const connectionString = configService.get('DATABASE_URL', {
      infer: true,
    });

    super({ adapter: new PrismaPg({ connectionString }) });
    this.applicationLogger = logger;
    this.applicationLogger.setContext(PrismaService.name);
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch {
      this.applicationLogger.warn(
        { action: 'database.connect', result: 'unavailable' },
        'PostgreSQL indisponível durante a inicialização.',
      );
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  public async isAvailable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      this.applicationLogger.warn(
        { action: 'database.health', result: 'unavailable' },
        'Verificação de disponibilidade do PostgreSQL falhou.',
      );
      return false;
    }
  }
}
