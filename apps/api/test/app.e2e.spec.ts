import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../src/app/configure-application';
import { AppModule } from '../src/app.module';

describe('CloseFlow API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useLogger(false);
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde ao health check versionado', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'closeflow-api',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('publica o contrato OpenAPI', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs/openapi.json')
      .expect(200);

    expect(response.body.info.title).toBe('CloseFlow API');
    expect(response.body.paths).toHaveProperty('/api/v1/health');
  });

  it('normaliza rotas inexistentes como Problem Details', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/inexistente')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toMatchObject({
      title: 'Recurso não encontrado',
      status: 404,
      code: 'HTTP_404',
      instance: '/api/v1/inexistente',
    });
    expect(response.body.correlationId).toEqual(expect.any(String));
  });
});
