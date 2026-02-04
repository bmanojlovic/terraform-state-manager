import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/integration/**/*.spec.ts'],
    testTimeout: 30000,
    env: process.env,
  },
});
