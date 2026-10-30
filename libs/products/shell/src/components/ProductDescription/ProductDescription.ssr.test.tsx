// @vitest-environment node

import React from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ProductDescription } from './ProductDescription';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'ko',
}));

it('renders sanitized sections on the server without browser globals', () => {
  expect(typeof document).toBe('undefined');
  const list = '<ul><li>Parent<ol><li>Child</li></ol></li><li>Sibling</li></ul>';
  const html = renderToString(
    <ProductDescription.ViewComponent
      description={`<h2>Recommended\nif</h2>${list}<p>Outside</p><script>alert(1)</script>`}
    />
  );

  expect(html).toContain('border-leaf-200/90');
  expect(html).toContain(list);
  expect(html).toContain('</ul></div></div><div><p>Outside</p>');
  expect(html).not.toContain('<script>');
});
