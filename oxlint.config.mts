import { defineConfig } from 'oxlint';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootPath = fileURLToPath(new URL('.', import.meta.url));
const workspaceTsconfigs = globSync(
  ['apps/*/tsconfig.json', 'libs/*/*/tsconfig.json', 'libs/shared/*/*/tsconfig.json'],
  {
    cwd: rootPath,
  }
).map(relative => fileURLToPath(new URL(relative, import.meta.url)));

const reactHooksRules = {
  'react/rules-of-hooks': 'error',
  'react/exhaustive-deps': 'warn',
  'react/static-components': 'error',
  'react/use-memo': 'error',
  'react/preserve-manual-memoization': 'error',
  'react/incompatible-library': 'warn',
  'react/immutability': 'error',
  'react/globals': 'error',
  'react/refs': 'error',
  'react/set-state-in-effect': 'error',
  'react/error-boundaries': 'error',
  'react/purity': 'error',
  'react/set-state-in-render': 'error',
  'react/unsupported-syntax': 'warn',
} as const;

export default defineConfig({
  options: {
    typeAware: true,
    reportUnusedDisableDirectives: 'warn',
  },
  plugins: ['typescript', 'import', 'react'],
  jsPlugins: ['eslint-plugin-boundaries'],
  categories: { correctness: 'off' },
  env: { builtin: true },
  ignorePatterns: [
    '**/__generated__/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.next/**',
    '**/next-env.d.ts',
    'libs/shared/provider-graphql/src/index.ts',
    'apps/tier-web/.open-next/**',
    'apps/tier-web/.wrangler/**',
    'apps/tier-web/cloudflare-env.d.ts',
  ],
  settings: {
    'boundaries/root-path': rootPath,
    // Absolute paths keep classification independent of the directory oxlint runs from.
    'import/resolver': { typescript: { project: workspaceTsconfigs } },
    'boundaries/elements': [
      { type: 'test', pattern: '**/{__tests__,tests}/**', mode: 'full' },
      { type: 'test', pattern: '**/*.{test,spec}.{ts,tsx,js,mjs}', mode: 'full' },
      // These are the existing server entrypoints colocated with browser features.
      { type: 'server-feature', pattern: 'libs/*/feature/src/*{.resolver,Resolver}.ts', mode: 'full' },
      { type: 'server-feature', pattern: 'libs/*/feature/src/server.ts', mode: 'full' },
      { type: 'server-feature', pattern: 'libs/*/feature/src/graphs/**', mode: 'full' },
      { type: 'croco-adapter', pattern: 'libs/shared/*-croco-adapter/**' },
      { type: 'shared-wrapper', pattern: 'libs/shared/utils-structure-react/**' },
      { type: 'domain', pattern: 'libs/*/domain', capture: ['domain'] },
      { type: 'feature', pattern: 'libs/*/feature' },
      { type: 'shell', pattern: 'libs/*/shell' },
      { type: 'service', pattern: 'libs/*/service' },
      { type: 'datasource', pattern: 'libs/*/datasource' },
      { type: 'app', pattern: 'apps/*' },
    ],
  },
  rules: {
    'no-array-constructor': 'error',
    // Bare `gql` tagged templates are intentional side-effectful registrations.
    'no-unused-expressions': ['error', { allowTaggedTemplates: true }],
    // Also covers unused imports, which must fail like unused variables.
    'no-unused-vars': 'error',
    'typescript/ban-ts-comment': 'error',
    'typescript/no-duplicate-enum-values': 'error',
    'typescript/no-explicit-any': 'error',
    'typescript/no-extra-non-null-assertion': 'error',
    'typescript/no-misused-new': 'error',
    'typescript/no-namespace': 'error',
    'typescript/no-non-null-asserted-optional-chain': 'error',
    'typescript/no-require-imports': 'error',
    'typescript/no-this-alias': 'error',
    'typescript/no-unnecessary-type-constraint': 'error',
    'typescript/no-unsafe-declaration-merging': 'error',
    'typescript/no-wrapper-object-types': 'error',
    'typescript/prefer-as-const': 'error',
    'typescript/prefer-namespace-keyword': 'error',
    'typescript/triple-slash-reference': 'error',
    'import/no-cycle': 'error',
    'import/no-self-import': 'error',
    ...reactHooksRules,

    'typescript/await-thenable': 'error',
    'typescript/no-array-delete': 'error',
    'typescript/no-duplicate-type-constituents': 'error',
    'typescript/no-for-in-array': 'error',
    'typescript/no-implied-eval': 'error',
    'typescript/no-meaningless-void-operator': 'error',
    'typescript/no-redundant-type-constituents': 'error',
    'typescript/no-unsafe-unary-minus': 'error',
    'typescript/no-useless-default-assignment': 'error',
    'typescript/require-array-sort-compare': 'error',
    'typescript/restrict-template-expressions': 'error',
    // Existing violations are tracked as warnings until each rule is cleaned up.
    'typescript/no-base-to-string': 'warn',
    'typescript/no-floating-promises': 'warn',
    'typescript/no-misused-spread': 'warn',
    'typescript/unbound-method': 'warn',

    'boundaries/dependencies': [
      'error',
      {
        default: 'allow',
        rules: [
          {
            from: { type: 'feature' },
            disallow: { to: { type: ['service', 'datasource'] } },
            message: '브라우저 feature에서 service/datasource를 직접 참조할 수 없습니다',
          },
          {
            from: { type: ['domain', 'service'] },
            disallow: { to: { type: 'datasource' } },
            message: 'domain/service에서 datasource를 직접 참조할 수 없습니다',
          },
          {
            from: { type: 'domain' },
            disallow: { to: { type: 'domain', captured: { domain: '!{{from.domain}}' } } },
            message: 'domain에서 다른 domain을 직접 참조할 수 없습니다',
          },
          // Existing product readers use the Product domain's repository/ranking contracts.
          {
            from: { type: 'domain', captured: { domain: ['search', 'recommendation'] } },
            allow: { to: { type: 'domain', captured: { domain: 'products' } } },
          },
        ],
      },
    ],
    // Keep the existing warning policy for Croco imports, without warning on React or workspace packages.
    'boundaries/external': [
      'warn',
      {
        default: 'allow',
        rules: [
          { from: '*', disallow: '@croco/*' },
          { from: ['croco-adapter', 'shared-wrapper'], allow: '@croco/*' },
        ],
        message: '@croco/* 직접 import는 @darun wrapper/adapter를 통해서만 허용됩니다',
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
      rules: {
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
      },
    },
    {
      // The shared UI package has never used the React hook rules.
      files: ['libs/shared/ui/**'],
      rules: Object.fromEntries(Object.keys(reactHooksRules).map(rule => [rule, 'off'])),
    },
  ],
});
