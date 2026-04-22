import eslintConfigPrettier from 'eslint-config-prettier';
import { importX } from 'eslint-plugin-import-x';
import packageJson from 'eslint-plugin-package-json';
import prettierPlugin from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import jsoncParser from 'jsonc-eslint-parser';
import tseslint from 'typescript-eslint';

const banTypesCompatRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'compatibility alias for removed ban-types rule',
      recommended: false,
    },
    schema: [],
  },
  create() {
    return {};
  },
};

export const typescriptEslintPlugin = {
  ...tseslint.plugin,
  rules: {
    ...tseslint.plugin.rules,
    'ban-types': banTypesCompatRule,
  },
};

export const typescriptEslintRecommendedConfigs = tseslint.configs.recommended.map(config => {
  const newConfig = { ...config };

  if (newConfig.plugins?.['@typescript-eslint']) {
    newConfig.plugins = {
      ...newConfig.plugins,
      '@typescript-eslint': typescriptEslintPlugin,
    };
  }

  if (newConfig.rules?.['@typescript-eslint/consistent-type-imports']) {
    newConfig.rules = { ...newConfig.rules };
    newConfig.rules['@typescript-eslint/consistent-type-imports'] = 'off';
  }

  return newConfig;
});

export const sourceFilePatterns = ['**/*.{js,mjs,cjs,jsx,ts,tsx}'];

export const baseSourceConfig = {
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
    'unused-imports': unusedImports,
  },
  rules: {
    'prettier/prettier': [
      'error',
      {
        trailingComma: 'es5',
        singleQuote: true,
        printWidth: 120,
        arrowParens: 'avoid',
        endOfLine: 'lf',
      },
    ],
    'import-x/extensions': ['off'],
    'import-x/no-cycle': ['error'],
    'import-x/no-extraneous-dependencies': ['off'],
    'import-x/no-named-as-default': ['off'],
    'import-x/no-relative-packages': ['off'],
    'import-x/no-self-import': ['error'],
    'import-x/order': 'off',
    'import-x/prefer-default-export': ['off'],
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'off',
    'no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'unused-imports/no-unused-imports': 'error',
  },
  settings: {
    'import-x/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'boundaries/elements': [
      {
        type: 'domain',
        pattern: '**/domain/**/*',
      },
      {
        type: 'feature',
        pattern: '**/feature/**/*',
      },
      {
        type: 'shell',
        pattern: '**/shell/**/*',
      },
      {
        type: 'service',
        pattern: '**/service/**/*',
      },
      {
        type: 'datasource',
        pattern: '**/datasource/**/*',
      },
    ],
  },
};

export const packageJsonConfig = {
  files: ['**/package.json'],
  languageOptions: {
    parser: jsoncParser,
  },
  plugins: {
    'package-json': packageJson,
  },
  rules: {
    'package-json/sort-collections': 'error',
  },
};

const baseConfig = [
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },
  ...typescriptEslintRecommendedConfigs,
  eslintConfigPrettier,
  baseSourceConfig,
  packageJsonConfig,
  {
    ignores: ['**/__generated__/**'],
  },
];

export default baseConfig;
