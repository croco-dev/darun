import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { ApolloProvider } from '@apollo/client/react';
import React, { act, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { CategoryProductSection } from '../shells/CategoryProductSection/CategoryProductSection';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { state } = vi.hoisted(() => ({ state: { locale: 'ko' } }));
vi.mock('next-intl', () => ({
  useLocale: () => state.locale,
  useTranslations: () => (key: string) => key,
}));
vi.mock('@darun/utils-router', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('../components', () => ({
  ProductCard: ({ product, href }: { product: { name: string }; href: string }) => <a href={href}>{product.name}</a>,
}));

const { buildSchema } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
const schema = buildSchema(readFileSync(resolve(process.cwd(), '../../../apps/graphql-api/schema.graphql'), 'utf8'));
let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe('CategoryProductSection 단건 분류와 이어읽기', () => {
  it.each(['ko', 'en'])('목록에 없는 %s 분류 이름을 표시하고 상품 다음 페이지를 합친다', async locale => {
    state.locale = locale;
    const categoryReads = vi.fn(() => ({
      id: 'category-101',
      slug: 'category-101',
      labelKo: '백한 번째 분류',
      labelEn: 'Category 101',
    }));
    const listReads = vi.fn(() => {
      throw new Error('The category list is unavailable');
    });
    const productReads = vi.fn(({ after }: { after?: string }) => ({
      totalCount: 2,
      edges: [
        {
          node: {
            id: after ? 'older' : 'newer',
            name: after ? 'Older tool' : 'Newer tool',
            slug: after ? 'older' : 'newer',
            logoUrl: '',
            summary: 'summary',
            voteCount: 0,
            tags: [],
          },
        },
      ],
      pageInfo: { hasNextPage: !after, endCursor: after ? 'end' : 'next' },
    }));
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new SchemaLink({
        schema,
        validate: true,
        rootValue: { categoryBySlug: categoryReads, categories: listReads, productsByCategory: productReads },
      }),
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(
        <ApolloProvider client={client}>
          <Suspense fallback="loading">
            <CategoryProductSection slug="category-101" />
          </Suspense>
        </ApolloProvider>
      );
    });
    const label = locale === 'ko' ? '백한 번째 분류' : 'Category 101';
    expect(host.querySelector('h1')?.textContent).toBe(label);
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe(label);
    expect(host.textContent).toContain('Newer tool');
    const more = host.querySelector<HTMLButtonElement>('button');
    expect(more?.textContent).toBe(locale === 'ko' ? '더 보기' : 'Load more');
    await act(async () => more?.click());
    expect(host.textContent).toContain('Newer tool');
    expect(host.textContent).toContain('Older tool');
    expect(host.querySelector('a[href$="/products/older?from=category"]')).not.toBeNull();
    expect(host.querySelector('button')).toBeNull();
    expect(productReads.mock.calls.map(([args]) => args)).toEqual([
      expect.objectContaining({ slug: 'category-101', locale, first: 24 }),
      expect.objectContaining({ slug: 'category-101', locale, first: 24, after: 'next' }),
    ]);
    expect(categoryReads).toHaveBeenCalledTimes(2);
    expect(listReads).not.toHaveBeenCalled();
  });
});
