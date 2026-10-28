import { createDecoratorMetadataPlugin, createNodeConfig } from '@darun/utils-vitest-config';
import ts from 'typescript';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createNodeConfig({
    plugins: [createDecoratorMetadataPlugin(ts)],
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
