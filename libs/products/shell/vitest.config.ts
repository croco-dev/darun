import { createJsdomConfig, thresholds } from '@darun/utils-vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createJsdomConfig({
    test: {
      coverage: {
        thresholds: thresholds.shell,
      },
    },
  })
);
