import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/integration/setup.ts'],
    include: ['test/openapi/**/*.openapi.spec.ts'],
    fileParallelism: false,
    restoreMocks: true,
  },
});
