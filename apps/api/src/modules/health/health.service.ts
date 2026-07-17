import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../../shared/database/prisma.service';

export interface LivenessResponse {
  status: 'ok';
  service: 'closeflow-api';
  timestamp: string;
}

export interface HealthResponse extends LivenessResponse {
  checks: {
    database: 'up';
  };
}

@Injectable()
export class HealthService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      service: 'closeflow-api',
      timestamp: new Date().toISOString(),
    };
  }

  public async getReadiness(): Promise<HealthResponse> {
    const databaseAvailable = await this.prisma.isAvailable();

    if (!databaseAvailable) {
      throw new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        detail:
          'O banco de dados necessário para atender a solicitação está indisponível.',
      });
    }

    return {
      ...this.getLiveness(),
      checks: {
        database: 'up',
      },
    };
  }
}
