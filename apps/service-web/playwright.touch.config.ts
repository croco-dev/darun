import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: './tests',
  testMatch: ['native-touch-scroll.spec.ts', 'product-section-retry.spec.ts'],
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: [['list']],
  outputDir: process.env.TOUCH_EVIDENCE_DIR ?? './test-results/native-touch',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:16471',
    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm exec tsx tests/helpers/native-touch-server.ts',
      url: 'http://127.0.0.1:16470/graphql',
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec next dev --port 16471',
      url: 'http://localhost:16471/ko/products/figma-e2e',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_INFRA_ENV: 'local',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'darun-local',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
        NEXT_PUBLIC_FIREBASE_API_KEY: 'local-api-key',
        FIREBASE_PRIVATE_KEY: '',
        FIREBASE_CLIENT_EMAIL: '',
        GRAPHQL_INTERNAL_URL: 'http://127.0.0.1:16470/graphql',
        NEXT_PUBLIC_GRAPHQL_URL: 'http://127.0.0.1:16470/graphql',
        NEXT_PUBLIC_BASE_URL: 'http://localhost:16471',
        _SENTRY_TUNNEL_DESTINATION_OVERRIDE: 'http://127.0.0.1:16470/monitoring',
        NEXT_TELEMETRY_DISABLED: '1',
        NODE_OPTIONS: `--import ${resolve(__dirname, 'tests/helpers/loopback-only.mjs')}`,
      },
    },
  ],
});
