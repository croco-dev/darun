import { test, expect } from '@playwright/test';

test.describe('Search Surface Focus & Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ko/search/product?query=figma');
    await page.waitForLoadState('networkidle');
  });

  test('Focus visible ring is applied on search result card on keyboard focus', async ({ page }) => {
    const searchCards = page.locator('[data-testid="search-card"]');

    await expect(searchCards.first()).toBeVisible();

    await searchCards.first().focus();

    const innerCard = searchCards.first().locator('div').first();
    const boxShadow = await innerCard.evaluate(el => window.getComputedStyle(el).boxShadow);
    const outline = await innerCard.evaluate(el => window.getComputedStyle(el).outlineStyle);

    expect(boxShadow !== 'none' || outline !== 'none').toBe(true);
  });

  test('No horizontal overflow on various viewports with results', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await expect(page.locator('[data-testid="search-card"]').first()).toBeVisible();

      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(isOverflowing).toBe(false);
    }
  });
});

test.describe('Search No Results Surface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ko/search/product?query=zzzz-no-product');
    await page.waitForLoadState('networkidle');
  });

  test('Displays no-results view @smoke', async ({ page }) => {
    const noResultsText = page.locator('text=zzzz-no-product');
    await expect(noResultsText).toBeVisible();
  });

  test('Primary CTA button count is at most 1', async ({ page }) => {
    const buttons = await page.locator('button').all();
    let primaryCtaCount = 0;

    for (const btn of buttons) {
      const className = await btn.getAttribute('class');
      if (
        className &&
        (className.includes('bg-brand-500') || className.includes('bg-brand-600') || className.includes('bg-brand-700'))
      ) {
        primaryCtaCount++;
      }
    }

    expect(primaryCtaCount).toBeLessThanOrEqual(1);
  });

  test('Popular queries and categories have focus ring when focused', async ({ page }) => {
    const popularQueryBtn = page.locator('[data-testid="search-empty-popular-queries"] button').first();
    if ((await popularQueryBtn.count()) > 0) {
      await popularQueryBtn.focus();
      const boxShadow = await popularQueryBtn.evaluate(el => window.getComputedStyle(el).boxShadow);
      expect(boxShadow !== 'none').toBe(true);
    }

    const categoryBtn = page.locator('[data-testid="search-empty-categories"] button').first();
    if ((await categoryBtn.count()) > 0) {
      await categoryBtn.focus();
      const boxShadow = await categoryBtn.evaluate(el => window.getComputedStyle(el).boxShadow);
      expect(boxShadow !== 'none').toBe(true);
    }
  });

  test('No horizontal overflow on various viewports when empty', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await expect(page.locator('text=zzzz-no-product')).toBeVisible();

      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(isOverflowing).toBe(false);
    }
  });
});
