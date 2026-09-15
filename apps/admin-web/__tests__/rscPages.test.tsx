import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import NewCompanyPage from '../app/companies/new/page';
import MagazineCreatePage from '../app/magazines/create/page';
import HomePage from '../app/page';
import ProductDetailPage, { generateMetadata } from '../app/products/[slug]/page';
import NewProductPage from '../app/products/new/page';

vi.mock('@darun/utils-apollo-client/server', () => ({
  getClient: vi.fn(() => ({
    query: vi.fn().mockImplementation(({ variables }) => {
      if (variables?.slug === 'test-product') {
        return Promise.resolve({
          data: {
            tempProductBySlug: {
              id: 'p-1',
              name: '테스트 서비스',
              slug: 'test-product',
            },
          },
        });
      }
      return Promise.resolve({ data: { productsCount: 42 } });
    }),
  })),
}));

describe('Admin RSC Pages', () => {
  it('HomePage is an async Server Component rendering Dashboard with server count', async () => {
    const element = await HomePage();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('대시보드');
  });

  it('ProductDetailPage is an async Server Component rendering product detail with backHref and generateMetadata', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'test-product' }),
    });
    expect(meta.title).toBe('테스트 서비스 | 다른 관리자');

    const element = await ProductDetailPage({
      params: Promise.resolve({ slug: 'test-product' }),
    });
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.backHref).toBe('/products');
  });

  it('NewProductPage renders PageShell with backHref=/products without client hooks', () => {
    const element = NewProductPage();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('새로운 서비스');
    expect(element.props.backHref).toBe('/products');
  });

  it('NewCompanyPage renders PageShell with backHref=/companies without client hooks', () => {
    const element = NewCompanyPage();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('새로운 기업 추가');
    expect(element.props.backHref).toBe('/companies');
  });

  it('MagazineCreatePage renders PageShell with backHref=/magazines without client hooks', () => {
    const element = MagazineCreatePage();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('새로운 매거진 발행');
    expect(element.props.backHref).toBe('/magazines');
  });
});
