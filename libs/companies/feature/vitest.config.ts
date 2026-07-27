import { createNodeConfig, thresholds } from '@darun/utils-vitest-config';
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
      coverage: {
        thresholds: thresholds.feature,
      },
    },
  })
);
