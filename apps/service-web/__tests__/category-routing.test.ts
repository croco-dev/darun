import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import middleware from '../middleware';

vi.mock('next-intl/middleware', async () => {
  const { NextResponse } = await import('next/server');
  return {
    default: () => (request: NextRequest) => NextResponse.next({ request: { headers: request.headers } }),
  };
});

describe('카테고리 HTML의 내부 route hint', () => {
  it.each(['ko', 'en'])('%s 상세 요청의 slug로 외부 header를 덮어쓴다', locale => {
    const response = middleware(
      new NextRequest(`http://localhost/${locale}/categories/category-101`, {
        headers: { 'x-darun-category-slug': 'missing' },
      })
    );
    expect(response.headers.get('x-middleware-request-x-darun-category-slug')).toBe('category-101');
    expect(response.headers.get('x-middleware-override-headers')?.split(',')).toContain('x-darun-category-slug');
  });

  it.each(['/en', '/ko/products/category-101', '/en/categories', '/ko/categories/a/b'])(
    '%s에서는 위조한 분류 hint를 전달하지 않는다',
    path => {
      const response = middleware(
        new NextRequest(`http://localhost${path}`, { headers: { 'x-darun-category-slug': 'missing' } })
      );
      expect(response.headers.get('x-middleware-request-x-darun-category-slug')).toBeNull();
    }
  );

  it('HEAD의 인코딩된 slug도 경로에서 가져온다', () => {
    const response = middleware(
      new NextRequest('http://localhost/ko/categories/%ED%95%9C%EA%B8%80', { method: 'HEAD' })
    );
    expect(response.headers.get('x-middleware-request-x-darun-category-slug')).toBe('%ED%95%9C%EA%B8%80');
  });

  it.each([
    ['/ko/categories/category-101.md', 'text/html'],
    ['/en/categories/category-101', 'text/markdown'],
  ])('%s의 Markdown 처리는 HTML layout 검사를 거치지 않는다', (path, accept) => {
    const response = middleware(new NextRequest(`http://localhost${path}`, { headers: { accept } }));
    expect(response.headers.get('x-middleware-rewrite')).toContain('/api/markdown/');
    expect(response.headers.get('x-middleware-request-x-darun-category-slug')).toBeNull();
  });
});
