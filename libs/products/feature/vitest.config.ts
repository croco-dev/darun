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
    include: ['src/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.ts*'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
    },
    globals: true,
  },
});
