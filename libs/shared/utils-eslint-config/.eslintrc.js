module.exports = {
  root: true,
  extends: ['plugin:@typescript-eslint/recommended', 'turbo'],
  plugins: ['prettier', 'import'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
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
    'import/extensions': ['off'],
    'import/no-cycle': ['error'],
    'import/no-extraneous-dependencies': ['off'],
    'import/no-named-as-default': ['off'],
    'import/no-relative-packages': ['off'],
    'import/no-self-import': ['error'],
    'import/order': [
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
    'import/prefer-default-export': ['off'],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'no-type-imports',
      },
    ],
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
  },
};
