import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('delega o health agregado ao serviço', async () => {
    const getReadiness = vi.fn().mockResolvedValue({
      status: 'ok',
      service: 'closeflow-api',
      timestamp: '2026-07-13T00:00:00.000Z',
      checks: { database: 'up' },
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getLiveness: vi.fn(),
            getReadiness,
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);

    await expect(controller.getHealth()).resolves.toMatchObject({
      status: 'ok',
      checks: { database: 'up' },
    });
    expect(getReadiness).toHaveBeenCalledOnce();
  });

  it('mantém liveness independente do banco', async () => {
    const getLiveness = vi.fn().mockReturnValue({
      status: 'ok',
      service: 'closeflow-api',
      timestamp: '2026-07-13T00:00:00.000Z',
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getLiveness,
            getReadiness: vi.fn(),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);

    expect(controller.getLiveness()).toMatchObject({ status: 'ok' });
    expect(getLiveness).toHaveBeenCalledOnce();
  });
});
