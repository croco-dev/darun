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
class RouteBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p role="alert">route error</p> : this.props.children;
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const category = (slug: string) => ({ id: slug, slug, labelKo: '디자인', labelEn: 'Design' });
const product = (id: number, slug = 'design') => ({
  id: `${slug}-${id}`,
  name: `${slug} tool ${id}`,
  slug: `${slug}-${id}`,
  logoUrl: '',
  summary: 'summary',
  voteCount: id,
  tags: [],
});
const page = (after?: string, slug = 'design') => ({
  totalCount: 25,
  edges: Array.from({ length: after ? 1 : 24 }, (_, index) => ({ node: product(after ? 25 : index + 1, slug) })),
  pageInfo: { hasNextPage: !after, endCursor: after ? 'end' : `${slug}-next` },
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe('CategoryProductSection 단건 분류와 이어읽기', () => {
  it('최초 조회 실패는 빈 목록으로 숨기지 않고 route 오류 경계에 전달한다', async () => {
    state.locale = 'ko';
    const failure = deferred<ReturnType<typeof page>>();
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new SchemaLink({
        schema,
        rootValue: { categoryBySlug: () => category('design'), productsByCategory: () => failure.promise },
      }),
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () =>
      root?.render(
        <ApolloProvider client={client}>
          <RouteBoundary>
            <Suspense fallback={<p role="progressbar">route loading</p>}>
              <CategoryProductSection slug="design" />
            </Suspense>
          </RouteBoundary>
        </ApolloProvider>
      )
    );
    expect(host.querySelector('[role="progressbar"]')).not.toBeNull();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await act(async () => failure.reject(new Error('initial read failed')));
      expect(host.querySelector('[role="alert"]')?.textContent).toBe('route error');
      expect(host.querySelector('[role="group"]')).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each(['success', 'failure'])(
    '분류 전환 후 이전 추가 조회의 늦은 %s가 현재 목록과 대기 상태를 바꾸지 않는다',
    async outcome => {
      state.locale = 'ko';
      const oldPage = deferred<ReturnType<typeof page>>();
      const newPage = deferred<ReturnType<typeof page>>();
      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: new SchemaLink({
          schema,
          rootValue: {
            categoryBySlug: ({ slug }: { slug: string }) => category(slug),
            productsByCategory: ({ slug, after }: { slug: string; after?: string }) =>
              after ? (slug === 'design' ? oldPage.promise : newPage.promise) : page(undefined, slug),
          },
        }),
      });
      const host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      const render = (slug: string) =>
        root?.render(
          <ApolloProvider client={client}>
            <RouteBoundary>
              <Suspense fallback="route loading">
                <CategoryProductSection slug={slug} />
              </Suspense>
            </RouteBoundary>
          </ApolloProvider>
        );
      await act(async () => render('design'));
      await act(async () => host.querySelector<HTMLButtonElement>('button')?.click());
      await act(async () => render('development'));
      expect(host.querySelectorAll('[role="group"] a')).toHaveLength(24);
      expect(host.textContent).not.toContain('design tool');
      expect(host.querySelector('button')?.getAttribute('aria-disabled')).toBe('false');
      await act(async () => host.querySelector<HTMLButtonElement>('button')?.click());
      await act(async () => {
        if (outcome === 'success') oldPage.resolve(page('design-next'));
        else oldPage.reject(new Error('old category failure'));
      });
      expect(host.querySelector('button')?.getAttribute('aria-disabled')).toBe('true');
      expect(host.querySelector('[role="alert"]')).toBeNull();
      expect(host.textContent).not.toContain('design tool');
      await act(async () => newPage.resolve(page('development-next', 'development')));
      expect(host.querySelectorAll('[role="group"] a')).toHaveLength(25);
      expect(host.textContent).toContain('development tool 25');
      expect(host.querySelector('button')).toBeNull();
      await act(async () => render('design'));
      expect(host.querySelectorAll('[role="group"] a')).toHaveLength(24);
      expect(host.querySelector('button')?.getAttribute('aria-disabled')).toBe('false');
    }
  );

  it.each(['ko', 'en'])(
    '%s 추가 페이지 대기·반복 실패에도 24개 카드를 유지하고 같은 커서로 재시도한다',
    async locale => {
      state.locale = locale;
      let next = deferred<ReturnType<typeof page>>();
      const productReads = vi.fn(({ after, slug }: { after?: string; slug: string }) =>
        after ? next.promise : page(undefined, slug)
      );
      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: new SchemaLink({
          schema,
          rootValue: {
            categoryBySlug: ({ slug }: { slug: string }) => category(slug),
            productsByCategory: productReads,
          },
        }),
      });
      const host = document.createElement('div');
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root?.render(
          <ApolloProvider client={client}>
            <RouteBoundary>
              <Suspense fallback={<p role="progressbar">route loading</p>}>
                <CategoryProductSection slug="design" />
              </Suspense>
            </RouteBoundary>
          </ApolloProvider>
        );
      });
      for (let attempt = 0; attempt < 2; attempt++) {
        const more = host.querySelector<HTMLButtonElement>('button')!;
        more.focus();
        await act(async () => {
          more.click();
          more.click();
        });
        expect(host.querySelectorAll('[role="group"] a')).toHaveLength(24);
        expect(host.querySelector('[role="group"]')?.closest('[style*="display: none"]')).toBeNull();
        expect(host.querySelector('[role="progressbar"]')).toBeNull();
        expect(more.getAttribute('aria-disabled')).toBe('true');
        await act(async () => next.reject(new Error('temporary page failure')));
        expect(host.querySelectorAll('[role="group"] a')).toHaveLength(24);
        expect(host.querySelector('h1')?.textContent).toBe(locale === 'ko' ? '디자인' : 'Design');
        expect(host.textContent).toContain(locale === 'ko' ? '25개 도구' : '25 tools');
        expect(host.querySelector('[role="alert"]')?.textContent).toContain(
          locale === 'ko' ? '다시 시도' : 'Please try again'
        );
        expect(host.querySelector('button')).toBe(more);
        expect(document.activeElement).toBe(more);
        expect(more.getAttribute('aria-disabled')).toBe('false');
        next = deferred<ReturnType<typeof page>>();
      }
      await act(async () => host.querySelector<HTMLButtonElement>('button')?.click());
      await act(async () =>
        next.resolve({
          ...page('design-next'),
          edges: [{ node: product(24) }, { node: product(25) }],
        })
      );
      expect(host.querySelectorAll('[role="group"] a')).toHaveLength(25);
      expect(
        new Set(Array.from(host.querySelectorAll('[role="group"] a'), link => link.getAttribute('href'))).size
      ).toBe(25);
      expect(host.querySelector('[role="alert"]')).toBeNull();
      expect(host.querySelector('button')).toBeNull();
      expect(productReads.mock.calls.map(([args]) => args.after)).toEqual([
        undefined,
        'design-next',
        'design-next',
        'design-next',
      ]);
    }
  );

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
