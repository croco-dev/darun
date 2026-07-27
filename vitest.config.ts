export default {
  test: {
    passWithNoTests: false,
    environment: 'jsdom',
    exclude: ['**/tests/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
    },
  },
};
