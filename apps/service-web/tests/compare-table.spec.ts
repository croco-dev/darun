import { expect, test } from '@playwright/test';

test.use({ isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

const productNames = ['Figma E2E', 'Collaboration and Project Planning Workspace for Distributed Product Teams'];

for (const [locale, title, rowNames, retryName] of [
  ['ko', '상세 비교표', ['서비스명', '설명', '회사', '투표 수', '태그'], '추천 수 다시 조회'],
  ['en', 'Detailed comparison', ['Service Name', 'Overview', 'Company', 'Votes', 'Tags'], 'Retry vote count'],
] as const) {
  for (const width of [390, 1280]) {
    test(`${locale} comparison exposes both headers and retains keyboard controls at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.fulfill({ status: 204 });
      });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(`/${locale}/compare/figma-e2e/compare-fixture`);

      const table = page.getByRole('table', { name: new RegExp(title) });
      await expect(table).toBeVisible();
      const columns = table.getByRole('columnheader');
      await expect(columns).toHaveCount(productNames.length);
      for (const [i, name] of productNames.entries()) {
        await expect(columns.nth(i)).toHaveAccessibleName(name);
      }
      await expect(table.getByRole('rowheader')).toHaveText([...rowNames]);
      const columnIds = await columns.evaluateAll(headers => headers.map(header => header.id));

      for (const name of rowNames) {
        const rowHeader = page.getByRole('rowheader', { name, exact: true });
        const rowHeaderId = await rowHeader.getAttribute('id');
        expect(rowHeaderId).toBeTruthy();
        const cells = table.getByRole('row').filter({ has: rowHeader }).getByRole('cell');
        await expect(cells).toHaveCount(2);
        for (const [i, columnId] of columnIds.entries()) {
          expect(columnId).toBeTruthy();
          await expect(cells.nth(i)).toHaveAttribute('headers', `${rowHeaderId} ${columnId}`);
        }
      }

      const productHeader = await columns.first().boundingBox();
      const firstRowHeader = await table.getByRole('rowheader').first().boundingBox();
      expect(productHeader && firstRowHeader).toBeTruthy();
      expect(productHeader!.y + productHeader!.height).toBeLessThanOrEqual(firstRowHeader!.y);

      const summary = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: rowNames[1] }) });
      const summaries = summary.getByRole('cell');
      await expect(summaries.nth(0)).toContainText('Native touch scrolling fixture');
      await expect(summaries.nth(1)).toContainText('Overview of a shared workspace');
      const [first, second] = await Promise.all([summaries.nth(0).boundingBox(), summaries.nth(1).boundingBox()]);
      expect(first && second).toBeTruthy();
      if (width === 390) expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height);
      else expect(second!.x).toBeGreaterThanOrEqual(first!.x + first!.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await table.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(
        await table.evaluate(element => element.clientWidth)
      );
      await page.screenshot({
        path: info.outputPath('comparison.png'),
        fullPage: true,
        style: 'nextjs-portal, .firebase-emulator-warning { visibility: hidden }',
      });

      await page.waitForFunction(() => (window as Window & { __NEXT_HYDRATED?: boolean }).__NEXT_HYDRATED === true);
      const votes = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: rowNames[3] }) });
      const retryCell = votes.getByRole('cell').nth(1);
      const retry = retryCell.getByRole('button', { name: retryName });
      await retry.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(retry).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(retryCell).toContainText('17');
      await expect(retry).toHaveCount(0);

      const link = page.getByRole('link', { name: /Figma E2E/ });
      await link.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/${locale}/products/figma-e2e(?:\\?|$)`));
      expect(errors).toEqual([]);
    });
  }
}
