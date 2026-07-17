import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/integration/setup.ts'],
    include: ['test/integration/**/*.integration.spec.ts'],
    fileParallelism: false,
    restoreMocks: true,
  },
});
