import { defineConfig } from '@playwright/test';
import touchConfig from './playwright.touch.config';

export default defineConfig({
  ...touchConfig,
  testMatch: 'home-product-count.spec.ts',
  outputDir: process.env.HOME_EVIDENCE_DIR ?? './test-results/home-product-count',
});
