import { test, expect } from '@playwright/test';

test.describe('Compare discovery journey', () => {
  test('Journey 1: search result compare buttons activate compare page', async ({ page }) => {
    // Search for figma-e2e and wait for results
    await page.goto('/ko/search/product?query=figma');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('search-card').first()).toBeVisible({ timeout: 15000 });

    // Click CompareButton on figma-e2e — adds figma-e2e to compare list
    const figmaCard = page.getByTestId('search-card').first();
    await figmaCard.getByTestId('compare-button').click();

    // Navigate to sketch-e2e search to find a second product
    await page.goto('/ko/search/product?query=sketch');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('search-card').first()).toBeVisible({ timeout: 15000 });

    // Click CompareButton on sketch-e2e — triggers navigation to compare page
    await page.getByTestId('search-card').first().getByTestId('compare-button').click();

    // Verify navigation to compare page with both columns rendered
    await page.waitForURL(/\/compare\//, { timeout: 15000 });
    await expect(page.getByTestId('compare-column')).toHaveCount(2);
  });

  test('Journey 2: alternatives page compare buttons activate compare page', async ({ page }) => {
    // Navigate to figma-e2e alternatives page
    await page.goto('/ko/products/figma-e2e/alternatives');
    await page.waitForLoadState('networkidle');

    // Wait for alternatives to load (compare buttons visible)
    await expect(page.getByTestId('compare-button').first()).toBeVisible({ timeout: 15000 });

    // Click first CompareButton — adds first alternative
    const compareButtons = page.getByTestId('compare-button');
    await compareButtons.first().click();

    // Click second CompareButton (different product) — triggers navigation
    await compareButtons.nth(1).click();

    // Verify navigation to compare page with both columns
    await page.waitForURL(/\/compare\//, { timeout: 15000 });
    await expect(page.getByTestId('compare-column')).toHaveCount(2);
  });
});
