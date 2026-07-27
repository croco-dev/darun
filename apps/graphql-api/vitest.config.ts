import { createNodeConfig } from '@darun/utils-vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createNodeConfig({
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    },
    test: {
      passWithNoTests: false,
      include: ['__tests__/**/*.test.ts'],
      exclude: ['**/tests/**', '**/node_modules/**'],
    },
  })
);
