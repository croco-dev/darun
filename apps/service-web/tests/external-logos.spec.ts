import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const png = readFileSync(resolve(__dirname, '../public/images/favicon-32x32.png'));
const adminDefaultIcon = readFileSync(resolve(__dirname, '../../admin-web/public/images/default-product-icon.svg'));
const externalLogo = 'http://127.0.0.1:16480/logo.png';

test.beforeEach(async ({ page }) => {
  // Synthetic image responses only: no real browser session or external services.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/_next/image') return route.fulfill({ contentType: 'image/png', body: png });
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.fulfill({ status: 204 });
    return route.continue();
  });
});

for (const width of [390, 1280]) {
  test(`외부 로고를 공개 목록·상세·비교에 표시한다 (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    for (const path of ['/ko/ranking', '/ko/products/external-logo', '/ko/compare/external-logo/cloudinary-logo']) {
      await page.goto(path);
      const logos = page.locator(`main img[src="${externalLogo}"]`);
      await expect(logos.first()).toBeVisible();
      await expect
        .poll(() => logos.evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0)))
        .toBe(true);
      const cloudinary = page.locator('main img[src*="_next/image"][src*="res.cloudinary.com"]');
      if (!path.includes('/products/')) {
        await expect(cloudinary.first()).toBeVisible();
        await expect(cloudinary.first()).toHaveAttribute('srcset', /_next\/image/);
      }
      if (path.includes('/compare/')) await expect(logos).toHaveCount(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`${path.split('/')[2]}-${width}.png`),
        fullPage: true,
      });
    }
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}

test('조사 URL 미리보기에서 깨진 로고를 복구한다', async ({ page, context }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.location().url.endsWith('/broken-logo.png')) {
      consoleErrors.push(message.text());
    }
  });
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: 'logo-fixture', aud: 'darun-local', iss: 'https://securetoken.google.com/darun-local', iat: now, exp: now + 3600, auth_time: now, roles: ['admin'] })}.`;
  // Serve the real static asset without requiring a signed-in Firebase SDK in this read fixture.
  await page.route('http://localhost:16482/images/default-product-icon.svg', route =>
    route.fulfill({ contentType: 'image/svg+xml', body: adminDefaultIcon })
  );
  await context.addCookies(
    ['idToken', 'refreshToken'].map(name => ({
      name,
      value: name === 'idToken' ? token : 'fixture-refresh',
      domain: 'localhost',
      path: '/',
    }))
  );
  await page.goto('http://localhost:16482/products/new?researchJobId=logo-job');
  const input = page.locator('[name="review-logo-url"]');
  await input.fill(externalLogo);
  const preview = page.getByRole('img', { name: '조사 로고 미리보기' });
  await expect(preview).toHaveAttribute('src', externalLogo);
  await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.route('**/broken-logo.png', route => route.fulfill({ status: 404 }));
  await input.fill('http://127.0.0.1:16480/broken-logo.png');
  await expect(preview).toHaveAttribute('src', '/images/default-product-icon.svg');
  await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: test.info().outputPath('research-fallback.png'), fullPage: true });
  await input.fill(externalLogo);
  await expect(preview).toHaveAttribute('src', externalLogo);
  await page.screenshot({
    path: test.info().outputPath('research-preview.png'),
    fullPage: true,
  });
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
