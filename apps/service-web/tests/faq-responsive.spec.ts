import { expect, test, type Locator } from '@playwright/test';

async function expectFullAnswer(panel: Locator) {
  await expect
    .poll(() =>
      panel.evaluate(element => {
        const text = element.querySelector('p')!;
        const range = document.createRange();
        range.selectNodeContents(text);
        const panelBounds = element.getBoundingClientRect();
        const textBounds = range.getBoundingClientRect();
        return textBounds.top >= panelBounds.top && textBounds.bottom <= panelBounds.bottom + 1;
      })
    )
    .toBe(true);
}

for (const locale of ['ko', 'en']) {
  test(`Open FAQ follows viewport and text size changes (${locale}) @smoke`, async ({ page }) => {
    await page.route('**/*', route => {
      const host = new URL(route.request().url()).hostname;
      return host === 'localhost' || host === '127.0.0.1' ? route.continue() : route.fulfill({ status: 204 });
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/${locale}/products/figma-e2e/alternatives`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const button = page.locator('#faq button').first();
    const panel = page.locator('#faq section[aria-labelledby]').first();
    await expect(button).toHaveAttribute('id', /^faq-button-/);
    await expect(panel).toHaveAttribute('id', /^faq-panel-/);
    expect(await button.getAttribute('aria-controls')).toBe(await panel.getAttribute('id'));
    expect(await panel.getAttribute('aria-labelledby')).toBe(await button.getAttribute('id'));
    await expect(panel).toHaveAttribute('aria-hidden', 'true');
    await expect(panel).toHaveAttribute('inert', '');

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toHaveAttribute('aria-hidden', 'false');
    await expect(panel).not.toHaveAttribute('inert');
    await expectFullAnswer(panel);
    const wideHeight = await panel.evaluate(element => element.getBoundingClientRect().height);

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 844, height: 390 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await expectFullAnswer(panel);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }

    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await expectFullAnswer(panel);
    expect(await panel.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(wideHeight);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(panel).toHaveCSS('transition-property', 'none');
    for (let count = 0; count < 2; count++) {
      await button.focus();
      await page.keyboard.press('Space');
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toHaveAttribute('aria-hidden', 'true');
      await expect(panel).toHaveAttribute('inert', '');
      await expect.poll(() => panel.evaluate(element => element.getBoundingClientRect().height)).toBe(0);
      await page.keyboard.press('Enter');
      await expectFullAnswer(panel);
      await expect(button).toBeFocused();
    }
  });
}
