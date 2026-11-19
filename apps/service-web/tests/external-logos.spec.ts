import { expect, test, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const png = readFileSync(resolve(__dirname, '../public/images/favicon-32x32.png'));
const adminDefaultIcon = readFileSync(resolve(__dirname, '../../admin-web/public/images/default-product-icon.svg'));
const externalLogo = 'http://127.0.0.1:16480/logo.png';
const adminOrigin = 'http://localhost:16482';

async function setAdminSession(context: BrowserContext) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: 'logo-fixture', aud: 'darun-local', iss: 'https://securetoken.google.com/darun-local', iat: now, exp: now + 3600, auth_time: now, roles: ['admin'] })}.`;
  await context.addCookies(
    ['idToken', 'refreshToken'].map(name => ({
      name,
      value: name === 'idToken' ? token : 'fixture-refresh',
      domain: 'localhost',
      path: '/',
    }))
  );
}

test.beforeEach(async ({ page }) => {
  // Synthetic image responses only: no real browser session or external services.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    // Serve the real static asset without a signed-in Firebase SDK in the admin read fixtures.
    if (url.origin === adminOrigin && url.pathname === '/images/default-product-icon.svg') {
      return route.fulfill({ contentType: 'image/svg+xml', body: adminDefaultIcon });
    }
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
  await setAdminSession(context);
  await page.goto(`${adminOrigin}/products/new?researchJobId=logo-job`);
  const input = page.locator('[name="review-logo-url"]');
  await input.fill(externalLogo);
  const preview = page.getByRole('img', { name: '조사 로고 미리보기' });
  await expect(preview).toHaveAttribute('src', externalLogo);
  await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.route('**/broken-logo.png', route => route.fulfill({ status: 404 }));
  await input.fill('http://127.0.0.1:16480/broken-logo.png');
  await expect(preview).toHaveAttribute('src', '/images/default-product-icon.svg');
  await expect.poll(() => preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({
    path: test.info().outputPath('research-fallback.png'),
    fullPage: true,
  });
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

for (const width of [390, 1280]) {
  test(`관리자 서비스 목록에서 외부 로고를 표시하고 로고 갱신을 반영한다 (${width})`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await setAdminSession(context);
    const cloudinaryLogo = 'https://res.cloudinary.com/demo/image/upload/logo.png';
    const brokenLogo = 'https://res.cloudinary.com/demo/image/upload/broken-logo.png';
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (
        message.type() === 'error' &&
        new URL(message.location().url || adminOrigin).searchParams.get('url') !== brokenLogo
      ) {
        consoleErrors.push(message.text());
      }
    });

    // Keep the real optimizer for disallowed hosts, and isolate Cloudinary from external I/O.
    await page.route(
      url => url.origin === adminOrigin && url.pathname === '/_next/image',
      route => {
        const source = new URL(route.request().url()).searchParams.get('url');
        if (source === cloudinaryLogo) return route.fulfill({ contentType: 'image/png', body: png });
        if (source === brokenLogo) return route.fulfill({ status: 404 });
        return route.continue();
      }
    );
    const brokenResponse = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === '/_next/image' && url.searchParams.get('url') === brokenLogo;
    });
    await page.goto(`${adminOrigin}/products`);
    const table = page.getByRole('table', { name: '서비스 목록' });
    const logoFor = (name: string) => table.getByRole('row', { name: new RegExp(name) }).getByRole('img');
    const imageLoaded = (image: Element) => (image as HTMLImageElement).naturalWidth;

    const external = logoFor('External Logo');
    await expect(external).toHaveAttribute('src', externalLogo);
    await expect.poll(() => external.evaluate(imageLoaded)).toBeGreaterThan(0);

    const cloudinary = logoFor('Cloudinary Logo');
    await expect(cloudinary).toHaveAttribute('srcset', /\/_next\/image/);
    const optimized = new URL((await cloudinary.getAttribute('src')) ?? '', adminOrigin);
    expect(optimized.pathname).toBe('/_next/image');
    expect(optimized.searchParams.get('url')).toBe(cloudinaryLogo);
    await expect.poll(() => cloudinary.evaluate(imageLoaded)).toBeGreaterThan(0);

    const broken = logoFor('Broken Logo');
    expect((await brokenResponse).status()).toBe(404);
    await expect(broken).toHaveAttribute('src', '/images/default-product-icon.svg');
    await expect.poll(() => broken.evaluate(imageLoaded)).toBeGreaterThan(0);
    await page.screenshot({
      path: test.info().outputPath(`admin-list-fallback-${width}.png`),
    });

    await page.route('http://127.0.0.1:16480/graphql', route =>
      route.continue({
        url: 'http://127.0.0.1:16480/graphql?refreshed-logos=1',
      })
    );
    await page.getByRole('button', { name: '새로고침', exact: true }).click();
    await expect(broken).toHaveAttribute('src', `${externalLogo}?replacement=1`);
    await expect.poll(() => broken.evaluate(imageLoaded)).toBeGreaterThan(0);
    await page.screenshot({
      path: test.info().outputPath(`admin-list-refreshed-${width}.png`),
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
