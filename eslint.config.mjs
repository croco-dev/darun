import boundaries from 'eslint-plugin-boundaries';
import reactCompiler from 'eslint-plugin-react-compiler';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import baseConfig from './libs/shared/utils-eslint-config/eslint.config.js';
import { reactSourceConfig } from './libs/shared/utils-eslint-config/react.js';

const rootPath = fileURLToPath(new URL('.', import.meta.url));

const reactFilePatterns = [
  'libs/admin/**/*.{js,mjs,cjs,jsx,ts,tsx}',
  'libs/shared/provider-auth/client/**/*.{js,mjs,cjs,jsx,ts,tsx}',
  'libs/shared/provider-auth/server/**/*.{js,mjs,cjs,jsx,ts,tsx}',
  'libs/shared/utils-apollo-client/client/**/*.{js,mjs,cjs,jsx,ts,tsx}',
  'libs/shared/utils-apollo-client/server/**/*.{js,mjs,cjs,jsx,ts,tsx}',
];

const config = [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: reactFilePatterns,
    ...reactSourceConfig,
  },
  {
    files: reactFilePatterns,
    ...reactCompiler.configs.recommended,
  },
  {
    ignores: ['libs/shared/provider-graphql/src/index.ts', '**/.next/**', '**/next-env.d.ts'],
  },
  {
    // Bare `gql` tagged templates (e.g. in **/documents.ts, **/explorerDocuments.ts,
    // **/detailDocuments.ts, **/use*.ts(x)) are intentional side-effectful registrations,
    // not unused expressions. Replaces scattered per-file eslint-disable comments.
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    rules: {
      'no-unused-expressions': ['error', { allowTaggedTemplates: true }],
      '@typescript-eslint/no-unused-expressions': ['error', { allowTaggedTemplates: true }],
    },
  },
  {
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': rootPath,
      'import/resolver': {
        typescript: {
          // Expand from the config root; resolver globbing otherwise depends on process.cwd().
          project: globSync(['apps/*/tsconfig.json', 'libs/*/*/tsconfig.json', 'libs/shared/*/*/tsconfig.json'], {
            cwd: rootPath,
          }).map(relative => fileURLToPath(new URL(relative, import.meta.url))),
        },
      },
      'boundaries/elements': [
        { type: 'test', pattern: '**/{__tests__,tests}/**', mode: 'full' },
        {
          type: 'test',
          pattern: '**/*.{test,spec}.{ts,tsx,js,mjs}',
          mode: 'full',
        },
        // These are the existing server entrypoints colocated with browser features.
        {
          type: 'server-feature',
          pattern: 'libs/*/feature/src/*{.resolver,Resolver}.ts',
          mode: 'full',
        },
        {
          type: 'server-feature',
          pattern: 'libs/*/feature/src/server.ts',
          mode: 'full',
        },
        {
          type: 'server-feature',
          pattern: 'libs/*/feature/src/graphs/**',
          mode: 'full',
        },
        { type: 'croco-adapter', pattern: 'libs/shared/*-croco-adapter/**' },
        {
          type: 'shared-wrapper',
          pattern: 'libs/shared/utils-structure-react/**',
        },
        { type: 'domain', pattern: 'libs/*/domain', capture: ['domain'] },
        { type: 'feature', pattern: 'libs/*/feature' },
        { type: 'shell', pattern: 'libs/*/shell' },
        { type: 'service', pattern: 'libs/*/service' },
        { type: 'datasource', pattern: 'libs/*/datasource' },
        { type: 'app', pattern: 'apps/*' },
      ],
    },
    rules: {
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
              disallow: {
                to: {
                  type: 'domain',
                  captured: { domain: '!{{from.domain}}' },
                },
              },
              message: 'domain에서 다른 domain을 직접 참조할 수 없습니다',
            },
            // Existing product readers use the Product domain's repository/ranking contracts.
            {
              from: {
                type: 'domain',
                captured: { domain: ['search', 'recommendation'] },
              },
              allow: {
                to: { type: 'domain', captured: { domain: 'products' } },
              },
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
  },
];

export default config;
