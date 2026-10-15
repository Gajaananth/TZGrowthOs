import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['backend/tests/**/*.test.ts'],
    exclude: ['_legacy/**', 'node_modules/**', 'client/**'],
  },
});
