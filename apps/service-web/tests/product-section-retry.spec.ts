import { expect, test } from '@playwright/test';

const scenarios = [
  {
    locale: 'ko',
    viewport: { width: 1280, height: 900 },
    section: 'screenshot',
    operation: 'GetPhotosOnProductPhotos',
    heading: '스크린샷',
    loading: '불러오는 중입니다.',
    error: '이 영역을 불러오지 못했습니다.',
    retry: '다시 시도',
    recovered: 'Touch preview 1',
  },
  {
    locale: 'en',
    viewport: { width: 390, height: 844 },
    section: 'features',
    operation: 'ProductWithFeaturesOnProductFeatureList',
    heading: 'Features',
    loading: 'Loading…',
    error: 'Could not load this section.',
    retry: 'Try again',
    recovered: 'Touch feature',
  },
  {
    locale: 'en',
    viewport: { width: 390, height: 844 },
    section: 'company-info',
    operation: 'ProductBySlugOnProductCompany',
    heading: 'Company Information',
    loading: 'Loading…',
    error: 'Could not load this section.',
    retry: 'Try again',
    recovered: 'Fixture Company',
  },
  {
    locale: 'ko',
    viewport: { width: 390, height: 844 },
    section: 'alternatives',
    operation: 'ProductBySlugOnAlternativeProductList',
    heading: '다른 서비스',
    loading: '불러오는 중입니다.',
    error: '이 영역을 불러오지 못했습니다.',
    retry: '다시 시도',
    recovered: 'Fixture Alternative',
  },
] as const;

test.use({ isMobile: false, hasTouch: false });

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.fulfill({ status: 204 });
  });
});

for (const scenario of scenarios) {
  test(`${scenario.locale} ${scenario.section} can retry without replacing the product page`, async ({
    page,
  }, info) => {
    await page.setViewportSize(scenario.viewport);
    const requests = new Map<string, number>();
    const errors: string[] = [];
    const failure = 'Fixture section unavailable';
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().startsWith(`[GraphQL error] ${failure}`)) {
        errors.push(message.text());
      }
    });
    const release = Promise.withResolvers<void>();
    const requestVariables: { slug: string; locale: string }[] = [];
    await page.route('**/graphql', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const { operationName, variables } = route.request().postDataJSON();
      const count = (requests.get(operationName) ?? 0) + 1;
      requests.set(operationName, count);
      if (operationName !== scenario.operation) return route.continue();
      requestVariables.push(variables);
      if (count === 1) await release.promise;
      if (count <= 2) {
        return route.fulfill({
          json: { errors: [{ message: failure }] },
          headers: { 'Access-Control-Allow-Origin': 'http://localhost:16471' },
        });
      }
      const response = await route.fetch();
      const payload = await response.json();
      if (scenario.section === 'company-info') {
        payload.data.productBySlug.ownedCompany = {
          __typename: 'Company',
          id: 'fixture-company',
          name: scenario.recovered,
          type: null,
          address: null,
          startAt: null,
        };
      }
      if (scenario.section === 'alternatives') {
        payload.data.productBySlug.alternatives = [
          {
            __typename: 'Product',
            id: 'fixture-alternative',
            slug: 'fixture-alternative',
            name: scenario.recovered,
            logoUrl: '/images/default-product-icon.svg',
            summary: 'Alternate fixture',
            tags: [],
          },
        ];
      }
      return route.fulfill({ response, json: payload });
    });

    const section = page.locator(`#${scenario.section}`);
    const otherSection =
      scenario.section === 'features'
        ? page.locator('#screenshot').getByRole('img', { name: 'Touch preview 1', exact: true })
        : page.getByText('Touch feature');
    await page.goto(`/${scenario.locale}/products/figma-e2e`, {
      waitUntil: 'domcontentloaded',
    });
    try {
      await expect(page.getByRole('heading', { name: 'Figma E2E', level: 1 })).toBeVisible();
      await expect(page.getByText('Native scrolling with product photos and features.')).toBeVisible();
      await expect(otherSection).toBeVisible();
      await expect(section.getByRole('status')).toHaveText(scenario.loading);
      const toc = page.getByRole('navigation', {
        name: scenario.locale === 'ko' ? '상세 섹션 목차' : 'Section table of contents',
      });
      const sectionLink = toc.getByRole('link', {
        name: scenario.heading,
        exact: true,
      });
      await sectionLink.click();
      await expect(section).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`#${scenario.section}$`));
    } finally {
      release.resolve();
    }

    const alert = section.getByRole('alert');
    const retry = section.getByRole('button', { name: scenario.retry });
    await expect(alert).toHaveText(scenario.error);
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(1);
    const settledRequests = new Map(requests);
    if (process.env['TOUCH_EVIDENCE_DIR']) await page.screenshot({ path: info.outputPath('section-error.png') });
    await retry.focus();
    await retry.press('Enter');
    await expect(alert).toHaveText(scenario.error);
    await expect.poll(() => requests.get(scenario.operation)).toBe(2);
    await expect(section).toBeFocused();
    await retry.click();
    const recovered =
      scenario.section === 'screenshot'
        ? section.getByRole('img', { name: scenario.recovered, exact: true })
        : section.getByText(scenario.recovered);
    await expect(recovered).toBeVisible();
    await expect(alert).toHaveCount(0);
    await expect(otherSection).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#${scenario.section}$`));
    expect(requestVariables).toEqual(
      Array.from({ length: 3 }, () => ({
        slug: 'figma-e2e',
        locale: scenario.locale,
      }))
    );
    settledRequests.set(scenario.operation, 3);
    for (const [operation, count] of settledRequests) {
      expect(requests.get(operation), operation).toBe(count);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('a missing product still shows the route not-found page', async ({ page }) => {
  await page.goto('/en/products/missing-fixture-product');
  await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
  await expect(page.locator('#detail-content')).toHaveCount(0);
});

test('opening a product directly still shows its overview when photo reads fail', async ({ page }) => {
  await page.goto('/ko/products/unavailable-photos');
  await expect(page.getByRole('heading', { name: 'Figma E2E', level: 1 })).toBeVisible();
  await expect(page.getByText('Native scrolling with product photos and features.')).toBeVisible();
  await expect(page.getByText('Touch feature')).toBeVisible();
  await expect(page.locator('#screenshot').getByRole('alert')).toHaveText('이 영역을 불러오지 못했습니다.');
});
