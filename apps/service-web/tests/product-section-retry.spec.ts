import { expect, test } from '@playwright/test';

const scenarios = [
  {
    locale: 'en',
    viewport: { width: 390, height: 844 },
    section: 'links',
    operation: 'ProductOnProductLinks',
    heading: 'Official links',
    loading: 'Loading…',
    error: 'Could not load this section.',
    retry: 'Try again',
    recovered: 'Fixture website',
  },
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
          json: { data: { productBySlug: null }, errors: [{ message: failure, path: ['productBySlug'] }] },
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
      if (scenario.section === 'links') {
        payload.data.productBySlug.links = [
          {
            __typename: 'Link',
            id: 'fixture-link',
            title: scenario.recovered,
            link: 'https://example.com/',
            displayLink: '',
            iconUrl: '',
          },
        ];
      }
      return route.fulfill({ response, json: payload });
    });

    const isLinks = scenario.section === 'links';
    const section = isLinks
      ? page.getByRole('group', { name: scenario.heading })
      : page.locator(`#${scenario.section}`);
    const otherSection =
      scenario.section === 'features'
        ? page.locator('#screenshot').getByRole('img', { name: 'Touch preview 1', exact: true })
        : page.getByText('Touch feature');
    await page.goto(`/${scenario.locale}/search/product?query=section-retry-fixture`);
    // Navigate through the app so the injected browser response tests the client query after hydration.
    // Direct-entry failures and server HTML are covered separately below.
    const resultLink = page.getByRole('link', { name: /Figma E2E/ });
    // SSR can render the link before Next attaches its client navigation handler.
    await page.waitForFunction(() => (window as Window & { __NEXT_HYDRATED?: boolean }).__NEXT_HYDRATED === true);
    await resultLink.click();
    try {
      await expect(page.getByRole('heading', { name: 'Figma E2E', level: 1 })).toBeVisible();
      await expect(page.getByText('Native scrolling with product photos and features.')).toBeVisible();
      await expect(otherSection).toBeVisible();
      await expect(section.getByRole('status')).toHaveText(scenario.loading);
      const toc = page.getByRole('navigation', {
        name: scenario.locale === 'ko' ? '상세 섹션 목차' : 'Section table of contents',
      });
      await expect(toc).toBeVisible();
      if (!isLinks) {
        await toc.getByRole('link', { name: scenario.heading, exact: true }).click();
        await expect(section).toBeFocused();
        await expect(page).toHaveURL(new RegExp(`#${scenario.section}$`));
      }
    } finally {
      release.resolve();
    }

    const alert = section.getByRole('alert');
    const retry = section.getByRole('button', { name: scenario.retry });
    // Let the notice become actionable before taking screenshots or beginning the next request.
    await expect(retry).toBeEnabled();
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
    if (isLinks) {
      await expect(page).toHaveURL(/\/products\/figma-e2e(?:\?.*)?$/);
    } else {
      await expect(page).toHaveURL(new RegExp(`#${scenario.section}$`));
    }
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

test('company errors in structured data and the company section leave the product readable', async ({ page }) => {
  await page.goto('/en/products/unavailable-company');
  await expect(page.getByRole('heading', { name: 'Figma E2E', level: 1 })).toBeVisible();
  await expect(page.getByText('Native scrolling with product photos and features.')).toBeVisible();
  await expect(page.locator('#company-info').getByRole('alert')).toHaveText('Could not load this section.');
  const structuredData = page.locator('#product-structured-data');
  const data = JSON.parse((await structuredData.textContent()) ?? '{}');
  expect(data.mainEntity['@type']).toBe('SoftwareApplication');
  expect(data).not.toHaveProperty('author');
  expect(data.mainEntity).not.toHaveProperty('author');
});

test('a slow company lookup does not block the product and still supplies the structured data author', async ({
  page,
  request,
}) => {
  await page.goto('/en/products/delayed-company', { waitUntil: 'commit' });
  const company = page.locator('#company-info');
  try {
    await expect(page.getByRole('heading', { name: 'Figma E2E', level: 1 })).toBeVisible();
    await expect(page.getByText('Native scrolling with product photos and features.')).toBeVisible();
    await expect(page.getByText('Touch feature')).toBeVisible();
    await expect(company.getByRole('status')).toHaveText('Loading…');
  } finally {
    expect((await request.post('http://127.0.0.1:16470/release-company')).status()).toBe(204);
  }
  await expect(company.getByText('Delayed Company')).toBeVisible();
  const structuredData = page.locator('#product-structured-data');
  const data = JSON.parse((await structuredData.textContent()) ?? '{}');
  const author = { '@type': 'Organization', name: 'Delayed Company' };
  expect(data.author).toEqual(author);
  expect(data.mainEntity.author).toEqual(author);
});

test('healthy related content remains in the server response', async ({ request }) => {
  const response = await request.get('/en/products/figma-e2e');
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toMatch(/<img[^>]+alt="Touch preview 1"/);
  expect(html).toMatch(/<h3[^>]*>Touch feature<\/h3>/);
});
