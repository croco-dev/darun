import { NextIntlClientProvider } from 'next-intl';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { ProductItem } from '../uis/ProductItem/ProductItem';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => document.body.replaceChildren());

describe('공개 상품 로고', () => {
  it.each([false, true])('외부 로고를 목록 전체의 오류 없이 표시한다 (ranked=%s)', isRanked => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      act(() => {
        root.render(
          <NextIntlClientProvider
            locale="ko"
            messages={{
              ProductDetail: { productItem: { logoAlt: '{name} 로고' } },
            }}
          >
            <ProductItem name="Linear" logoUrl="https://linear.app/logo.png" isRanked={isRanked} />
          </NextIntlClientProvider>
        );
      });
      const image = container.querySelector('img');
      expect(image?.getAttribute('src')).toBe('https://linear.app/logo.png');
      expect(image?.getAttribute('srcset')).toBeNull();
      expect(image?.getAttribute('alt')).toBe('Linear 로고');
      act(() => image?.dispatchEvent(new Event('error', { bubbles: true })));
      expect(container.querySelector('img')?.getAttribute('src')).toBe('/images/default-product-icon.svg');
    } finally {
      act(() => root.unmount());
    }
  });
});
