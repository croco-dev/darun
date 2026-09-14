import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@darun/provider-auth/client': path.resolve(__dirname, '../../libs/shared/provider-auth/client/src/index.ts'),
      '@darun/provider-auth/server': path.resolve(__dirname, '../../libs/shared/provider-auth/server/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
