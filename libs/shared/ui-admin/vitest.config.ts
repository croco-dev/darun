import { createJsdomConfig } from '@darun/utils-vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createJsdomConfig({
    test: {
      setupFiles: ['./vitest.setup.ts'],
    },
  })
);
