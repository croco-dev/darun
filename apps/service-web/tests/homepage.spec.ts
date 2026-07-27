import { test, expect } from '@playwright/test';

test.describe('Homepage smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ko');
    await page.waitForLoadState('networkidle');
  });

  test('Homepage renders ranked product list @smoke', async ({ page }) => {
    const productItems = page.locator('[class*="RankedProductList"], [data-testid="product-item"], h2, h3').first();
    await expect(productItems).toBeVisible({ timeout: 15000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test('Homepage has no horizontal overflow @smoke', async ({ page }) => {
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(isOverflowing).toBe(false);
  });

  test('Search input is accessible from homepage', async ({ page }) => {
    const searchLink = page.locator('a[href*="search"]').first();
    await expect(searchLink).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Search to product-detail click-through', () => {
  test('search result navigates to product detail @smoke', async ({ page }) => {
    await page.goto('/ko/search/product?query=figma');
    await page.waitForLoadState('networkidle');

    const firstCard = page.getByTestId('search-card').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    const href = await firstCard.locator('a').first().getAttribute('href');
    expect(href).toMatch(/\/products\//);

    await firstCard.locator('a').first().click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/products\//, { timeout: 15000 });
  });
});
