import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from '../../src/app/configure-application';
import { AppModule } from '../../src/app.module';

interface OpenApiResponse {
  content?: Record<string, { schema?: { $ref?: string } }>;
}

interface OpenApiOperation {
  parameters?: Array<{
    in?: string;
    name?: string;
    required?: boolean;
  }>;
  responses?: Record<string, OpenApiResponse>;
  security?: Array<Record<string, unknown>>;
}

interface OpenApiDocument {
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  openapi: string;
  paths: Record<string, Record<string, OpenApiOperation>>;
}

const problemDetailsReference = '#/components/schemas/ProblemDetailsDto';

function expectOperationContract(
  document: OpenApiDocument,
  path: string,
  method: string,
  statuses: readonly number[],
  tenantScoped: boolean,
): void {
  const operation = document.paths[path]?.[method];
  expect(operation, `${method.toUpperCase()} ${path}`).toBeDefined();
  expect(operation?.security).toContainEqual({ sessionCookie: [] });
  if (tenantScoped) {
    expect(operation?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'header',
          name: 'X-Organization-Id',
          required: true,
        }),
      ]),
    );
  }

  expect(Object.keys(operation?.responses ?? {}).sort()).toEqual(
    statuses.map(String).sort(),
  );
  for (const status of statuses.filter((value) => value >= 400)) {
    expect(
      operation?.responses?.[String(status)]?.content?.[
        'application/problem+json'
      ]?.schema?.$ref,
    ).toBe(problemDetailsReference);
  }
}

describe('contrato OpenAPI', () => {
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

  it('publica autenticação, organizações e tenant context', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs/openapi.json')
      .expect(200);
    const document = response.body as OpenApiDocument;
    expect(document.openapi).toMatch(/^3\./u);
    expect(document.paths).toHaveProperty('/api/v1/auth/me');
    expect(document.paths).toHaveProperty('/api/v1/organizations');
    expect(document.paths).toHaveProperty(
      '/api/v1/organizations/{organizationId}',
    );
    expect(document.components.schemas).toHaveProperty('ProblemDetailsDto');
    expect(document.components.securitySchemes).toHaveProperty('sessionCookie');

    expectOperationContract(
      document,
      '/api/v1/organizations',
      'post',
      [201, 401, 403, 409, 422],
      false,
    );
    expectOperationContract(
      document,
      '/api/v1/organizations',
      'get',
      [200, 401],
      false,
    );
    expectOperationContract(
      document,
      '/api/v1/organizations/{organizationId}',
      'get',
      [200, 400, 401, 404, 422],
      true,
    );
    expectOperationContract(
      document,
      '/api/v1/organizations/{organizationId}',
      'patch',
      [200, 400, 401, 403, 404, 409, 422],
      true,
    );
    expectOperationContract(
      document,
      '/api/v1/organizations/{organizationId}/members',
      'get',
      [200, 400, 401, 404, 409, 422],
      true,
    );
    expectOperationContract(
      document,
      '/api/v1/organizations/{organizationId}/members/{membershipId}',
      'delete',
      [204, 400, 401, 403, 404, 409, 422],
      true,
    );
    expectOperationContract(
      document,
      '/api/v1/organizations/{organizationId}/leave',
      'post',
      [204, 400, 401, 403, 404, 409, 422],
      true,
    );
  });
});
