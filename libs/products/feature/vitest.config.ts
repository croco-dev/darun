import { createDecoratorMetadataPlugin, createJsdomConfig } from '@darun/utils-vitest-config';
import ts from 'typescript';
import { defineConfig } from 'vitest/config';
export default defineConfig(
  createJsdomConfig({
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
      include: ['src/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.ts*'],
      globals: true,
    },
  })
);
