// @vitest-environment jsdom
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { GetProductDescriptionJobsOnAdminDocument, GetTranslationJobsOnAdminDocument } from '@darun/provider-graphql';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLlmJobPages } from '../features/llm-jobs/useLlmJobPages';

const clients: ApolloClient[] = [];
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.stop();
});

type Filter = { kind: 'all' | 'description'; scope: string };
function setup(descriptionCount: number, translationCount = 0) {
  const descriptions = Array.from({ length: descriptionCount }, (_, index) => ({
    __typename: 'ProductDescriptionJob',
    id: `description-${String(descriptionCount - index - 1).padStart(3, '0')}`,
    productId: `product-${index}`,
    productSlug: `product-${index}`,
    status: 'completed',
    writerModel: 'writer',
    reviewerModel: 'reviewer',
    message: '완료',
    error: null,
    createdAt: '2026-10-17T01:00:00Z',
    updatedAt: '2026-10-17T01:01:00Z',
  }));
  const translations = Array.from({ length: translationCount }, (_, index) => ({
    __typename: 'TranslationJob',
    id: `translation-${index}`,
    entityType: 'Product',
    entityId: `entity-${index}`,
    locale: 'en',
    status: 'completed',
    model: 'translator',
    message: '완료',
    error: null,
    createdAt: '2026-10-17T01:00:00Z',
    updatedAt: '2026-10-17T01:01:00Z',
  }));
  const requests: { name: string | undefined; limit: unknown; offset: unknown }[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    devtools: { enabled: false },
    link: new ApolloLink(
      operation =>
        new Observable(observer => {
          const { limit, offset } = operation.variables;
          requests.push({ name: operation.operationName, limit, offset });
          const description = operation.operationName === 'GetProductDescriptionJobsOnAdmin';
          const rows = description ? descriptions : translations;
          queueMicrotask(() => {
            observer.next({
              data: {
                [description ? 'productDescriptionJobs' : 'translationJobs']: rows.slice(offset, offset + limit),
              },
            });
            observer.complete();
          });
        })
    ),
  });
  clients.push(client);
  const hook = renderHook(
    ({ kind, scope }: Filter) => ({
      description: useLlmJobPages(GetProductDescriptionJobsOnAdminDocument, 'productDescriptionJobs', {
        scope,
        skip: false,
      }),
      translation: useLlmJobPages(GetTranslationJobsOnAdminDocument, 'translationJobs', {
        scope,
        skip: kind === 'description',
      }),
    }),
    {
      initialProps: { kind: 'all', scope: 'all' } as Filter,
      wrapper: ({ children }) => <ApolloProvider client={client}>{children}</ApolloProvider>,
    }
  );
  return { ...hook, requests };
}

describe('실제 Apollo 기본 cache를 통한 작업 페이지 누적', () => {
  it('소개 251건의 101번째와 201번째 이후를 읽고 마지막에서 요청을 멈춘다', async () => {
    const { result, requests } = setup(251);
    await waitFor(() => expect(result.current.description.rows).toHaveLength(100));
    await act(async () => {
      await result.current.description.loadMore();
    });
    await waitFor(() => expect(result.current.description.rows).toHaveLength(200));
    expect(result.current.description.rows[100]?.id).toBe('description-150');
    await act(async () => {
      await result.current.description.loadMore();
    });
    await waitFor(() => expect(result.current.description.rows).toHaveLength(251));
    expect(result.current.description.rows[200]?.id).toBe('description-050');
    expect(result.current.description.rows[250]?.id).toBe('description-000');
    expect(new Set(result.current.description.rows.map(row => row.id)).size).toBe(251);
    expect(result.current.description.hasMore).toBe(false);
    await act(async () => {
      await result.current.description.loadMore();
    });
    expect(requests.filter(request => request.name === 'GetProductDescriptionJobsOnAdmin')).toEqual([
      { name: 'GetProductDescriptionJobsOnAdmin', limit: 100, offset: 0 },
      { name: 'GetProductDescriptionJobsOnAdmin', limit: 100, offset: 100 },
      { name: 'GetProductDescriptionJobsOnAdmin', limit: 100, offset: 200 },
    ]);
  });

  it('전체 필터의 종류별 위치와 종료를 유지하고 필터 왕복은 첫 페이지부터 시작한다', async () => {
    const { result, rerender, requests } = setup(201, 1);
    await waitFor(() => expect(result.current.description.rows).toHaveLength(100));
    await waitFor(() => expect(result.current.translation.rows).toHaveLength(1));
    for (const expected of [200, 201]) {
      await act(async () => {
        await Promise.all([result.current.description.loadMore(), result.current.translation.loadMore()]);
      });
      await waitFor(() => expect(result.current.description.rows).toHaveLength(expected));
      expect(result.current.translation.rows).toHaveLength(1);
    }
    expect(result.current.description.hasMore).toBe(false);
    expect(result.current.translation.hasMore).toBe(false);
    expect(new Set(result.current.description.rows.map(row => row.id)).size).toBe(201);
    expect(requests.filter(request => request.name === 'GetTranslationJobsOnAdmin')).toHaveLength(1);
    rerender({ kind: 'description', scope: 'description' });
    expect(result.current.description.rows).toHaveLength(100);
    expect(result.current.translation.rows).toHaveLength(0);
    rerender({ kind: 'all', scope: 'all' });
    await waitFor(() => expect(result.current.translation.rows).toHaveLength(1));
    expect(result.current.description.rows).toHaveLength(100);
    expect(requests.every(request => request.limit === 100)).toBe(true);
  });
});
