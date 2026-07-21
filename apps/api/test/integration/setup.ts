import { resolve } from 'node:path';

import { config as loadEnvironment } from 'dotenv';

loadEnvironment({
  path: resolve(process.cwd(), '../../.env'),
  quiet: true,
});

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (testDatabaseUrl === undefined || testDatabaseUrl.trim().length === 0) {
  throw new Error(
    'DATABASE_URL_TEST é obrigatória para os testes de integração.',
  );
}

process.env.NODE_ENV = 'test';
process.env.API_PORT = '3000';
process.env.CORS_ALLOWED_ORIGINS =
  'http://localhost:5173,http://127.0.0.1:4173';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.AUTH_RATE_LIMIT_MAX = '100';
