import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.fulfill({ status: 204 });
    return route.continue();
  });
});

async function swipe(page: Page, region: Locator, axis: 'x' | 'y') {
  await region.scrollIntoViewIfNeeded();
  const bounds = await region.boundingBox();
  expect(bounds).not.toBeNull();
  expect(
    await region.evaluate(element => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })
  ).toBe(true);
  await region.evaluate(element => {
    element.removeAttribute('data-touch-started');
    element.addEventListener('touchstart', () => element.setAttribute('data-touch-started', 'true'), {
      once: true,
      passive: true,
    });
  });
  const session = await page.context().newCDPSession(page);
  const x = Math.round(bounds!.x + bounds!.width / 2);
  const y = Math.round(bounds!.y + bounds!.height / 2);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 0 }],
    });
    await expect(region).toHaveAttribute('data-touch-started', 'true');
    // Send a continuous touch path so the browser applies touch-action to the gesture.
    for (let step = 1; step <= 24; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: x - (axis === 'x' ? step * 7.5 : 0),
            y: y - (axis === 'y' ? step * 7.5 : 0),
            id: 0,
          },
        ],
      });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    }
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
}

async function expectVerticalPan(page: Page, region: Locator) {
  await region.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await swipe(page, region, 'y');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 40);
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`Product overflow permits both touch axes (${reducedMotion})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.emulateMedia({ reducedMotion });
    await page.goto('/ko/products/figma-e2e');
    const photos = page.getByRole('region', { name: '스크린샷', exact: true });
    await expect(photos.getByRole('img')).toHaveCount(3);
    await expect(photos.getByRole('img').first()).toHaveJSProperty('complete', true);
    await expectVerticalPan(page, photos);
    await swipe(page, photos, 'x');
    await expect.poll(() => photos.evaluate(element => element.scrollLeft)).toBeGreaterThan(40);
    await expect(photos).toHaveCSS('scroll-snap-type', 'x mandatory');

    const featurePhotos = page.getByRole('region', {
      name: 'Touch feature screenshots',
    });
    await expectVerticalPan(page, featurePhotos);
    await swipe(page, featurePhotos, 'x');
    await expect.poll(() => featurePhotos.evaluate(element => element.scrollLeft)).toBeGreaterThan(40);

    const tags = page.locator('main h1').locator('..').locator('..').locator('.overflow-x-auto');
    await expectVerticalPan(page, tags);
    const toc = page.getByRole('tablist');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expectVerticalPan(page, toc);
    await toc.getByRole('tab').first().focus();
    await page.keyboard.press('End');
    await expect(toc.getByRole('tab').last()).toBeFocused();

    await photos.focus();
    await expect(photos).toBeFocused();
    await photos.evaluate(element => element.scrollTo({ left: 0, behavior: 'instant' }));
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => photos.evaluate(element => element.scrollLeft)).toBeGreaterThan(10);
    await photos.locator('button[data-rmiz-btn-zoom]').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const query of ['', '?query=no-touch-results']) {
  test(`Search suggestions permit vertical touch scrolling (${query || 'empty query'})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`/ko/search/product${query}`);
    const stripe = page.getByTestId(query ? 'search-empty-popular-queries' : 'popular-queries-stripe');
    await expect(stripe).toBeVisible();
    await expectVerticalPan(page, stripe);
    await stripe.focus();
    await expect(stripe).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
