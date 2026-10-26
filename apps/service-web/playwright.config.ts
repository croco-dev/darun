import { defineConfig, devices } from '@playwright/test';

const isolatedSmoke = process.env.ISOLATED_SMOKE === '1';

export default defineConfig({
  globalSetup: isolatedSmoke ? './tests/smoke.global-setup.ts' : undefined,
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    ...(isolatedSmoke
      ? [
          {
            command: 'pnpm --filter graphql-api dev > ../../smoke-artifacts/graphql.log 2>&1',
            url: 'http://127.0.0.1:4000/graphql?query=%7B__typename%7D',
            reuseExistingServer: false,
            timeout: 120000,
          },
        ]
      : []),
    {
      command: isolatedSmoke
        ? 'pnpm --filter service-web dev > ../../smoke-artifacts/web.log 2>&1'
        : 'pnpm --filter service-web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
