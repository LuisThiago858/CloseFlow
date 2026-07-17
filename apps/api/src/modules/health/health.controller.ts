import { Controller, Get, Inject } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { HealthResponse, LivenessResponse } from './health.service';
import { HealthService } from './health.service';

const healthyDatabaseExample = {
  status: 'ok',
  service: 'closeflow-api',
  timestamp: '2026-07-13T00:00:00.000Z',
  checks: { database: 'up' },
};

@ApiTags('health')
@Controller('health')
export class HealthController {
  public constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verifica a API e suas dependências obrigatórias' })
  @ApiOkResponse({
    description: 'API e PostgreSQL disponíveis.',
    schema: { example: healthyDatabaseExample },
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL indisponível.',
  })
  public async getHealth(): Promise<HealthResponse> {
    return this.healthService.getReadiness();
  }

  @Get('live')
  @ApiOperation({ summary: 'Verifica se o processo da API está ativo' })
  @ApiOkResponse({
    description: 'Processo da API ativo.',
    schema: {
      example: {
        status: 'ok',
        service: 'closeflow-api',
        timestamp: '2026-07-13T00:00:00.000Z',
      },
    },
  })
  public getLiveness(): LivenessResponse {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Verifica se a API pode atender requisições' })
  @ApiOkResponse({
    description: 'API pronta e PostgreSQL disponível.',
    schema: { example: healthyDatabaseExample },
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL indisponível.',
  })
  public async getReadiness(): Promise<HealthResponse> {
    return this.healthService.getReadiness();
  }
}
