import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from '../app/auth/login/page';
import LogoutPage from '../app/auth/logout/page';
import NewCompanyPage from '../app/companies/new/page';
import CompanyListPage from '../app/companies/page';
import LlmJobsPage from '../app/llm-jobs/page';
import MagazineCreatePage from '../app/magazines/create/page';
import HomePage from '../app/page';
import ProductDetailPage, { generateMetadata } from '../app/products/[slug]/page';
import NewProductPage from '../app/products/new/page';
import ProductListPage from '../app/products/page';

vi.mock('../features/llm-jobs', () => ({
  LlmJobListSection: () => React.createElement('div', { 'data-testid': 'mock-llm-job-list-section' }),
}));

vi.mock('../features/auth/LoginSection', () => ({
  LoginSection: () => React.createElement('div', { 'data-testid': 'mock-login-section' }),
}));

vi.mock('../features/auth/LogoutSection', () => ({
  LogoutSection: () => React.createElement('div', { 'data-testid': 'mock-logout-section' }),
}));

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
    expect(element.props.title).toBe('테스트 서비스 상세');
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

  it('CompanyListPage renders PageShell with title and Suspense boundary', () => {
    const element = CompanyListPage();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('기업(업체) 목록');
  });

  it('ProductListPage renders PageShell with title and Suspense boundary', () => {
    const element = ProductListPage();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('서비스 목록');
  });

  it('LoginPage renders login shell with Suspense boundary without client errors', () => {
    const element = LoginPage();
    expect(React.isValidElement(element)).toBe(true);
  });

  it('LogoutPage renders logout confirmation shell without client errors', () => {
    const element = LogoutPage();
    expect(React.isValidElement(element)).toBe(true);
  });

  it('MagazineCreatePage renders PageShell with backHref=/magazines without client hooks', () => {
    const element = MagazineCreatePage();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('새로운 매거진 발행');
    expect(element.props.backHref).toBe('/magazines');
  });

  it('LlmJobsPage renders PageShell with backHref=/ and title LLM 작업', () => {
    const element = LlmJobsPage();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe('LLM 작업');
    expect(element.props.backHref).toBe('/');
  });
});
