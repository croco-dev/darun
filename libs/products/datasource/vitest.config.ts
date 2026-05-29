import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
    env: {
      VOTE_IP_SALT: 'test-salt',
    },
    coverage: {
      provider: 'v8',
    },
  },
});
