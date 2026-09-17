import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    testTimeout: 20000,
  },

  resolve: {
    alias: {
      '@darun/utils-apollo-client/client': path.resolve(
        __dirname,
        '../../libs/shared/utils-apollo-client/client/src/index.ts'
      ),
      '@darun/utils-apollo-client/server': path.resolve(
        __dirname,
        '../../libs/shared/utils-apollo-client/server/src/index.ts'
      ),
    },
  },
});
