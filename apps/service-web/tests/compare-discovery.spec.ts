import { test, expect } from '@playwright/test';

test.describe('Compare discovery journey', () => {
  for (const locale of ['ko', 'en']) {
    for (const surface of ['detail', 'alternatives', 'related']) {
      test(`clears unavailable selections from ${surface} and retries storage failure (${locale}) @smoke`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: locale === 'ko' ? 1280 : 390,
          height: 900,
        });
        const pageErrors: string[] = [];
        const consoleErrors: string[] = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.route('**/*', route => {
          const url = new URL(route.request().url());
          if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.fulfill({ status: 204 });
          return route.continue();
        });
        await page.goto(`/${locale}/compare/removed-a/removed-b`);
        await expect(
          page.getByRole('heading', {
            name: locale === 'ko' ? '페이지를 찾을 수 없습니다' : 'Page Not Found',
          })
        ).toBeVisible();
        page.on('console', message => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        await page.evaluate(() => localStorage.setItem('compare-products', JSON.stringify(['removed-a', 'removed-b'])));

        const start = `/${locale}/products/figma-e2e${surface === 'alternatives' ? '/alternatives' : ''}`;
        await page.goto(start);
        const compareButtons =
          surface === 'detail'
            ? page.getByTestId('compare-button')
            : page
                .getByRole('group', {
                  name:
                    surface === 'alternatives'
                      ? locale === 'ko'
                        ? '대체 서비스 비교 목록'
                        : 'Alternative products comparison'
                      : locale === 'ko'
                        ? '비슷한 서비스 목록'
                        : 'Alternative products',
                })
                .getByTestId('compare-button');
        const add = compareButtons.first();
        await expect(add).toHaveAttribute('aria-pressed', 'false');
        await add.focus();
        await add.press('Enter');
        const clear = page.getByRole('button', {
          name: locale === 'ko' ? '비교 선택 모두 해제' : 'Clear comparison selection',
          exact: true,
        });
        await expect(clear).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`${start}$`));
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('compare-products')!))).toEqual([
          'removed-a',
          'removed-b',
        ]);
        await add.press('Tab');
        await page.keyboard.press('Tab');
        await expect(clear).toBeFocused();
        const expectRecoveryVisible = async () => {
          if (surface === 'detail') return;
          const productLink = add.locator('xpath=../../..').getByRole('link').first();
          await expect(productLink).toBeVisible();
          const linkBox = await productLink.boundingBox();
          const clearBox = await clear.boundingBox();
          expect(linkBox && clearBox).toBeTruthy();
          expect(
            linkBox!.x + linkBox!.width <= clearBox!.x ||
              linkBox!.y + linkBox!.height <= clearBox!.y ||
              clearBox!.x + clearBox!.width <= linkBox!.x ||
              clearBox!.y + clearBox!.height <= linkBox!.y
          ).toBe(true);
          const rowBox = await add.locator('xpath=../../..').boundingBox();
          const actionsBox = await clear.locator('xpath=..').boundingBox();
          expect(rowBox && actionsBox).toBeTruthy();
          expect(actionsBox!.y).toBeGreaterThanOrEqual(rowBox!.y);
          expect(actionsBox!.y + actionsBox!.height).toBeLessThanOrEqual(rowBox!.y + rowBox!.height);
          await clear.scrollIntoViewIfNeeded();
          expect(
            await clear.evaluate(button => {
              const box = button.getBoundingClientRect();
              return button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
            })
          ).toBe(true);
        };
        await expectRecoveryVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: test.info().outputPath('selection-limit.png'),
          fullPage: true,
        });

        await page.evaluate(() => {
          const setItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key === 'compare-products' && sessionStorage.getItem('block-compare-write') === '1') {
              throw new DOMException('Storage unavailable', 'QuotaExceededError');
            }
            return setItem.call(this, key, value);
          };
          sessionStorage.setItem('block-compare-write', '1');
        });
        await clear.press('Enter');
        const compareStatus = add.locator('xpath=..').getByRole('status');
        await expect(compareStatus).toContainText(
          locale === 'ko' ? '비교 목록을 저장하지 못했습니다' : 'Could not save your comparison'
        );
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('compare-products')!))).toEqual([
          'removed-a',
          'removed-b',
        ]);
        await expect(clear).toBeFocused();
        await expectRecoveryVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: test.info().outputPath('clear-failed.png'),
          fullPage: true,
        });
        await page.evaluate(() => sessionStorage.removeItem('block-compare-write'));
        if (locale === 'en') await clear.click();
        else await clear.press('Enter');
        await expect(compareStatus).toContainText(
          locale === 'ko' ? '비교 선택을 모두 해제했습니다' : 'Comparison selection cleared'
        );
        await expect(add).toBeFocused();
        expect(await page.evaluate(() => localStorage.getItem('compare-products'))).toBe('[]');
        await expect(page).toHaveURL(new RegExp(`${start}$`));
        await page.reload();
        await expect(add).toHaveAttribute('aria-pressed', 'false');
        expect(await page.evaluate(() => localStorage.getItem('compare-products'))).toBe('[]');
        await add.focus();
        await add.press('Enter');
        await expect(add).toHaveAttribute('aria-pressed', 'true');
        const [firstSlug] = await page.evaluate(() => JSON.parse(localStorage.getItem('compare-products')!));
        expect(surface === 'detail' ? ['figma-e2e'] : ['sketch-e2e', 'adobe-xd-e2e', 'invision-e2e']).toContain(
          firstSlug
        );
        await page.reload();
        await expect(add).toHaveAttribute('aria-pressed', 'true');
        if (surface === 'detail') {
          await page.goto(`/${locale}/products/sketch-e2e`);
          await page.getByTestId('compare-button').first().click();
        } else {
          await compareButtons.nth(1).click();
        }
        await page.waitForURL(new RegExp(`/${locale}/compare/${firstSlug}/`));
        await expect(page.getByTestId('compare-column')).toHaveCount(2);
        const selected = await page.evaluate(() => JSON.parse(localStorage.getItem('compare-products')!));
        expect(selected).toHaveLength(2);
        expect(selected).not.toContain('removed-a');
        expect(selected).not.toContain('removed-b');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: test.info().outputPath('new-comparison.png'),
          fullPage: true,
        });
        expect(pageErrors).toEqual([]);
        expect(consoleErrors).toEqual([]);
      });
    }
  }

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
      await page.waitForURL(new RegExp(`/products/${slug}`), {
        timeout: 15000,
      });
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await page.getByTestId('compare-button').first().click();
      if (slug === 'figma-e2e') {
        await expect(page.getByTestId('compare-button').first()).toHaveAttribute('aria-pressed', 'true');
      }
    }
    await page.waitForURL(/\/compare\/figma-e2e\/sketch-e2e/, {
      timeout: 15000,
    });
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
    await expect(page.getByTestId('compare-button').first()).toBeVisible({
      timeout: 15000,
    });

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
