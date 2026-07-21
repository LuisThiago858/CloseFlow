import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../../src/app/configure-application';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';

interface TableRow {
  table_name: string;
}

interface MigrationRow {
  migration_name: string;
}

describe('Persistência e health da API', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useLogger(false);
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('carrega o módulo e executa uma consulta simples no PostgreSQL', async () => {
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });

  it('mantém a infraestrutura e as tabelas de identidade no schema público', async () => {
    const tables = await prisma.$queryRaw<TableRow[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const migrations = await prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
      ORDER BY migration_name
    `;

    expect(tables.map(({ table_name }) => table_name)).toEqual([
      '_prisma_migrations',
      'sessions',
      'users',
    ]);
    expect(migrations.map(({ migration_name }) => migration_name)).toContain(
      '20260713120000_initialize_persistence',
    );
    expect(migrations.map(({ migration_name }) => migration_name)).toContain(
      '20260717090000_add_identity_and_sessions',
    );
  });

  it.each(['/api/v1/health', '/api/v1/health/ready'])(
    'retorna disponibilidade do banco em %s',
    async (path) => {
      const response = await request(app.getHttpServer()).get(path).expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'closeflow-api',
        checks: { database: 'up' },
      });
      expect(response.body.timestamp).toEqual(expect.any(String));
    },
  );

  it('mantém liveness independente da consulta ao banco', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'closeflow-api',
    });
    expect(response.body).not.toHaveProperty('checks');
  });

  it('publica os contratos de health no OpenAPI', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs/openapi.json')
      .expect(200);

    expect(response.body.paths).toHaveProperty('/api/v1/health');
    expect(response.body.paths).toHaveProperty('/api/v1/health/live');
    expect(response.body.paths).toHaveProperty('/api/v1/health/ready');
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
  });
});

describe('PostgreSQL indisponível', () => {
  it('retorna Problem Details seguro sem credenciais ou stack', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        isAvailable: async () => false,
      })
      .compile();
    const unavailableApp = moduleRef.createNestApplication();
    unavailableApp.useLogger(false);
    configureApplication(unavailableApp);
    await unavailableApp.init();

    const response = await request(unavailableApp.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503)
      .expect('Content-Type', /application\/problem\+json/);
    const serializedBody = JSON.stringify(response.body);

    expect(response.body).toMatchObject({
      title: 'Serviço indisponível',
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
    });
    expect(response.body.correlationId).toEqual(expect.any(String));
    expect(serializedBody).not.toContain('DATABASE_URL');
    expect(serializedBody).not.toContain('postgresql://');
    expect(serializedBody).not.toContain('stack');

    await unavailableApp.close();
  });
});
