import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import type { Response as SupertestResponse } from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { configureApplication } from '../../src/app/configure-application';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';

const allowedOrigin = 'http://localhost:5173';
const password = 'uma senha longa e segura';
const logger = {
  error: vi.fn(),
  info: vi.fn(),
  setContext: vi.fn(),
  warn: vi.fn(),
};

function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

async function register(
  app: INestApplication,
  email: string,
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/v1/auth/register')
    .set('Origin', allowedOrigin)
    .send({ email, password, passwordConfirmation: password })
    .expect(201);
  return agent;
}

async function createOrganization(
  agent: ReturnType<typeof request.agent>,
  name: string,
  slug?: string,
): Promise<SupertestResponse> {
  return agent
    .post('/api/v1/organizations')
    .set('Origin', allowedOrigin)
    .send({ name, ...(slug === undefined ? {} : { slug }) });
}

describe('organizações, memberships e tenant context', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PinoLogger)
      .useValue(logger)
      .compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    logger.error.mockClear();
    logger.info.mockClear();
    logger.warn.mockClear();
    await prisma.$transaction([
      prisma.membership.deleteMany(),
      prisma.organization.deleteMany(),
      prisma.session.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria organização ACTIVE e owner atomically e lista somente vínculos ativos', async () => {
    const agent = await register(app, uniqueEmail('owner'));
    const response = await createOrganization(agent, ' Escritório São José ');
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      organization: {
        name: 'Escritório São José',
        slug: 'escritorio-sao-jose',
        status: 'ACTIVE',
      },
      membership: { role: 'OWNER', membershipStatus: 'ACTIVE' },
    });
    const organizationId: string = response.body.organization.id;
    const persisted = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { memberships: true },
    });
    expect(persisted.memberships).toHaveLength(1);
    expect(persisted.memberships[0]).toMatchObject({
      role: 'OWNER',
      status: 'ACTIVE',
    });

    const list = await agent.get('/api/v1/organizations').expect(200);
    expect(list.body.organizations).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain('passwordHash');
  });

  it('resolve 400 para header ausente, 422 para UUID inválido e 404 para divergência', async () => {
    const agent = await register(app, uniqueEmail('context'));
    const created = await createOrganization(agent, 'Contexto seguro');
    const organizationId: string = created.body.organization.id;

    const missing = await agent.get(`/api/v1/organizations/${organizationId}`);
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe('ORGANIZATION_CONTEXT_REQUIRED');

    const invalid = await agent
      .get(`/api/v1/organizations/${organizationId}`)
      .set('X-Organization-Id', 'invalid');
    expect(invalid.status).toBe(422);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');

    const mismatch = await agent
      .get(`/api/v1/organizations/${organizationId}`)
      .set('X-Organization-Id', randomUUID());
    expect(mismatch.status).toBe(404);
    expect(mismatch.body.code).toBe('ORGANIZATION_NOT_FOUND');
  });

  it('isola organizações A e B sem revelar identificadores válidos', async () => {
    const agentA = await register(app, uniqueEmail('tenant-a'));
    const agentB = await register(app, uniqueEmail('tenant-b'));
    const organizationA = await createOrganization(agentA, 'Organização A');
    const organizationB = await createOrganization(agentB, 'Organização B');
    const organizationAId: string = organizationA.body.organization.id;
    const organizationBId: string = organizationB.body.organization.id;

    await agentA
      .get(`/api/v1/organizations/${organizationBId}`)
      .set('X-Organization-Id', organizationBId)
      .expect(404);
    const listA = await agentA.get('/api/v1/organizations').expect(200);
    expect(JSON.stringify(listA.body)).toContain(organizationAId);
    expect(JSON.stringify(listA.body)).not.toContain(organizationBId);
  });

  it('aplica papel no backend, lista dados mínimos e mantém sessão após saída', async () => {
    const ownerEmail = uniqueEmail('owner-role');
    const memberEmail = uniqueEmail('member-role');
    const ownerAgent = await register(app, ownerEmail);
    const memberAgent = await register(app, memberEmail);
    const created = await createOrganization(ownerAgent, 'Papéis');
    const organizationId: string = created.body.organization.id;
    const memberUser = await prisma.user.findUniqueOrThrow({
      where: { normalizedEmail: memberEmail },
    });
    const time = new Date();
    await prisma.membership.create({
      data: {
        organizationId,
        userId: memberUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: time,
        createdAt: time,
        updatedAt: time,
      },
    });

    const members = await memberAgent
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set('X-Organization-Id', organizationId)
      .expect(200);
    expect(members.body.members).toHaveLength(2);
    expect(JSON.stringify(members.body)).toContain(ownerEmail);
    expect(JSON.stringify(members.body)).toContain(memberEmail);
    expect(JSON.stringify(members.body)).not.toContain('normalizedEmail');
    expect(JSON.stringify(members.body)).not.toContain('passwordHash');

    const denied = await memberAgent
      .patch(`/api/v1/organizations/${organizationId}`)
      .set('Origin', allowedOrigin)
      .set('X-Organization-Id', organizationId)
      .send({ name: 'Tentativa indevida' });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('ORGANIZATION_ACCESS_DENIED');

    await memberAgent
      .post(`/api/v1/organizations/${organizationId}/leave`)
      .set('Origin', allowedOrigin)
      .set('X-Organization-Id', organizationId)
      .expect(204);
    expect(
      await prisma.membership.findUniqueOrThrow({
        where: {
          organizationId_userId: { organizationId, userId: memberUser.id },
        },
      }),
    ).toMatchObject({ status: 'INACTIVE' });
    await memberAgent.get('/api/v1/auth/me').expect(200);
  });

  it('remove MEMBER de forma idempotente, preserva histórico e protege owner', async () => {
    const ownerAgent = await register(app, uniqueEmail('offboarding-owner'));
    const memberEmail = uniqueEmail('offboarding-member');
    await register(app, memberEmail);
    const created = await createOrganization(ownerAgent, 'Offboarding');
    const organizationId: string = created.body.organization.id;
    const ownerMembershipId: string = created.body.membership.membershipId;
    const memberUser = await prisma.user.findUniqueOrThrow({
      where: { normalizedEmail: memberEmail },
    });
    const time = new Date(Date.now() - 60_000);
    const member = await prisma.membership.create({
      data: {
        organizationId,
        userId: memberUser.id,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: time,
        createdAt: time,
        updatedAt: time,
      },
    });

    const requestRemoval = () =>
      ownerAgent
        .delete(`/api/v1/organizations/${organizationId}/members/${member.id}`)
        .set('Origin', allowedOrigin)
        .set('X-Organization-Id', organizationId);
    const concurrentResponses = await Promise.all([
      requestRemoval(),
      requestRemoval(),
    ]);
    expect(concurrentResponses.map(({ status }) => status)).toEqual([204, 204]);
    expect(
      concurrentResponses.map(({ body }) => JSON.stringify(body)),
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/constraint|prisma|sql|database/iu),
      ]),
    );
    const inactiveMembership = await prisma.membership.findUniqueOrThrow({
      where: { id: member.id },
    });
    expect(inactiveMembership).toMatchObject({ status: 'INACTIVE' });
    expect(inactiveMembership.updatedAt.getTime()).toBeGreaterThan(
      member.updatedAt.getTime(),
    );
    expect(await prisma.membership.count({ where: { id: member.id } })).toBe(1);

    await requestRemoval().expect(204);
    const afterRepeatedRemoval = await prisma.membership.findUniqueOrThrow({
      where: { id: member.id },
    });
    expect(afterRepeatedRemoval.updatedAt).toEqual(
      inactiveMembership.updatedAt,
    );

    const ownerRemoval = await ownerAgent
      .delete(
        `/api/v1/organizations/${organizationId}/members/${ownerMembershipId}`,
      )
      .set('Origin', allowedOrigin)
      .set('X-Organization-Id', organizationId);
    expect(ownerRemoval.status).toBe(409);
    expect(ownerRemoval.body.code).toBe('LAST_OWNER_REQUIRED');
  });

  it('resolve colisão concorrente de slug com uma única vencedora', async () => {
    const agent = await register(app, uniqueEmail('slug-race'));
    const slug = `race-${randomUUID().slice(0, 8)}`;
    const responses = await Promise.all([
      createOrganization(agent, 'Primeira', slug),
      createOrganization(agent, 'Segunda', slug),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await prisma.organization.count({ where: { slug } })).toBe(1);
  });

  it('usa trigger diferida como última defesa e oculta organizações inativas', async () => {
    const userEmail = uniqueEmail('invariant');
    const agent = await register(app, userEmail);
    const user = await prisma.user.findUniqueOrThrow({
      where: { normalizedEmail: userEmail },
    });
    const time = new Date();
    await expect(
      prisma.organization.create({
        data: {
          name: 'Sem owner',
          slug: `sem-owner-${randomUUID().slice(0, 8)}`,
          status: 'ACTIVE',
          createdAt: time,
          updatedAt: time,
        },
      }),
    ).rejects.toBeDefined();

    const created = await createOrganization(agent, 'Será inativa');
    const organizationId: string = created.body.organization.id;
    await prisma.$transaction([
      prisma.membership.updateMany({
        where: { organizationId },
        data: { status: 'INACTIVE', updatedAt: new Date() },
      }),
      prisma.organization.update({
        where: { id: organizationId },
        data: { status: 'INACTIVE', updatedAt: new Date() },
      }),
    ]);
    await agent
      .get(`/api/v1/organizations/${organizationId}`)
      .set('X-Organization-Id', organizationId)
      .expect(404);
    expect(user.id).toEqual(expect.any(String));
  });

  it('publica contratos de organizações no OpenAPI sem campos internos', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs/openapi.json')
      .expect(200);
    expect(response.body.paths).toHaveProperty('/api/v1/organizations');
    expect(response.body.paths).toHaveProperty(
      '/api/v1/organizations/{organizationId}',
    );
    expect(response.body.paths).toHaveProperty(
      '/api/v1/organizations/{organizationId}/members',
    );
    const serialized = JSON.stringify(
      response.body.components.schemas.PublicMemberDto,
    );
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('normalizedEmail');
  });
});
