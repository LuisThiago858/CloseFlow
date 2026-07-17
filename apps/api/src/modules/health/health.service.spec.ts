import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../shared/database/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const isAvailable = vi.fn<() => Promise<boolean>>();
  let service: HealthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: { isAvailable },
        },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  it('retorna readiness quando o PostgreSQL responde', async () => {
    isAvailable.mockResolvedValueOnce(true);

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('retorna erro tipado sem detalhes da conexão', async () => {
    isAvailable.mockResolvedValueOnce(false);

    await expect(service.getReadiness()).rejects.toMatchObject({
      constructor: ServiceUnavailableException,
      response: {
        code: 'DATABASE_UNAVAILABLE',
      },
    });
  });
});
