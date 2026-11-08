import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const env = {
  NEXT_PUBLIC_INFRA_ENV: 'local',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'darun-local',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'local-api-key',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_PRIVATE_KEY: '',
  FIREBASE_CLIENT_EMAIL: '',
  GRAPHQL_INTERNAL_URL: 'http://127.0.0.1:16480/graphql',
  NEXT_PUBLIC_GRAPHQL_URL: 'http://127.0.0.1:16480/graphql',
  NEXT_PUBLIC_BASE_URL: 'http://localhost:16481',
  _SENTRY_TUNNEL_DESTINATION_OVERRIDE: 'http://127.0.0.1:16480/monitoring',
  NEXT_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: `--import ${resolve(__dirname, 'tests/helpers/loopback-only.mjs')}`,
};

export default defineConfig({
  testDir: './tests',
  testMatch: 'external-logos.spec.ts',
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  outputDir: process.env.LOGO_EVIDENCE_DIR ?? resolve(tmpdir(), 'darun-608-browser'),
  use: {
    baseURL: 'http://localhost:16481',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm exec tsx --tsconfig ../../tsconfig.json tests/helpers/external-logo-server.ts',
      url: 'http://127.0.0.1:16480/graphql',
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec next dev --port 16481',
      url: 'http://localhost:16481/ko',
      reuseExistingServer: false,
      timeout: 120000,
      env,
    },
    {
      command: 'pnpm --filter admin-web exec next dev --port 16482',
      url: 'http://localhost:16482/auth/login',
      reuseExistingServer: false,
      timeout: 120000,
      env,
    },
  ],
});
