import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export interface HealthResponse {
  status: 'ok';
  service: 'closeflow-api';
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verifica se o processo da API está ativo' })
  @ApiOkResponse({
    description: 'API ativa.',
    schema: {
      example: {
        status: 'ok',
        service: 'closeflow-api',
        timestamp: '2026-07-13T00:00:00.000Z',
      },
    },
  })
  public getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'closeflow-api',
      timestamp: new Date().toISOString(),
    };
  }
}
