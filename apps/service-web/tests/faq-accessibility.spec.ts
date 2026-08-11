import { test, expect } from '@playwright/test';

test.describe('FAQ Accordion Accessibility & Motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ko');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'faq-test-root';
      container.className = 'p-8 max-w-2xl mx-auto';
      container.innerHTML = `
        <input id="focus-start" type="text" class="border p-2 mb-4 block" />
        <div class="w-full overflow-hidden rounded-xl border border-surface-300 bg-white">
          <button
            type="button"
            id="faq-button-test"
            aria-expanded="false"
            aria-controls="faq-panel-test"
            class="flex w-full cursor-pointer items-center justify-between bg-transparent p-5 text-left transition-colors hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <p class="flex-1 pr-4 text-base font-semibold text-dark-900">자주 묻는 질문인가요?</p>
            <div
              id="faq-arrow-test"
              aria-hidden="true"
              class="text-dark-400 transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none rotate-0"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </button>
          <section
            id="faq-panel-test"
            aria-labelledby="faq-button-test"
            aria-hidden="true"
            class="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none"
            style="max-height: 0px; opacity: 0;"
          >
            <div id="faq-inner-test" class="px-5 pb-5 pt-0 text-dark-700 leading-relaxed">
              <p class="whitespace-pre-wrap">예, 그렇습니다. 긴 답변이더라도 절대 잘리지 않고 원활하게 렌더링됩니다.</p>
            </div>
          </section>
        </div>
      `;
      document.body.appendChild(container);

      const button = document.getElementById('faq-button-test')!;
      const arrow = document.getElementById('faq-arrow-test')!;
      const panel = document.getElementById('faq-panel-test')!;
      const inner = document.getElementById('faq-inner-test')!;

      button.addEventListener('click', () => {
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
        panel.setAttribute('aria-hidden', !isOpen ? 'false' : 'true');

        if (!isOpen) {
          arrow.classList.remove('rotate-0');
          arrow.classList.add('rotate-180');
          panel.style.maxHeight = `${inner.scrollHeight}px`;
          panel.style.opacity = '1';
        } else {
          arrow.classList.remove('rotate-180');
          arrow.classList.add('rotate-0');
          panel.style.maxHeight = '0px';
          panel.style.opacity = '0';
        }
      });
    });
  });

  test('Focus visible ring is applied on keyboard focus', async ({ page }) => {
    await page.focus('#focus-start');
    await page.keyboard.press('Tab');

    const button = page.locator('#faq-button-test');
    await expect(button).toBeFocused();

    const boxShadow = await button.evaluate(el => window.getComputedStyle(el).boxShadow);
    const outline = await button.evaluate(el => window.getComputedStyle(el).outlineStyle);

    expect(boxShadow !== 'none' || outline !== 'none').toBe(true);
  });

  test('Reduced motion disables transitions (duration is 0s)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const arrow = page.locator('#faq-arrow-test');
    const panel = page.locator('#faq-panel-test');

    const arrowTransition = await arrow.evaluate(el => window.getComputedStyle(el).transitionDuration);
    const panelTransition = await panel.evaluate(el => window.getComputedStyle(el).transitionDuration);

    expect(arrowTransition === '0s' || arrowTransition === '0ms').toBe(true);
    expect(panelTransition === '0s' || panelTransition === '0ms').toBe(true);
  });
});
