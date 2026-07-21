import { defineConfig, devices } from '@playwright/test';

const testDatabaseUrl =
  process.env.DATABASE_URL_TEST ??
  'postgresql://closeflow_test:change-me-test-only@localhost:5433/closeflow_test?schema=public';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI === undefined ? 'list' : 'github',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      name: 'API',
      command: 'pnpm --filter @closeflow/api start:prod',
      port: 3100,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        API_PORT: '3100',
        LOG_LEVEL: 'silent',
        DATABASE_URL: testDatabaseUrl,
        DATABASE_URL_TEST: testDatabaseUrl,
        CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:4173',
        AUTH_RATE_LIMIT_MAX: '100',
      },
    },
    {
      name: 'Web',
      command: 'pnpm --filter @closeflow/web preview',
      port: 4173,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        API_PORT: '3100',
      },
    },
  ],
});
