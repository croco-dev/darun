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
    passWithNoTests: true,
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
    },
  },
});
