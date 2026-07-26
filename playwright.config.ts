import { defineConfig, devices } from '@playwright/test';

const testDatabaseUrl =
  process.env.DATABASE_URL_TEST ??
  'postgresql://closeflow_test:change-me-test-only@localhost:5433/closeflow_test?schema=public';
const reuseExistingServers = process.env.PLAYWRIGHT_REUSE_SERVERS === 'true';

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
      command: 'node dist/main.js',
      cwd: './apps/api',
      port: 3100,
      reuseExistingServer: reuseExistingServers,
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
      command: 'node node_modules/vite/bin/vite.js preview',
      cwd: './apps/web',
      port: 4173,
      reuseExistingServer: reuseExistingServers,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        API_PORT: '3100',
      },
    },
  ],
});
