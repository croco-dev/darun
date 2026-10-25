import { test, expect } from '@playwright/test';

test.describe('Compare discovery journey', () => {
  test('Journey 1: search discoveries open a comparison through product details @smoke', async ({ page }) => {
    for (const [query, slug, name] of [
      ['figma', 'figma-e2e', 'Figma E2E'],
      ['sketch', 'sketch-e2e', 'Sketch E2E'],
    ]) {
      await page.goto(`/ko/search/product?query=${query}`);
      await page.waitForLoadState('networkidle');
      const result = page
        .getByRole('group', { name: `‘${query}’ 검색 결과`, exact: true })
        .getByRole('link', { name: new RegExp(name) });
      await expect(result).toBeVisible({ timeout: 15000 });
      await expect(result).toHaveAttribute('href', `/ko/products/${slug}?from=search`);
      await result.click();
      await page.waitForURL(new RegExp(`/products/${slug}`), { timeout: 15000 });
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await page.getByTestId('compare-button').first().click();
      if (slug === 'figma-e2e') {
        await expect(page.getByTestId('compare-button').first()).toHaveAttribute('aria-pressed', 'true');
      }
    }
    await page.waitForURL(/\/compare\/figma-e2e\/sketch-e2e/, { timeout: 15000 });
    const columns = page.getByTestId('compare-column');
    await expect(columns).toHaveCount(2);
    await expect(columns.nth(0)).toContainText('Figma E2E');
    await expect(columns.nth(1)).toContainText('Sketch E2E');
  });

  test('Journey 2: alternatives page compare buttons activate compare page @smoke', async ({ page }) => {
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
