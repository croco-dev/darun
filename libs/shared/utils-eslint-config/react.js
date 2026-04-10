import eslintConfigPrettier from 'eslint-config-prettier';
import { importX } from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

import { packageJsonConfig, sourceFilePatterns, typescriptEslintRecommendedConfigs } from './eslint.config.js';

export const reactSourceConfig = {
  files: sourceFilePatterns,
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 2018,
      sourceType: 'module',
    },
  },
  plugins: {
    prettier: prettierPlugin,
    'import-x': importX,
    'react-hooks': reactHooks,
    'unused-imports': unusedImports,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        enableDangerousAutofixThisMayCauseInfiniteLoops: true,
      },
    ],
    'prettier/prettier': [
      'error',
      {
        trailingComma: 'es5',
        singleQuote: true,
        printWidth: 120,
        arrowParens: 'avoid',
        endOfLine: 'auto',
      },
    ],
    'import-x/extensions': ['off'],
    'import-x/no-cycle': ['error'],
    'import-x/no-extraneous-dependencies': ['off'],
    'import-x/no-named-as-default': ['off'],
    'import-x/no-relative-packages': ['off'],
    'import-x/no-self-import': ['error'],
    'import-x/order': [
      'error',
      {
        groups: ['internal', 'external', 'builtin', 'parent', 'sibling'],
        pathGroups: [
          {
            pattern: '@*/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: '@*/**',
            group: 'external',
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: [],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import-x/prefer-default-export': ['off'],
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
  },
  settings: {
    'import-x/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};

const reactConfig = [
  ...typescriptEslintRecommendedConfigs,
  eslintConfigPrettier,
  reactSourceConfig,
  packageJsonConfig,
  {
    ignores: ['**/__generated__/**'],
  },
];

export default reactConfig;
