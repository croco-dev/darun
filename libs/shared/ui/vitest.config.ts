import { defineConfig } from 'vitest/config';
import { createJsdomConfig } from '@darun/utils-vitest-config';

export default defineConfig(
  createJsdomConfig({
    test: {
      setupFiles: ['./vitest.setup.ts'],
    },
  })
);
