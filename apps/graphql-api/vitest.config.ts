import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    environment: 'jsdom',
    exclude: ['**/tests/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
    },
  },
});
