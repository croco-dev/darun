import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    include: ['src/__tests__/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
    },
  },
});
