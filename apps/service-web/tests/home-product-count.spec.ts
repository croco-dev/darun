import { expect, test } from '@playwright/test';

const scenarioURL = 'http://127.0.0.1:16470/home-scenario';

test.use({ isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

test.beforeAll(async ({ request }) => {
  // Compile the destination before timing the interaction with the home page.
  const response = await request.get('/ko/search/product?query=%EB%85%B8%EC%85%98');
  expect(response.ok()).toBe(true);
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.fulfill({ status: 204 });
  });
});

for (const [locale, width, headline, keyword, category] of [
  ['ko', 390, '다른 서비스를 발견하세요', '노션', '생산성 도구'],
  ['en', 1280, 'Discover alternative services', 'Notion', 'Productivity tools'],
] as const) {
  test(`${locale} home offers discovery before and after the count request fails`, async ({ page, request }, info) => {
    expect((await request.post(`${scenarioURL}/count-delayed-error`)).status()).toBe(204);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const home = page.getByTestId('home-page');
    const search = page.getByTestId('home-hero').getByRole('link', { name: keyword, exact: true });
    const heading = home.getByRole('heading', { name: headline, level: 1, exact: true });
    const links = [
      [search, `/${locale}/search/product?query=${encodeURIComponent(keyword)}`],
      [home.getByRole('link', { name: category, exact: true }), `/${locale}/categories/productivity`],
      [home.getByRole('link', { name: /Figma E2E/ }), `/${locale}/products/figma-e2e?from=trending`],
      [home.getByRole('link', { name: /Recent Fixture/ }), `/${locale}/products/recent-fixture?from=recent`],
    ] as const;
    const assertDiscovery = async () => {
      await expect(heading).toBeVisible();
      for (const [link, href] of links) {
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', href);
      }
      await expect(search).toBeFocused();
    };

    let releaseStatus: number;
    try {
      await page.goto(`/${locale}`, { waitUntil: 'commit' });
      await expect(heading).toBeVisible();
      await search.focus();
      await assertDiscovery();
    } finally {
      releaseStatus = (await request.post(`${scenarioURL}/release-count`)).status();
    }
    expect(releaseStatus, 'the count request was still pending when the fixture returned its error').toBe(204);

    await page.waitForLoadState('load');
    await page.waitForFunction(() => (window as Window & { __NEXT_HYDRATED?: boolean }).__NEXT_HYDRATED === true);
    await assertDiscovery();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('home-without-count.png') });
    await search.press('Enter');
    await expect(page).toHaveURL(links[0][1]);
  });
}

for (const [scenario, headline] of [
  ['count-positive', 'Discover 42 alternative services'],
  ['count-zero', 'Discover 0 alternative services'],
] as const) {
  test(`the ${scenario} response uses the actual count`, async ({ page, request }) => {
    expect((await request.post(`${scenarioURL}/${scenario}`)).status()).toBe(204);
    await page.goto('/en');
    await expect(page.getByRole('heading', { name: headline, level: 1, exact: true })).toBeVisible();
  });
}

test('a categories query error still reaches the existing home error boundary', async ({ page, request }) => {
  expect((await request.post(`${scenarioURL}/category-error`)).status()).toBe(204);
  await page.goto('/en');
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
