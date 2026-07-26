import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../../src/app/configure-application';
import { PrismaService } from '../../src/shared/database/prisma.service';

describe('rate limiting de autenticação', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    const { AppModule } = await import('../../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    configureApplication(app);
    await app.init();
    const prisma = app.get(PrismaService);
    await prisma.$transaction([
      prisma.membership.deleteMany(),
      prisma.organization.deleteMany(),
      prisma.session.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  afterAll(async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '100';
    await app.close();
  });

  it('retorna Problem Details estável após exceder o limite do endpoint', async () => {
    const responses = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      responses.push(
        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .set('Origin', 'http://localhost:5173')
          .send({
            email: `rate-${randomUUID()}@example.com`,
            password: 'uma senha longa e segura',
            passwordConfirmation: 'uma senha longa e segura',
          }),
      );
    }

    expect(responses.map(({ status }) => status)).toEqual([201, 201, 429]);
    expect(responses[2]?.body).toMatchObject({
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
    });
    expect(responses[2]?.headers['content-type']).toContain(
      'application/problem+json',
    );
  });
});
