import { createNodeConfig, defineConfig } from '@darun/utils-vitest-config';

export default defineConfig(
  createNodeConfig({
    test: {
      include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
    },
  })
);
