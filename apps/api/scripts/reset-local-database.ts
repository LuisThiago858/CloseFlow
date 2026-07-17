import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { config as loadEnvironment } from 'dotenv';

import { assertLocalDatabaseResetAllowed } from '../src/config/database-reset-guard';

loadEnvironment({
  path: resolve(process.cwd(), '../../.env'),
  quiet: true,
});

assertLocalDatabaseResetAllowed(process.env.DATABASE_URL, process.env.NODE_ENV);

const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const child = spawn(
  pnpmExecutable,
  ['exec', 'prisma', 'migrate', 'reset', '--force'],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
  },
);

child.once('error', () => {
  console.error('Não foi possível iniciar o reset local do banco.');
  process.exitCode = 1;
});

child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
