import { resolve } from 'node:path';

import { config as loadEnvironment } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnvironment({
  path: resolve(process.cwd(), '../../.env'),
  quiet: true,
});

const useTestDatabase = process.env.PRISMA_USE_TEST_DATABASE === 'true';
const databaseVariable = useTestDatabase ? 'DATABASE_URL_TEST' : 'DATABASE_URL';
const databaseUrl = process.env[databaseVariable];

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  throw new Error(
    `Configuração de banco ausente: defina ${databaseVariable} antes de executar o Prisma.`,
  );
}

let protocol: string;

try {
  protocol = new URL(databaseUrl).protocol;
} catch {
  throw new Error(
    `Configuração de banco inválida: ${databaseVariable} deve ser uma URL PostgreSQL.`,
  );
}

if (!['postgres:', 'postgresql:'].includes(protocol)) {
  throw new Error(
    `Configuração de banco inválida: ${databaseVariable} deve usar o protocolo PostgreSQL.`,
  );
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
