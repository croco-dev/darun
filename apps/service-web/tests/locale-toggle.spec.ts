import { test, expect } from '@playwright/test';

for (const width of [1280, 390]) {
  test(`preserves search state through locale changes and browser history (${width}px) @smoke`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.fulfill({ status: 204 });
      return route.continue();
    });

    await page.goto('/ko/search/product?query=figma');
    const search = page.getByRole('search').getByRole('textbox');
    const english = page.getByRole('radio', { name: 'English', exact: true });
    const korean = page.getByRole('radio', { name: '한국어', exact: true });
    const result = page.getByRole('link', { name: /Figma E2E/ });
    await expect(result).toHaveAttribute('href', '/ko/products/figma-e2e?from=search');
    await english.click();
    await expect(page).toHaveURL('/en/search/product?query=figma');
    await expect(english).toHaveAttribute('aria-checked', 'true');
    await expect(search).toHaveValue('figma');
    await expect(result).toHaveAttribute('href', '/en/products/figma-e2e?from=search');
    await korean.focus();
    await korean.press('Enter');
    await expect(page).toHaveURL('/ko/search/product?query=figma');
    await expect(search).toHaveValue('figma');
    await expect(result).toHaveAttribute('href', '/ko/products/figma-e2e?from=search');

    const suffix = '?query=%ED%95%9C%EA%B8%80%20%26%20notes&tag=ui&tag=ux&empty=#results';
    await page.goto(`/ko/search/product${suffix}`);
    await expect(search).toHaveValue('한글 & notes');
    await korean.focus();
    await korean.press('ArrowRight');
    await expect(page).toHaveURL(`/en/search/product${suffix}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(english).toHaveAttribute('aria-checked', 'true');
    await expect(search).toHaveValue('한글 & notes');
    await expect(page.getByRole('heading', { name: /한글 & notes/ })).toBeVisible();
    await expect(page.getByText('No results found for ‘한글 & notes’.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => new URLSearchParams(location.search).getAll('tag'))).toEqual(['ui', 'ux']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({
      path: test.info().outputPath('english-search.png'),
      fullPage: true,
    });

    await page.goBack();
    await expect(page).toHaveURL('/ko/search/product?query=figma');
    await expect(korean).toHaveAttribute('aria-checked', 'true');
    await expect(search).toHaveValue('figma');
    await expect(result).toHaveAttribute('href', '/ko/products/figma-e2e?from=search');
    await page.goForward();
    await expect(page).toHaveURL(`/en/search/product${suffix}`);
    await expect(english).toHaveAttribute('aria-checked', 'true');
    await expect(search).toHaveValue('한글 & notes');
    await korean.focus();
    await korean.press('Enter');
    await expect(page).toHaveURL(`/ko/search/product${suffix}`);
    await expect(korean).toHaveAttribute('aria-checked', 'true');
    await expect(search).toHaveValue('한글 & notes');
    await expect(page.getByText('‘한글 & notes’에 대한 검색 결과가 없습니다.', { exact: true })).toBeVisible();

    await page.goto('/ko/products/figma-e2e?from=search#detail-content');
    await expect(page.getByRole('heading', { name: 'Figma E2E', exact: true })).toBeVisible();
    await english.focus();
    await english.press('Enter');
    await expect(page).toHaveURL('/en/products/figma-e2e?from=search#detail-content');
    await expect(english).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#detail-content')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
