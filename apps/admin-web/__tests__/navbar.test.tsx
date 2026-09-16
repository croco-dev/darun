// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isNavItemActive, Navbar, navItems } from '../layouts/Navbar/Navbar';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@darun/utils-router', () => ({
  Link: ({ children, href, 'aria-current': ariaCurrent, className }: React.ComponentProps<'a'>) => (
    <a href={href} aria-current={ariaCurrent} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@darun/ui-admin', () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock('../features/auth/LogoutButton', () => ({
  LogoutButton: () => <button type="button">로그아웃</button>,
}));

describe('isNavItemActive', () => {
  it('pathname이 null이거나 undefined일 때 안전하게 false를 반환한다', () => {
    expect(isNavItemActive(null, '/')).toBe(false);
    expect(isNavItemActive(null, '/products')).toBe(false);
    expect(isNavItemActive(undefined, '/products')).toBe(false);
  });

  it('대시보드(/)는 pathname이 정확히 /일 때만 활성화된다', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
    expect(isNavItemActive('/products', '/')).toBe(false);
    expect(isNavItemActive('/companies', '/')).toBe(false);
  });

  it('동일 경로이거나 하위 경로일 때 활성화된다', () => {
    expect(isNavItemActive('/products', '/products')).toBe(true);
    expect(isNavItemActive('/products/new', '/products')).toBe(true);
    expect(isNavItemActive('/products/some-slug/features/new', '/products')).toBe(true);
    expect(isNavItemActive('/settings/llm', '/settings/llm')).toBe(true);
  });

  it('슬래시 구분자가 없는 유사 접두어 경로는 오탐지하지 않는다', () => {
    expect(isNavItemActive('/products-archive', '/products')).toBe(false);
    expect(isNavItemActive('/companies-archive', '/companies')).toBe(false);
  });
});

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('pathname이 null이어도 크래시 없이 안전하게 렌더링된다', () => {
    mockUsePathname.mockReturnValue(null);

    expect(() => render(<Navbar />)).not.toThrow();
    expect(screen.getByRole('navigation', { name: '관리자 사이드 메뉴' })).toBeDefined();
  });

  it('모든 관리자 메뉴 항목(6개)을 렌더링한다', () => {
    mockUsePathname.mockReturnValue('/');
    render(<Navbar />);

    expect(navItems).toHaveLength(6);
    expect(screen.getByText('대시보드')).toBeDefined();
    expect(screen.getByText('서비스')).toBeDefined();
    expect(screen.getByText('기업 관리')).toBeDefined();
    expect(screen.getByText('매거진')).toBeDefined();
    expect(screen.getByText('LLM 작업')).toBeDefined();
    expect(screen.getByText('LLM 설정')).toBeDefined();
  });

  it('루트 경로(/)일 때 대시보드 메뉴에 aria-current="page"가 설정된다', () => {
    mockUsePathname.mockReturnValue('/');
    render(<Navbar />);

    const dashboardLink = screen.getByText('대시보드').closest('a');
    expect(dashboardLink?.getAttribute('aria-current')).toBe('page');

    const productsLink = screen.getByText('서비스').closest('a');
    expect(productsLink?.getAttribute('aria-current')).toBeNull();
  });

  it('하위 경로(/products/new)일 때 서비스 메뉴에 aria-current="page"가 설정된다', () => {
    mockUsePathname.mockReturnValue('/products/new');
    render(<Navbar />);

    const dashboardLink = screen.getByText('대시보드').closest('a');
    expect(dashboardLink?.getAttribute('aria-current')).toBeNull();

    const productsLink = screen.getByText('서비스').closest('a');
    expect(productsLink?.getAttribute('aria-current')).toBe('page');
  });
});
