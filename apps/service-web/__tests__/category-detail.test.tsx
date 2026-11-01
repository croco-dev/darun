import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { NextRequest } from 'next/server';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { getClient, requestHeaders } = vi.hoisted(() => ({ getClient: vi.fn(), requestHeaders: vi.fn() }));
vi.mock('../app/getServerClient', () => ({ getClient }));
vi.mock('next/headers', () => ({ headers: requestHeaders }));
vi.mock('next/font/local', () => ({ default: () => ({ className: 'fixture-font' }) }));
vi.mock('next-intl/server', () => ({ getMessages: async () => ({}), setRequestLocale: vi.fn() }));
vi.mock('next-client-cookies/server', () => ({
  CookiesProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../app/client', () => ({ ClientRootProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('../app/server', () => ({ ServerRootProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('@darun/ui-layout', () => ({ Layout: ({ children }: { children: ReactNode }) => children }));
vi.mock('@darun/products-shell', () => ({
  CategoryProductSection: ({ slug }: { slug: string }) => <section data-category={slug} />,
}));
vi.mock('@darun/utils-router', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
}));

import CategoryPage, { generateMetadata } from '../app/[locale]/categories/[slug]/page';
import RootLayout from '../app/[locale]/layout';
import { GET, HEAD } from '../app/api/markdown/[...path]/route';
import { getSitemapPartition } from '../app/sitemap-data';

const { buildSchema } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const schema = buildSchema(readFileSync(new URL('../../graphql-api/schema.graphql', import.meta.url), 'utf8'));
const categories = Array.from({ length: 102 }, (_, index) => ({
  id: `category-${index + 1}`,
  slug: `category-${index + 1}`,
  labelKo: `분류 ${index + 1}`,
  labelEn: `Category ${index + 1}`,
}));
const reads: string[] = [];
let unavailable = false;

function lookup(slug: string) {
  reads.push(`category:${slug}`);
  if (unavailable) throw new Error('fixture category read unavailable');
  return categories.find(category => category.slug === slug) ?? null;
}

function request(locale: string, slug: string) {
  const path = [locale, 'categories', slug];
  return [
    new NextRequest(`http://localhost/api/markdown/${path.join('/')}`, {
      headers: { 'x-darun-sibling-md': '1' },
    }),
    { params: Promise.resolve({ path }) },
  ] as const;
}

describe('공개 카테고리 상세의 실행 스키마 계약', () => {
  beforeEach(() => {
    reads.length = 0;
    unavailable = false;
    requestHeaders.mockResolvedValue(new Headers());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getClient.mockImplementation(
      () =>
        new ApolloClient({
          cache: new InMemoryCache(),
          link: new SchemaLink({
            schema,
            validate: true,
            rootValue: {
              categoryBySlug: ({ slug }: { slug: string }) => lookup(slug),
              categories: ({ first }: { first: number }) => {
                reads.push('categories');
                if (unavailable) throw new Error('fixture category list unavailable');
                return categories.slice(0, first);
              },
              productsByCategory: ({ slug, after }: { slug: string; after?: string }) => {
                reads.push(`products:${slug}:${after ?? 'start'}`);
                const ids = slug === 'category-102' ? [] : after ? ['third'] : ['first', 'second'];
                return {
                  edges: ids.map(id => ({
                    cursor: id,
                    node: { id, name: id, slug: id, summary: `${id} summary` },
                  })),
                  pageInfo: {
                    hasNextPage: ids.length === 2,
                    hasPreviousPage: !!after,
                    startCursor: ids[0] ?? null,
                    endCursor: ids.at(-1) ?? null,
                  },
                };
              },
              publishedMagazines: () => [],
            },
          }),
        })
    );
  });
  afterEach(() => vi.restoreAllMocks());

  describe.each(['ko', 'en'])('%s 카테고리', locale => {
    it.each([100, 101, 102])('%i번째 상세·metadata와 사이트맵이 같은 주소를 제공한다', async ordinal => {
      const slug = `category-${ordinal}`;
      const props = { params: Promise.resolve({ locale, slug }) };
      const label = locale === 'ko' ? `분류 ${ordinal}` : `Category ${ordinal}`;
      const canonical = `https://www.darun.io/${locale}/categories/${slug}`;
      const markup = renderToStaticMarkup(await CategoryPage(props));
      expect(markup).toContain(`data-category="${slug}"`);
      expect(markup).toContain(label);
      const metadata = await generateMetadata(props);
      expect(metadata.title).toContain(label);
      expect(metadata.alternates?.canonical).toBe(canonical);
      expect(metadata.alternates?.languages).toMatchObject({
        ko: `https://www.darun.io/ko/categories/${slug}`,
        en: `https://www.darun.io/en/categories/${slug}`,
      });
      expect(metadata.alternates?.types?.['text/markdown']).toBe(`${canonical}.md`);
      expect(reads).toEqual([`category:${slug}`, `category:${slug}`]);
      const sitemap = await getSitemapPartition('static~0');
      expect(sitemap.some(entry => entry.url === canonical)).toBe(true);
    });

    it.each([100, 101, 102])('%i번째 Markdown GET/HEAD와 상품 cursor를 보존한다', async ordinal => {
      const slug = `category-${ordinal}`;
      const response = await GET(...request(locale, slug));
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain(locale === 'ko' ? `분류 ${ordinal}` : `Category ${ordinal}`);
      expect(body).toContain(`https://www.darun.io/${locale}/categories/${slug}`);
      expect(response.headers.get('Link')).toBe(`<https://www.darun.io/${locale}/categories/${slug}>; rel="canonical"`);
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
      expect(reads).toEqual([
        `category:${slug}`,
        `products:${slug}:start`,
        ...(ordinal === 102 ? [] : [`products:${slug}:second`]),
      ]);
      if (ordinal !== 102) {
        for (const id of ['first', 'second', 'third']) {
          expect(body).toContain(`[${id}](https://www.darun.io/${locale}/products/${id})`);
        }
      } else {
        expect(body).toContain(locale === 'ko' ? '등록된 서비스가 없습니다.' : 'No services in this category.');
      }
      const head = await HEAD(...request(locale, slug));
      expect(head.status).toBe(200);
      expect([...head.headers]).toEqual([...response.headers]);
      expect(await head.text()).toBe('');
    });

    it('실제 미존재를 HTML 404와 Markdown GET/HEAD 404로 전달한다', async () => {
      const props = { params: Promise.resolve({ locale, slug: 'missing' }) };
      await expect(CategoryPage(props)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
      await expect(generateMetadata(props)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
      expect((await GET(...request(locale, 'missing'))).status).toBe(404);
      const head = await HEAD(...request(locale, 'missing'));
      expect(head.status).toBe(404);
      expect(await head.text()).toBe('');
    });

    it('조회 장애를 미존재나 정상 빈 목록으로 숨기지 않는다', async () => {
      unavailable = true;
      const props = { params: Promise.resolve({ locale, slug: 'category-101' }) };
      await expect(CategoryPage(props)).rejects.toThrow('unavailable');
      await expect(generateMetadata(props)).rejects.toThrow('unavailable');
      expect((await GET(...request(locale, 'category-101'))).status).toBe(500);
      const head = await HEAD(...request(locale, 'category-101'));
      expect(head.status).toBe(500);
      expect(await head.text()).toBe('');
    });
  });

  it('HTML loading 경계 위에서 같은 단건 조회로 미존재와 장애를 구분한다', async () => {
    const props = { params: Promise.resolve({ locale: 'ko' }), children: <p>content</p> };
    await RootLayout(props);
    expect(reads).toEqual([]);
    requestHeaders.mockResolvedValue(new Headers({ 'x-darun-category-slug': 'category-101' }));
    await RootLayout(props);
    expect(reads).toEqual(['category:category-101']);
    requestHeaders.mockResolvedValue(new Headers({ 'x-darun-category-slug': 'missing' }));
    await expect(RootLayout(props)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    unavailable = true;
    requestHeaders.mockResolvedValue(new Headers({ 'x-darun-category-slug': 'category-101' }));
    await expect(RootLayout(props)).rejects.toThrow('unavailable');
    requestHeaders.mockResolvedValue(new Headers({ 'x-darun-category-slug': '%' }));
    await expect(RootLayout(props)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
