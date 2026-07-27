import { createNodeConfig, thresholds } from '@darun/utils-vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createNodeConfig({
    test: {
      coverage: {
        thresholds: thresholds.datasource,
      },
    },
  })
);
