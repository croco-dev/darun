export default {
  test: {
    passWithNoTests: false,
    environment: 'jsdom',
    exclude: ['**/tests/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 85,
        statements: 85,
        branches: 65,
        functions: 65,
      },
    },
  },
};
