import type { Plugin, UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';

type TestConfig = NonNullable<UserConfig['test']>;
type CoverageConfig = NonNullable<TestConfig['coverage']>;
type CoverageThresholds = NonNullable<CoverageConfig['thresholds']>;

export function createDecoratorMetadataPlugin(typescript: typeof import('typescript')): Plugin {
  return {
    name: 'typescript-decorator-metadata',
    enforce: 'pre',
    transform(source, id) {
      if (
        !id.endsWith('.ts') ||
        !/@(?:Field|Arg|Resolver|Service|Inject|ObjectType|InputType|ArgsType|Mutation|Query)\b/.test(source)
      )
        return;
      return typescript.transpileModule(source, {
        compilerOptions: {
          target: typescript.ScriptTarget.ES2022,
          module: typescript.ModuleKind.ESNext,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
        fileName: id,
      }).outputText;
    },
  };
}

const coverageDefaults: CoverageConfig = {
  provider: 'v8',
  reporter: ['text', 'lcov', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['src/**/__tests__/**', 'src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/index.ts'],
};

// Opt-in targets: only packages explicitly supplying coverage.thresholds enforce these
// when coverage is enabled. Report generation alone is not a threshold gate.
export const thresholds = {
  domain: {
    lines: 85,
    functions: 85,
    branches: 65,
    statements: 85,
  } satisfies CoverageThresholds,
  datasource: {
    lines: 85,
    functions: 85,
    branches: 65,
    statements: 85,
  } satisfies CoverageThresholds,
  feature: {
    lines: 70,
    functions: 70,
    branches: 55,
    statements: 70,
  } satisfies CoverageThresholds,
  shell: {
    lines: 60,
    functions: 60,
    branches: 45,
    statements: 60,
  } satisfies CoverageThresholds,
  ui: {
    lines: 60,
    functions: 60,
    branches: 45,
    statements: 60,
  } satisfies CoverageThresholds,
} as const;

export function createNodeConfig(overrides: UserConfig = {}): UserConfig {
  const { test: testOverrides, ...restOverrides } = overrides;
  return {
    ...restOverrides,
    test: {
      // Keep true so packages without tests yet don't fail the gate.
      passWithNoTests: true,
      environment: 'node',
      include: ['src/__tests__/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
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
      // Keep true so packages without tests yet don't fail the gate.
      passWithNoTests: true,
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      ...testOverrides,
      coverage: {
        ...coverageDefaults,
        ...(testOverrides?.coverage as CoverageConfig | undefined),
      },
    },
  };
}

export { defineConfig };
