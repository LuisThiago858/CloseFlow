import { createHash, randomUUID } from 'node:crypto';

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

function setCookies(response: SupertestResponse): string[] {
  const candidate: unknown = response.headers['set-cookie'];
  return Array.isArray(candidate)
    ? candidate.filter((value): value is string => typeof value === 'string')
    : [];
}

function readRawToken(response: SupertestResponse): string {
  const cookie = setCookies(response)[0];
  const value = cookie?.split(';')[0]?.split('=')[1];
  if (value === undefined) {
    throw new Error('Cookie de sessão ausente no teste.');
  }
  return value;
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

async function register(
  client: ReturnType<typeof request.agent>,
  email: string,
): Promise<SupertestResponse> {
  return client
    .post('/api/v1/auth/register')
    .set('Origin', allowedOrigin)
    .send({ email, password, passwordConfirmation: password });
}

describe('autenticação e sessões com PostgreSQL real', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
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
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra usuário, cria sessão transacional e não expõe dados sensíveis', async () => {
    const email = uniqueEmail('register');
    const response = await register(request.agent(app.getHttpServer()), email);
    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      user: { email, status: 'ACTIVE', lastLoginAt: null },
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    const cookie = setCookies(response).join(';');
    expect(cookie).toContain('closeflow_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Secure');

    const rawToken = readRawToken(response);
    const persistedUser = await prisma.user.findUniqueOrThrow({
      where: { normalizedEmail: email },
      include: { sessions: true },
    });
    expect(persistedUser.passwordHash).toMatch(/^\$argon2id\$/u);
    expect(persistedUser.passwordHash).not.toBe(password);
    expect(persistedUser.sessions).toHaveLength(1);
    expect(persistedUser.sessions[0]?.tokenHash).toBe(hashToken(rawToken));
    expect(persistedUser.sessions[0]?.tokenHash).not.toBe(rawToken);
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain(rawToken);
  });

  it('impede e-mail normalizado duplicado e resolve registros concorrentes', async () => {
    const email = uniqueEmail('duplicate');
    await register(request.agent(app.getHttpServer()), email.toUpperCase());
    const duplicate = await register(
      request.agent(app.getHttpServer()),
      ` ${email} `,
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });

    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    const concurrentEmail = uniqueEmail('concurrent');
    const responses = await Promise.all([
      register(request.agent(app.getHttpServer()), concurrentEmail),
      register(
        request.agent(app.getHttpServer()),
        concurrentEmail.toUpperCase(),
      ),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.session.count()).toBe(1);
  });

  it('autentica e mantém respostas idênticas para credenciais inválidas', async () => {
    const email = uniqueEmail('login');
    await register(request.agent(app.getHttpServer()), email);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', allowedOrigin)
      .send({ email: email.toUpperCase(), password });
    expect(login.status).toBe(200);
    expect(setCookies(login).join(';')).toContain('HttpOnly');
    expect(login.body.user.lastLoginAt).toEqual(expect.any(String));
    expect(await prisma.session.count()).toBe(2);

    const wrongPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', allowedOrigin)
      .send({ email, password: 'outra senha longa' });
    const missingEmail = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', allowedOrigin)
      .send({ email: uniqueEmail('missing'), password: 'outra senha longa' });
    expect(wrongPassword.status).toBe(401);
    expect(missingEmail.status).toBe(401);
    expect({
      code: wrongPassword.body.code,
      detail: wrongPassword.body.detail,
    }).toEqual({
      code: missingEmail.body.code,
      detail: missingEmail.body.detail,
    });
    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('permite login com senha Unicode aceita no cadastro', async () => {
    const email = uniqueEmail('unicode-password');
    const unicodePassword = '😀'.repeat(65);
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Origin', allowedOrigin)
      .send({
        email,
        password: unicodePassword,
        passwordConfirmation: unicodePassword,
      });
    expect(registration.status).toBe(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', allowedOrigin)
      .send({ email, password: unicodePassword });
    expect(login.status).toBe(200);
  });

  it('protege /me contra cookie ausente, token inválido, expiração e revogação', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await register(agent, uniqueEmail('me'));
    expect((await agent.get('/api/v1/auth/me')).status).toBe(200);

    const absent = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(absent.status).toBe(401);
    expect(absent.body.code).toBe('UNAUTHENTICATED');
    const invalid = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', `closeflow_session=${'z'.repeat(43)}`);
    expect(invalid.status).toBe(401);
    expect(invalid.body.code).toBe('UNAUTHENTICATED');

    const tokenHash = hashToken(readRawToken(registered));
    await prisma.session.update({
      where: { tokenHash },
      data: {
        createdAt: new Date(Date.now() - 7_200_000),
        lastUsedAt: new Date(Date.now() - 7_200_000),
        expiresAt: new Date(Date.now() - 3_600_000),
      },
    });
    const expired = await agent.get('/api/v1/auth/me');
    expect(expired.status).toBe(401);
    expect(expired.body.code).toBe('SESSION_EXPIRED');

    const secondAgent = request.agent(app.getHttpServer());
    const secondRegistration = await register(
      secondAgent,
      uniqueEmail('revoked'),
    );
    await prisma.session.update({
      where: { tokenHash: hashToken(readRawToken(secondRegistration)) },
      data: { revokedAt: new Date(), revocationReason: 'LOGOUT' },
    });
    const revoked = await secondAgent.get('/api/v1/auth/me');
    expect(revoked.status).toBe(401);
    expect(revoked.body.code).toBe('SESSION_REVOKED');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.session.authenticate',
        result: 'failure',
        code: 'SESSION_REVOKED',
        status: 401,
      }),
      'Operação de autenticação recusada.',
    );
  });

  it('renova a validade no banco e no cookie sem trocar o token', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await register(agent, uniqueEmail('renewal'));
    const rawToken = readRawToken(registered);
    const tokenHash = hashToken(rawToken);
    const now = Date.now();
    const previousExpiration = new Date(now + 60 * 60 * 1_000);
    const previousActivity = new Date(now - 60 * 60 * 1_000);

    await prisma.session.update({
      where: { tokenHash },
      data: {
        createdAt: new Date(now - 6 * 24 * 60 * 60 * 1_000),
        lastUsedAt: previousActivity,
        expiresAt: previousExpiration,
      },
    });

    const response = await agent.get('/api/v1/auth/me');
    expect(response.status).toBe(200);
    expect(setCookies(response).join(';')).toContain(
      `closeflow_session=${rawToken}`,
    );

    const renewed = await prisma.session.findUniqueOrThrow({
      where: { tokenHash },
    });
    expect(renewed.lastUsedAt.getTime()).toBeGreaterThan(
      previousActivity.getTime(),
    );
    expect(renewed.expiresAt.getTime()).toBeGreaterThan(
      previousExpiration.getTime(),
    );
  });

  it('recusa usuário desabilitado e revoga a sessão antiga', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await register(agent, uniqueEmail('disabled'));
    const tokenHash = hashToken(readRawToken(registered));
    const session = await prisma.session.findUniqueOrThrow({
      where: { tokenHash },
    });
    await prisma.user.update({
      where: { id: session.userId },
      data: { status: 'DISABLED' },
    });

    const response = await agent.get('/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHENTICATED');
    expect(
      await prisma.session.findUniqueOrThrow({ where: { tokenHash } }),
    ).toMatchObject({ revocationReason: 'USER_DISABLED' });
  });

  it('faz logout repetido e limpa o cookie sem revelar estado da sessão', async () => {
    const agent = request.agent(app.getHttpServer());
    const registered = await register(agent, uniqueEmail('logout'));
    const tokenHash = hashToken(readRawToken(registered));
    const first = await agent
      .post('/api/v1/auth/logout')
      .set('Origin', allowedOrigin);
    const second = await agent
      .post('/api/v1/auth/logout')
      .set('Origin', allowedOrigin);
    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(setCookies(first).join(';')).toContain('closeflow_session=;');
    expect(
      await prisma.session.findUniqueOrThrow({ where: { tokenHash } }),
    ).toMatchObject({ revocationReason: 'LOGOUT' });
  });

  it('lista somente sessões próprias e impede revogação horizontal', async () => {
    const firstAgent = request.agent(app.getHttpServer());
    const secondAgent = request.agent(app.getHttpServer());
    const firstRegistration = await register(firstAgent, uniqueEmail('first'));
    const secondRegistration = await register(
      secondAgent,
      uniqueEmail('second'),
    );
    const firstSession = await prisma.session.findUniqueOrThrow({
      where: { tokenHash: hashToken(readRawToken(firstRegistration)) },
    });
    const secondSession = await prisma.session.findUniqueOrThrow({
      where: { tokenHash: hashToken(readRawToken(secondRegistration)) },
    });

    const list = await firstAgent.get('/api/v1/auth/sessions');
    expect(list.status).toBe(200);
    expect(list.body.sessions).toEqual([
      expect.objectContaining({ id: firstSession.id, current: true }),
    ]);
    expect(JSON.stringify(list.body)).not.toContain(secondSession.id);
    expect(JSON.stringify(list.body)).not.toContain('tokenHash');

    const horizontal = await firstAgent
      .delete(`/api/v1/auth/sessions/${secondSession.id}`)
      .set('Origin', allowedOrigin);
    expect(horizontal.status).toBe(404);
    expect(horizontal.body.code).toBe('SESSION_NOT_FOUND');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.session.revoke',
        result: 'failure',
        code: 'SESSION_NOT_FOUND',
        status: 404,
      }),
      'Operação de autenticação recusada.',
    );
    expect(
      await prisma.session.findUniqueOrThrow({
        where: { id: secondSession.id },
      }),
    ).toMatchObject({ revokedAt: null });

    const own = await firstAgent
      .delete(`/api/v1/auth/sessions/${firstSession.id}`)
      .set('Origin', allowedOrigin);
    expect(own.status).toBe(204);
    expect(setCookies(own).join(';')).toContain('closeflow_session=;');
  });

  it('aplica proteção de origem, JSON estrito e CORS com credenciais', async () => {
    const sensitiveEmail = uniqueEmail('origin');
    const disallowed = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Origin', 'https://attacker.example')
      .send({
        email: sensitiveEmail,
        password,
        passwordConfirmation: password,
      });
    expect(disallowed.status).toBe(403);
    expect(disallowed.body.code).toBe('ORIGIN_NOT_ALLOWED');

    const formEncoded = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', allowedOrigin)
      .type('form')
      .send({ email: uniqueEmail('form'), password });
    expect(formEncoded.status).toBe(422);
    expect(formEncoded.body.code).toBe('VALIDATION_ERROR');

    const invalidBody = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Origin', allowedOrigin)
      .send({
        email: 'invalid-email',
        password,
        passwordConfirmation: password,
      });
    expect(invalidBody.status).toBe(422);
    expect(invalidBody.body.code).toBe('VALIDATION_ERROR');

    const allowed = await register(
      request.agent(app.getHttpServer()),
      uniqueEmail('cors'),
    );
    expect(allowed.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(allowed.headers['access-control-allow-origin']).not.toBe('*');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.register',
        result: 'failure',
        code: 'ORIGIN_NOT_ALLOWED',
        status: 403,
      }),
      'Operação de autenticação recusada.',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login',
        result: 'failure',
        code: 'VALIDATION_ERROR',
        status: 422,
      }),
      'Operação de autenticação recusada.',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.register',
        result: 'failure',
        code: 'VALIDATION_ERROR',
        status: 422,
      }),
      'Operação de autenticação recusada.',
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
      sensitiveEmail,
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(password);
  });

  it('publica os contratos de auth sem passwordHash no OpenAPI', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs/openapi.json')
      .expect(200);
    expect(response.body.paths).toHaveProperty('/api/v1/auth/register');
    expect(response.body.paths).toHaveProperty('/api/v1/auth/login');
    expect(response.body.paths).toHaveProperty('/api/v1/auth/logout');
    expect(response.body.paths).toHaveProperty('/api/v1/auth/me');
    expect(response.body.paths).toHaveProperty('/api/v1/auth/sessions');
    expect(
      JSON.stringify(response.body.components.schemas.PublicUserDto),
    ).not.toContain('passwordHash');
    expect(response.body.components.securitySchemes).toHaveProperty(
      'sessionCookie',
    );
    expect(response.body.components.schemas).toHaveProperty(
      'ProblemDetailsDto',
    );
    expect(
      response.body.paths['/api/v1/auth/login'].post.responses['401'].content[
        'application/problem+json'
      ].schema,
    ).toEqual({ $ref: '#/components/schemas/ProblemDetailsDto' });
  });
});
