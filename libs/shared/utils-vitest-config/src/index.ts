import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';

type TestConfig = NonNullable<UserConfig['test']>;
type CoverageConfig = NonNullable<TestConfig['coverage']>;
type CoverageThresholds = NonNullable<CoverageConfig['thresholds']>;

const coverageDefaults: CoverageConfig = {
  provider: 'v8',
  reporter: ['text', 'lcov', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['src/**/__tests__/**', 'src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/index.ts'],
};

export const thresholds = {
  domain: { lines: 85, functions: 85, branches: 65, statements: 85 } satisfies CoverageThresholds,
  datasource: { lines: 85, functions: 85, branches: 65, statements: 85 } satisfies CoverageThresholds,
  feature: { lines: 70, functions: 70, branches: 55, statements: 70 } satisfies CoverageThresholds,
  shell: { lines: 60, functions: 60, branches: 45, statements: 60 } satisfies CoverageThresholds,
  ui: { lines: 60, functions: 60, branches: 45, statements: 60 } satisfies CoverageThresholds,
} as const;

export function createNodeConfig(overrides: UserConfig = {}): UserConfig {
  const { test: testOverrides, ...restOverrides } = overrides;
  return {
    ...restOverrides,
    test: {
      passWithNoTests: true,
      environment: 'node',
      include: ['src/__tests__/**/*.test.ts'],
      ...testOverrides,
      coverage: {
        ...coverageDefaults,
        ...(testOverrides?.coverage as CoverageConfig | undefined),
      },
    },
  };
}

export function createJsdomConfig(overrides: UserConfig = {}): UserConfig {
  const { test: testOverrides, ...restOverrides } = overrides;
  return {
    ...restOverrides,
    test: {
      passWithNoTests: true,
      environment: 'jsdom',
      include: ['src/__tests__/**/*.test.ts', 'src/**/*.test.tsx'],
      ...testOverrides,
      coverage: {
        ...coverageDefaults,
        ...(testOverrides?.coverage as CoverageConfig | undefined),
      },
    },
  };
}

export { defineConfig };
