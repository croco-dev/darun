import { test, expect } from '@playwright/test';

const targetUrls = ['/ko/products/figma-e2e', '/ko/products/figma-e2e/alternatives'];

const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
];

test.describe('Product Detail Surface and Alternatives Overflow Check', () => {
  for (const url of targetUrls) {
    for (const viewport of viewports) {
      test(`Verify no horizontal overflow on ${url} at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(url);
        await page.waitForLoadState('domcontentloaded');

        const overflow = await page.evaluate(() => {
          const docElement = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docElement.scrollWidth, body.scrollWidth);
          const clientWidth = Math.min(docElement.clientWidth, window.innerWidth);
          return scrollWidth > clientWidth;
        });

        expect(overflow).toBe(false);
      });
    }
  }
});
