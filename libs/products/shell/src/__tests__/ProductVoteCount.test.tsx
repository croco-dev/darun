import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { NextIntlClientProvider } from 'next-intl';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductCard } from '../components/ProductCard/ProductCard';
import { ProductVoteCount } from '../components/ProductVoteCount';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock('@darun/utils-router', () => ({
  Link: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
let root: Root | undefined;
let client: ApolloClient;
afterEach(async () => {
  await act(async () => root?.unmount());
  client?.stop();
  document.body.replaceChildren();
});

function fixture(locale = 'ko') {
  const requests: Array<{
    slug: string;
    finish: (count: number | null) => void;
    fail: () => void;
    finishMissing: () => void;
  }> = [];
  const cache = new InMemoryCache();
  client = new ApolloClient({
    cache,
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const definition = operation.query.definitions[0];
          expect(definition.kind).toBe('OperationDefinition');
          if (definition.kind === 'OperationDefinition') expect(definition.operation).toBe('query');
          const slug = operation.variables.slug;
          requests.push({
            slug,
            finish: count => {
              observer.next({
                data: {
                  productBySlug: {
                    __typename: 'Product',
                    id: slug,
                    voteCount: count,
                  },
                },
              });
              observer.complete();
            },
            fail: () => observer.error(new Error('network unavailable')),
            finishMissing: () => {
              observer.next({ data: { productBySlug: null } });
              observer.complete();
            },
          });
        })
    ),
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const render = async (count: number | null, slug = 'notion', card = false, mirror = false) => {
    await act(async () =>
      root!.render(
        <NextIntlClientProvider locale={locale} messages={{}}>
          <ApolloProvider client={client}>
            {card ? (
              <ProductCard
                product={{
                  id: slug,
                  slug,
                  name: slug,
                  voteCount: count,
                  tags: [],
                }}
                href={`/products/${slug}`}
                source="compare"
              />
            ) : (
              <ProductVoteCount slug={slug} count={count} />
            )}
            {mirror && <ProductVoteCount slug={slug} count={count} />}
          </ApolloProvider>
        </NextIntlClientProvider>
      )
    );
  };
  const retry = async () => {
    await act(async () => {
      container.querySelector('button')!.click();
      container.querySelector('button')!.click();
    });
  };
  return { requests, container, render, retry, cache };
}

it.each(['ko', 'en'])('%s: 마지막 42표를 보존하고 실패한 조회만 재시도해 43표로 복구한다', async locale => {
  const { container, requests, render, retry, cache } = fixture(locale);
  await render(42);
  expect(container.textContent).toContain('42');
  await render(null);
  expect(container.textContent).toContain('42');
  expect(container.textContent).toContain(locale === 'ko' ? '불러오지 못했습니다' : 'unavailable');
  await retry();
  expect(requests).toHaveLength(1);
  expect(container.querySelector('button')!.getAttribute('aria-busy')).toBe('true');
  await act(async () => requests[0].finish(null));
  expect(container.textContent).toContain('42');
  await retry();
  await act(async () => requests[1].fail());
  expect(container.textContent).toContain('42');
  await retry();
  await act(async () => requests[2].finish(43));
  expect(container.textContent).toContain('43');
  expect(container.querySelector('button')).toBeNull();
  expect(cache.extract()['Product:notion']).toMatchObject({
    voteCount: 43,
  });
  await render(0);
  expect(container.querySelector('[aria-label]')!.getAttribute('aria-label')).toBe(
    locale === 'ko' ? '추천 0' : '0 upvotes'
  );
  expect(container.querySelector('button')).toBeNull();
});

it('처음 실패한 카드도 미조회 상태와 링크 밖 재조회 버튼을 표시한다', async () => {
  const { container, requests, render, retry } = fixture();
  await render(null, 'notion', true);
  expect(container.querySelector('[aria-label="추천 수 알 수 없음"]')).not.toBeNull();
  expect(container.querySelector('a button')).toBeNull();
  expect(container.querySelector('a')!.getAttribute('href')).toBe('/products/notion');
  await retry();
  await act(async () => requests[0].finish(0));
  expect(container.querySelector('[aria-label="추천 0"]')).not.toBeNull();
  expect(container.querySelector('button')).toBeNull();
});

it('다른 상품으로 이동하고 되돌아와도 이전 요청은 현재 수치와 진행 상태를 바꾸지 않는다', async () => {
  const { container, requests, render, retry } = fixture();
  await render(null);
  await retry();
  await render(7, 'figma');
  expect(container.textContent).toContain('7');
  await render(null);
  await retry();
  expect(requests).toHaveLength(1); // Apollo deduplicates identical in-flight read operations.
  await act(async () => requests[0].finish(43));
  expect(container.textContent).toContain('43');
  expect(container.querySelector('button')).toBeNull();
});

it('비교표와 카드의 같은 상품 추천 수를 캐시 갱신으로 함께 복구한다', async () => {
  const { container, requests, render, retry } = fixture();
  await render(null, 'notion', false, true);
  expect(container.querySelectorAll('button')).toHaveLength(2);
  await retry();
  await act(async () => requests[0].finish(43));
  expect(container.querySelectorAll('[aria-label="추천 43"]')).toHaveLength(2);
  expect(container.querySelectorAll('button')).toHaveLength(0);
});

it('공유한 상품 조회가 null이어도 두 영역의 마지막 수치와 재조회 안내를 유지한다', async () => {
  const { container, requests, render, retry } = fixture();
  await render(42, 'notion', false, true);
  await render(null, 'notion', false, true);
  await retry();
  await act(async () => requests[0].finish(null));
  await retry();
  await act(async () => requests[1].finishMissing());
  expect(container.querySelectorAll('[aria-label="추천 42"]')).toHaveLength(2);
  expect(container.querySelectorAll('button')).toHaveLength(2);
  await retry();
  await act(async () => requests[2].finish(43));
  expect(container.querySelectorAll('[aria-label="추천 43"]')).toHaveLength(2);
  expect(container.querySelectorAll('button')).toHaveLength(0);
});
