import { expect, test } from '@playwright/test';

test('browser errors reach the isolated Sentry tunnel @smoke', async ({ page }) => {
  test.skip(process.env.ISOLATED_SMOKE !== '1', 'Requires the disposable smoke telemetry receiver');
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.fulfill({ status: 204 });
    return route.continue();
  });

  await page.goto('/ko/products/figma-e2e');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Figma E2E', exact: true })).toBeVisible();
  const marker = 'isolated-smoke-sentry-error';
  const delivered = page.waitForResponse(response => {
    const request = response.request();
    return (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/monitoring' &&
      Boolean(request.postData()?.includes(marker))
    );
  });
  await page.evaluate(message => {
    setTimeout(() => {
      throw new Error(message);
    }, 0);
  }, marker);

  expect((await delivered).status()).toBe(200);
  expect(pageErrors).toEqual([marker]);
  expect(consoleErrors).toEqual([]);
});
